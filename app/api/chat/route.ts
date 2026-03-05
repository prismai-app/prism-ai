import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  })
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const DAILY_CHAT_LIMIT_FREE = 30
const DAILY_CHAT_LIMIT_PRO = 999

const professionContexts: { [key: string]: string } = {
  'k12-educator': 'K-12 educator (teacher). Use classroom, lesson planning, student engagement, and education examples. Relate AI concepts to teaching.',
  'recruiter': 'recruiter / talent acquisition professional. Use hiring, candidate sourcing, job descriptions, and HR examples. Relate AI concepts to recruiting.',
  'retiree': 'retiree learning about technology for personal enrichment. Use everyday life, health, finance, and hobby examples. Be patient and clear, avoid jargon.',
  'healthcare': 'healthcare professional. Use patient care, clinical workflow, and medical examples. Relate AI concepts to healthcare delivery.',
  'dentist': 'dental professional. Use dental practice, patient management, and oral health examples. Relate AI concepts to dentistry.',
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const anthropic = getAnthropicClient()

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('profession, experience_level, subscription_tier, daily_chat_count, daily_chat_reset_at')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check daily limit — reset if new day
    const now = new Date()
    const lastReset = profile.daily_chat_reset_at ? new Date(profile.daily_chat_reset_at) : new Date(0)
    const isNewDay = now.toISOString().split('T')[0] !== lastReset.toISOString().split('T')[0]
    const limit = profile.subscription_tier === 'pro' ? DAILY_CHAT_LIMIT_PRO : DAILY_CHAT_LIMIT_FREE
    const chatCount = isNewDay ? 0 : (profile.daily_chat_count || 0)

    if (chatCount >= limit) {
      return NextResponse.json({
        error: 'Daily chat limit reached. Upgrade to Pro for more messages!',
        limitReached: true
      }, { status: 429 })
    }

    const { message, conversationId } = await request.json()

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 characters)' }, { status: 400 })
    }

    // Get or create conversation
    let activeConversationId = conversationId

    if (!activeConversationId) {
      const { data: newConvo, error: convoError } = await supabase
        .from('chatbot_conversations')
        .insert({
          user_id: user.id,
          title: message.substring(0, 100),
          message_count: 0,
        })
        .select('id')
        .single()

      if (convoError || !newConvo) {
        console.error('Error creating conversation:', convoError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }

      activeConversationId = newConvo.id
    }

    // Load recent messages from this conversation for context
    const { data: recentMessages } = await supabase
      .from('chatbot_messages')
      .select('role, content')
      .eq('conversation_id', activeConversationId)
      .order('created_at', { ascending: true })
      .limit(20)

    // Build system prompt
    const professionContext = professionContexts[profile.profession] || 'professional'
    const experienceDesc = profile.experience_level === 'beginner'
      ? 'They are new to AI — explain things simply, no jargon.'
      : profile.experience_level === 'intermediate'
      ? 'They have some AI familiarity — you can use basic AI terms but explain advanced ones.'
      : 'They use AI regularly — you can be more technical.'

    const systemPrompt = `You are Prism, a friendly and knowledgeable AI tutor. You help people understand AI through the lens of their own profession.

The user is a ${professionContext}
${experienceDesc}

Guidelines:
- Always relate AI concepts back to their profession with concrete examples
- Be warm, encouraging, and conversational — not lecturing
- Keep responses concise (2-4 paragraphs max unless they ask for detail)
- If they ask something outside AI/tech, gently redirect but be helpful
- Never make up facts — if unsure, say so
- Suggest practical next steps they can try
- Use analogies from their field to explain complex concepts`

    // Build messages array
    const chatMessages: { role: 'user' | 'assistant'; content: string }[] = []
    if (recentMessages) {
      for (const msg of recentMessages) {
        chatMessages.push({ role: msg.role as 'user' | 'assistant', content: msg.content })
      }
    }
    chatMessages.push({ role: 'user', content: message })

    // Call Claude Haiku
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 1024,
      system: systemPrompt,
      messages: chatMessages,
    })

    const assistantContent = response.content[0]
    if (assistantContent.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // Save both messages
    const { error: saveError } = await supabase
      .from('chatbot_messages')
      .insert([
        {
          conversation_id: activeConversationId,
          user_id: user.id,
          role: 'user',
          content: message,
        },
        {
          conversation_id: activeConversationId,
          user_id: user.id,
          role: 'assistant',
          content: assistantContent.text,
        }
      ])

    if (saveError) {
      console.error('Error saving messages:', saveError)
    }

    // Update conversation message count
    await supabase
      .from('chatbot_conversations')
      .update({
        message_count: (recentMessages?.length || 0) + 2,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeConversationId)

    // Update daily chat count
    await supabase
      .from('profiles')
      .update({
        daily_chat_count: chatCount + 1,
        daily_chat_reset_at: isNewDay ? now.toISOString() : profile.daily_chat_reset_at,
      })
      .eq('id', user.id)

    return NextResponse.json({
      message: assistantContent.text,
      conversationId: activeConversationId,
      chatCount: chatCount + 1,
      chatLimit: limit,
    })

  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
