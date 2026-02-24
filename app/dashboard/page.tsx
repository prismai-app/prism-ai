'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

interface Profile {
  profession: string
  education_level: string
  experience_level: string
  goals: string[]
  subscription_tier: string
  daily_chat_count: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUserEmail(user.email || '')

    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData) {
      if (!profileData.onboarding_completed) {
        router.push('/onboarding')
        return
      }
      setProfile(profileData)
    }
    
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  const professionLabels: { [key: string]: string } = {
    'k12-educator': 'K-12 Educator',
    'recruiter': 'Recruiter',
    'retiree': 'Retiree',
    'healthcare': 'Healthcare Professional',
    'dentist': 'Dentist'
  }

  const experienceLabels: { [key: string]: string } = {
    'beginner': 'Beginner',
    'intermediate': 'Intermediate',
    'advanced': 'Advanced'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-2xl font-bold">
              🔷 <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Prism AI</span>
            </a>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{userEmail}</span>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-gray-600">
            You're learning AI as a <span className="font-semibold">{professionLabels[profile.profession]}</span>
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Profile</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Profession:</span>
              <p className="font-semibold text-gray-900">{professionLabels[profile.profession]}</p>
            </div>
            <div>
              <span className="text-gray-600">AI Experience:</span>
              <p className="font-semibold text-gray-900">{experienceLabels[profile.experience_level]}</p>
            </div>
            <div>
              <span className="text-gray-600">Subscription:</span>
              <p className="font-semibold text-gray-900 capitalize">{profile.subscription_tier}</p>
            </div>
            <div>
              <span className="text-gray-600">Daily Chats Used:</span>
              <p className="font-semibold text-gray-900">{profile.daily_chat_count} / 30</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Lessons */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📚</span>
              <h2 className="text-xl font-semibold text-gray-900">Lessons</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Personalized AI lessons for your profession
            </p>
            <div className="text-sm text-gray-500 italic">
              Coming soon...
            </div>
          </div>

          {/* News Feed */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📰</span>
              <h2 className="text-xl font-semibold text-gray-900">AI News</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Latest AI news explained for {professionLabels[profile.profession].toLowerCase()}s
            </p>
            <div className="text-sm text-gray-500 italic">
              Coming soon...
            </div>
          </div>

          {/* Chatbot */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">💬</span>
              <h2 className="text-xl font-semibold text-gray-900">Ask Prism</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Get personalized AI help and guidance
            </p>
            <div className="text-sm text-gray-500 italic">
              Coming soon...
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
