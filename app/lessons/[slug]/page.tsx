'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'

interface LessonContent {
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

interface Lesson {
  id: string
  title: string
  content: LessonContent
  difficulty: string
  estimated_minutes: number
}

export default function LessonPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string
  
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')

  useEffect(() => {
    if (slug) {
      loadLesson()
    }
  }, [slug])

  async function loadLesson() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUserId(user.id)

    const { data: lessonData, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single()

    if (error || !lessonData) {
      router.push('/lessons')
      return
    }

    setLesson(lessonData)

    // Mark as started if not already
    const { data: progressData } = await supabase
      .from('lesson_progress')
      .select('status')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonData.id)
      .single()

    if (!progressData) {
      // Create progress entry
      await supabase
        .from('lesson_progress')
        .insert({
          user_id: user.id,
          lesson_id: lessonData.id,
          status: 'in_progress',
          progress_percentage: 0,
          started_at: new Date().toISOString()
        })
    }

    setLoading(false)
  }

  async function markComplete() {
    if (!lesson || !userId) return

    await supabase
      .from('lesson_progress')
      .upsert({
        user_id: userId,
        lesson_id: lesson.id,
        status: 'completed',
        progress_percentage: 100,
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,lesson_id'
      })

    router.push('/lessons')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading lesson...</div>
      </div>
    )
  }

  if (!lesson) {
    return null
  }

  const difficultyColors: { [key: string]: string } = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-yellow-100 text-yellow-700',
    advanced: 'bg-red-100 text-red-700'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/lessons" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Lessons
          </Link>
          <button
            onClick={markComplete}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-semibold hover:opacity-90"
          >
            Mark Complete
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Lesson header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${difficultyColors[lesson.difficulty]}`}>
              {lesson.difficulty}
            </span>
            <span className="text-gray-500 text-sm">
              {lesson.estimated_minutes} min read
            </span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {lesson.content.title}
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            {lesson.content.introduction}
          </p>
        </div>

        {/* Lesson content */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          <div className="prose prose-lg max-w-none">
            {lesson.content.sections.map((section, idx) => (
              <div key={idx} className="mb-8 last:mb-0">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {section.heading}
                </h2>
                <div className="text-gray-700 leading-relaxed whitespace-pre-line mb-4">
                  {section.content}
                </div>
                {section.example && (
                  <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded-r-lg">
                    <div className="text-sm font-semibold text-purple-900 mb-2">
                      📌 Example
                    </div>
                    <div className="text-gray-700 whitespace-pre-line">
                      {section.example}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Key takeaways */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            🎯 Key Takeaways
          </h3>
          <ul className="space-y-2">
            {lesson.content.keyTakeaways.map((takeaway, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="text-blue-600 mt-1">✓</span>
                <span className="text-gray-700">{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Practice prompt */}
        {lesson.content.practicePrompt && (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              💡 Try It Yourself
            </h3>
            <p className="text-gray-700 mb-4">
              {lesson.content.practicePrompt}
            </p>
            <p className="text-sm text-gray-600 italic">
              Copy this prompt and try it in ChatGPT, Claude, or your preferred AI tool
            </p>
          </div>
        )}

        {/* Complete button */}
        <div className="flex justify-center">
          <button
            onClick={markComplete}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-lg font-semibold hover:opacity-90"
          >
            ✓ Mark as Complete
          </button>
        </div>
      </div>
    </div>
  )
}
