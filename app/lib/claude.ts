// Claude API client for lesson generation
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface LessonContent {
  title: string
  introduction: string
  sections: {
    heading: string
    content: string
    example?: string
  }[]
  keyTakeaways: string[]
  practicePrompt?: string
}

export async function generateLesson(
  profession: string,
  topic: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced'
): Promise<LessonContent> {
  const prompt = `You are creating an AI literacy lesson for a ${profession}.

Topic: ${topic}
Difficulty: ${difficulty}

Create a lesson that:
- Uses examples and analogies from the ${profession} profession
- Is ${difficulty === 'beginner' ? 'accessible with no prior AI knowledge' : difficulty === 'intermediate' ? 'builds on basic AI concepts' : 'explores advanced applications'}
- Is practical and immediately applicable to their work
- Avoids jargon unless explaining it in their terms

Return ONLY valid JSON with this structure:
{
  "title": "Lesson title",
  "introduction": "2-3 sentence intro that connects to their world",
  "sections": [
    {
      "heading": "Section heading",
      "content": "Main content (2-3 paragraphs)",
      "example": "Concrete example from their profession"
    }
  ],
  "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
  "practicePrompt": "A prompt they can try with an AI tool to practice this concept"
}

Make it engaging, clear, and valuable for a ${profession}.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  // Parse the JSON response
  const lessonData = JSON.parse(content.text)
  return lessonData
}
