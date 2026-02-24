// Seed initial lessons for each profession
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // We'll need the service role key for this
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

interface LessonTemplate {
  profession: string
  topic: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedMinutes: number
  orderIndex: number
}

const lessonTemplates: LessonTemplate[] = [
  // K-12 Educator lessons
  {
    profession: 'k12-educator',
    topic: 'What is AI and How Does It Learn?',
    difficulty: 'beginner',
    estimatedMinutes: 8,
    orderIndex: 1
  },
  {
    profession: 'k12-educator',
    topic: 'AI as a Teaching Assistant: Lesson Planning and Grading',
    difficulty: 'beginner',
    estimatedMinutes: 10,
    orderIndex: 2
  },
  {
    profession: 'k12-educator',
    topic: 'Personalized Learning with AI Tools',
    difficulty: 'intermediate',
    estimatedMinutes: 12,
    orderIndex: 3
  },
  
  // Recruiter lessons
  {
    profession: 'recruiter',
    topic: 'Understanding AI Basics Through Talent Matching',
    difficulty: 'beginner',
    estimatedMinutes: 8,
    orderIndex: 1
  },
  {
    profession: 'recruiter',
    topic: 'AI-Powered Resume Screening and Candidate Sourcing',
    difficulty: 'beginner',
    estimatedMinutes: 10,
    orderIndex: 2
  },
  {
    profession: 'recruiter',
    topic: 'Using AI to Write Better Job Descriptions',
    difficulty: 'intermediate',
    estimatedMinutes: 12,
    orderIndex: 3
  },
  
  // Retiree lessons
  {
    profession: 'retiree',
    topic: 'AI Basics: What Everyone Should Know',
    difficulty: 'beginner',
    estimatedMinutes: 8,
    orderIndex: 1
  },
  {
    profession: 'retiree',
    topic: 'Using AI to Stay Connected and Informed',
    difficulty: 'beginner',
    estimatedMinutes: 10,
    orderIndex: 2
  },
  {
    profession: 'retiree',
    topic: 'AI for Health, Finance, and Daily Life',
    difficulty: 'intermediate',
    estimatedMinutes: 12,
    orderIndex: 3
  },
]

async function generateLessonContent(profession: string, topic: string, difficulty: string) {
  const professionLabels: { [key: string]: string } = {
    'k12-educator': 'K-12 educator',
    'recruiter': 'recruiter',
    'retiree': 'retiree (someone retired and learning for personal enrichment)'
  }

  const prompt = `You are creating an AI literacy lesson for a ${professionLabels[profession]}.

Topic: ${topic}
Difficulty: ${difficulty}

Create a lesson that:
- Uses examples and analogies from the ${professionLabels[profession]} world
- Is ${difficulty === 'beginner' ? 'accessible with no prior AI knowledge' : difficulty === 'intermediate' ? 'builds on basic AI concepts' : 'explores advanced applications'}
- Is practical and immediately applicable to their life/work
- Avoids jargon unless explaining it in their terms
- Is warm, engaging, and conversational

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "title": "Engaging lesson title",
  "introduction": "2-3 sentences that hook them and connect to their world",
  "sections": [
    {
      "heading": "Section heading",
      "content": "Main content (2-3 clear paragraphs, newlines between paragraphs)",
      "example": "Concrete, specific example from their world"
    }
  ],
  "keyTakeaways": ["Actionable takeaway 1", "Actionable takeaway 2", "Actionable takeaway 3"],
  "practicePrompt": "A practical prompt they can copy-paste into ChatGPT/Claude to try this concept themselves"
}

Make it genuinely useful and engaging for a ${professionLabels[profession]}.`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  return JSON.parse(content.text)
}

async function seedLessons() {
  console.log('🌱 Starting lesson seeding...\n')

  for (const template of lessonTemplates) {
    try {
      // Get profession ID
      const { data: profession } = await supabase
        .from('professions')
        .select('id, name')
        .eq('slug', template.profession)
        .single()

      if (!profession) {
        console.log(`❌ Profession not found: ${template.profession}`)
        continue
      }

      console.log(`Generating: ${template.topic} (${profession.name})...`)

      // Generate lesson content
      const content = await generateLessonContent(
        template.profession,
        template.topic,
        template.difficulty
      )

      // Create slug
      const slug = template.topic
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      // Insert lesson
      const { error } = await supabase
        .from('lessons')
        .insert({
          profession_id: profession.id,
          title: content.title,
          slug,
          content,
          difficulty: template.difficulty,
          estimated_minutes: template.estimatedMinutes,
          order_index: template.orderIndex,
          is_published: true
        })

      if (error) {
        console.log(`❌ Error inserting lesson: ${error.message}`)
      } else {
        console.log(`✅ Created: ${content.title}\n`)
      }

      // Rate limit: wait 2 seconds between API calls
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}\n`)
    }
  }

  console.log('✅ Lesson seeding complete!')
}

seedLessons()
