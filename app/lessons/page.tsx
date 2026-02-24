'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

interface Lesson {
  id: string
  title: string
  slug: string
  difficulty: string
  estimated_minutes: number
  profession_id: string
}

interface Progress {
  lesson_id: string
  status: string
  progress_percentage: number
}

export default function LessonsPage() {
  const router = useRouter()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [progress, setProgress] = useState<Progress[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfession, setUserProfession] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    // Get user's profession
    const { data: profile } = await supabase
      .from('profiles')
      .select('profession')
      .eq('id', user.id)
      .single()

    if (!profile) {
      router.push('/onboarding')
      return
    }

    setUserProfession(profile.profession)

    // Get profession ID
    const { data: professionData } = await supabase
      .from('professions')
      .select('id')
      .eq('slug', profile.profession)
      .single()

    if (!professionData) {
      setLoading(false)
      return
    }

    // Get lessons for this profession
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('*')
      .eq('profession_id', professionData.id)
      .eq('is_published', true)
      .order('order_index')

    if (lessonsData) {
      setLessons(lessonsData)
    }

    // Get user's progress
    const { data: progressData } = await supabase
      .from('lesson_progress')
      .select('lesson_id, status, progress_percentage')
      .eq('user_id', user.id)

    if (progressData) {
      setProgress(progressData)
    }

    setLoading(false)
  }

  function getProgressForLesson(lessonId: string) {
    return progress.find(p => p.lesson_id === lessonId)
  }

  const difficultyColors: { [key: string]: string } = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-yellow-100 text-yellow-700',
    advanced: 'bg-red-100 text-red-700'
  }

  const statusIcons: { [key: string]: string } = {
    not_started: '○',
    in_progress: '◐',
    completed: '●'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading lessons...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-bold">
            🔷 <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Prism AI</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Lessons</h1>
          <p className="text-gray-600">
            AI concepts explained through the lens of your profession
          </p>
        </div>

        {lessons.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <span className="text-6xl mb-4 block">📚</span>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Lessons coming soon!
            </h2>
            <p className="text-gray-600 mb-6">
              We're preparing personalized lessons for your profession.
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:opacity-90"
            >
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {lessons.map((lesson) => {
              const lessonProgress = getProgressForLesson(lesson.id)
              const status = lessonProgress?.status || 'not_started'
              
              return (
                <Link
                  key={lesson.id}
                  href={`/lessons/${lesson.slug}`}
                  className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-purple-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{statusIcons[status]}</span>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {lesson.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className={`px-2 py-1 rounded-full font-medium ${difficultyColors[lesson.difficulty]}`}>
                          {lesson.difficulty}
                        </span>
                        <span className="text-gray-500">
                          {lesson.estimated_minutes} min
                        </span>
                        {lessonProgress && status === 'in_progress' && (
                          <span className="text-purple-600 font-medium">
                            {lessonProgress.progress_percentage}% complete
                          </span>
                        )}
                        {status === 'completed' && (
                          <span className="text-green-600 font-medium">
                            ✓ Completed
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-gray-400">→</div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
