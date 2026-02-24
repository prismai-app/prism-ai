'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

type Step = 'profession' | 'education' | 'experience' | 'goals'

interface Profession {
  id: string
  name: string
  slug: string
  icon: string
  description: string
}

export default function OnboardingPage() {
  const router = useRouter()
  
  const [currentStep, setCurrentStep] = useState<Step>('profession')
  const [professions, setProfessions] = useState<Profession[]>([])
  const [loading, setLoading] = useState(true)
  
  // Form data
  const [selectedProfession, setSelectedProfession] = useState('')
  const [educationLevel, setEducationLevel] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])

  useEffect(() => {
    loadProfessions()
    checkIfAlreadyOnboarded()
  }, [])

  async function checkIfAlreadyOnboarded() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()

    if (profile?.onboarding_completed) {
      router.push('/dashboard')
    }
  }

  async function loadProfessions() {
    const { data, error } = await supabase
      .from('professions')
      .select('*')
      .eq('is_active', true)
      .eq('launch_wave', 1)
      .order('name')

    if (data) {
      setProfessions(data)
    }
    setLoading(false)
  }

  function toggleGoal(goal: string) {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter(g => g !== goal))
    } else {
      setSelectedGoals([...selectedGoals, goal])
    }
  }

  async function handleSubmit() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({
        profession: selectedProfession,
        education_level: educationLevel,
        experience_level: experienceLevel,
        goals: selectedGoals,
        onboarding_completed: true
      })
      .eq('id', user.id)

    if (!error) {
      router.push('/dashboard')
    }
  }

  function canProceed() {
    switch (currentStep) {
      case 'profession': return selectedProfession !== ''
      case 'education': return educationLevel !== ''
      case 'experience': return experienceLevel !== ''
      case 'goals': return selectedGoals.length > 0
      default: return false
    }
  }

  function nextStep() {
    const steps: Step[] = ['profession', 'education', 'experience', 'goals']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    } else {
      handleSubmit()
    }
  }

  function prevStep() {
    const steps: Step[] = ['profession', 'education', 'experience', 'goals']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  const educationOptions = [
    { value: 'high_school', label: 'High School' },
    { value: 'some_college', label: 'Some College' },
    { value: 'bachelors', label: "Bachelor's Degree" },
    { value: 'masters', label: "Master's Degree" },
    { value: 'doctorate', label: 'Doctorate' }
  ]

  const experienceOptions = [
    { value: 'beginner', label: 'Beginner', desc: "I'm new to AI" },
    { value: 'intermediate', label: 'Intermediate', desc: "I've used AI tools before" },
    { value: 'advanced', label: 'Advanced', desc: "I use AI regularly" }
  ]

  const goalOptions = [
    { value: 'career_growth', label: 'Career Growth', icon: '📈' },
    { value: 'stay_current', label: 'Stay Current', icon: '📰' },
    { value: 'teach_others', label: 'Teach Others', icon: '👥' },
    { value: 'personal_interest', label: 'Personal Interest', icon: '💡' }
  ]

  const stepTitles = {
    profession: "What's your profession?",
    education: "What's your education level?",
    experience: "How familiar are you with AI?",
    goals: "What are your goals?"
  }

  const stepProgress = {
    profession: 25,
    education: 50,
    experience: 75,
    goals: 100
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-300"
              style={{ width: `${stepProgress[currentStep]}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-gray-500 text-center">
            Step {Object.keys(stepProgress).indexOf(currentStep) + 1} of 4
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          {stepTitles[currentStep]}
        </h1>

        {/* Content */}
        <div className="mb-8">
          {currentStep === 'profession' && (
            <div className="grid grid-cols-1 gap-3">
              {professions.map((prof) => (
                <button
                  key={prof.id}
                  onClick={() => setSelectedProfession(prof.slug)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedProfession === prof.slug
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{prof.icon}</span>
                    <div>
                      <div className="font-semibold text-gray-900">{prof.name}</div>
                      <div className="text-sm text-gray-600">{prof.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {currentStep === 'education' && (
            <div className="grid grid-cols-1 gap-3">
              {educationOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setEducationLevel(option.value)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    educationLevel === option.value
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{option.label}</div>
                </button>
              ))}
            </div>
          )}

          {currentStep === 'experience' && (
            <div className="grid grid-cols-1 gap-3">
              {experienceOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setExperienceLevel(option.value)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    experienceLevel === option.value
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.desc}</div>
                </button>
              ))}
            </div>
          )}

          {currentStep === 'goals' && (
            <div className="grid grid-cols-2 gap-3">
              {goalOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleGoal(option.value)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedGoals.includes(option.value)
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{option.icon}</div>
                  <div className="font-semibold text-gray-900 text-sm">{option.label}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentStep !== 'profession' && (
            <button
              onClick={prevStep}
              className="px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
            >
              Back
            </button>
          )}
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold ${
              canProceed()
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {currentStep === 'goals' ? 'Get Started' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
