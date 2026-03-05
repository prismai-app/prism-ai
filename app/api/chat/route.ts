import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DAILY_CHAT_LIMIT_FREE = 30
const DAILY_CHAT_LIMIT_PRO = 999 // effectively unlimited

const professionContexts: { [key: string]: string } = {
  'k12-educator': 'K-12 educator (teacher). Use classroom, lesson planning, student engagement, and education examples. Relate AI concepts to teaching.',
  'recruiter': 'recruiter / talent acquisition professional. Use hiring, candidate sourcing, job descriptions, and HR examples. Relate AI concepts to recruiting.',
  'retiree': 'retiree learning about technology for personal enrichment. Use everyday life, health, finance, and hobby examples. Be patient and clear, avoid jargon.',
  'healthcare': 'healthcare professional. Use patient care, clinical workflow, and medical examples. Relate AI concepts to healthcare delivery.',
  'dentist': 'dental professional. Use dental practice, patient management, and oral health examples. Relate AI concepts to dentistry.',
}

export async function POST(request: NextRequest) {
  try {
    // Get the auth token from the request
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('profession, experience_level, subscription_tier, daily_chat_count, last_chat_date')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check daily limit
    const today = new Date().toISOString().split('T')[0]
    const limit = profile.subscription_tier === 'pro' ? DAILY_CHAT_LIMIT_PRO : DAILY_CHAT_LIMIT_FREE
    const chatCount = profile.last_chat_date === today ? profile.daily_chat_count : 0

    if (chatCount >= limit) {
      return NextResponse.json({
        error: 'Daily chat limit reached. Upgrade to Pro for more messages!',
        limitReached: true
      }, { status: 429 })
    }

    // Parse the request body
    const { message, conversationHistory } = await request.json()

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 characters)' }, { status: 400 })
    }

    // Build the system prompt
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

    // Build messages array (include recent conversation history)
    const messages: { role: 'user' | 'assistant'; content: string }[] = []

    if (conversationHistory && Array.isArray(conversationHistory)) {
      // Include last 10 messages for context
      const recentHistory = conversationHistory.slice(-10)
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content })
        }
      }
    }

    messages.push({ role: 'user', content: message })

    // Call Claude Haiku (cheap and fast)
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const assistantMessage = response.content[0]
    if (assistantMessage.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // Save both messages to the database
    const { error: saveError } = await supabase
      .from('chat_messages')
      .insert([
        {
          user_id: user.id,
          role: 'user',
          content: message,
        },
        {
          user_id: user.id,
          role: 'assistant',
          content: assistantMessage.text,
        }
      ])

    if (saveError) {
      console.error('Error saving chat messages:', saveError)
      // Don't fail the request — the user still gets their response
    }

    // Update daily chat count
    await supabase
      .from('profiles')
      .update({
        daily_chat_count: chatCount + 1,
        last_chat_date: today,
      })
      .eq('id', user.id)

    return NextResponse.json({
      message: assistantMessage.text,
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
