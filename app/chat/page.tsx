'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [chatCount, setChatCount] = useState(0)
  const [chatLimit, setChatLimit] = useState(30)
  const [limitReached, setLimitReached] = useState(false)
  const [profession, setProfession] = useState('')
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const professionLabels: { [key: string]: string } = {
    'k12-educator': 'K-12 Educator',
    'recruiter': 'Recruiter',
    'retiree': 'Retiree',
    'healthcare': 'Healthcare Professional',
    'dentist': 'Dentist',
  }

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function loadUserData() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('profession, subscription_tier, daily_chat_count, last_chat_date')
      .eq('id', user.id)
      .single()

    if (!profile) {
      router.push('/onboarding')
      return
    }

    setProfession(profile.profession)

    const today = new Date().toISOString().split('T')[0]
    const count = profile.last_chat_date === today ? profile.daily_chat_count : 0
    const limit = profile.subscription_tier === 'pro' ? 999 : 30
    setChatCount(count)
    setChatLimit(limit)
    setLimitReached(count >= limit)

    // Load recent chat history from DB
    const { data: history } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(50)

    if (history && history.length > 0) {
      setMessages(history.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
      })))
    }

    setPageLoading(false)
    // Focus the input after loading
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault()

    const trimmed = input.trim()
    if (!trimmed || loading || limitReached) return

    setInput('')
    setError('')

    // Add user message to UI immediately
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Build conversation history for context
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: trimmed,
          conversationHistory,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.limitReached) {
          setLimitReached(true)
          setError('You\'ve reached your daily chat limit. Upgrade to Pro for more!')
        } else {
          setError(data.error || 'Something went wrong')
        }
        setLoading(false)
        return
      }

      // Add assistant message
      const assistantMsg: Message = {
        id: `temp-${Date.now()}-reply`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMsg])
      setChatCount(data.chatCount)

      if (data.chatCount >= data.chatLimit) {
        setLimitReached(true)
      }

    } catch (err) {
      console.error('Send error:', err)
      setError('Failed to send message. Please try again.')
    }

    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  async function clearHistory() {
    const confirmed = window.confirm('Clear your chat history? This cannot be undone.')
    if (!confirmed) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', user.id)

    setMessages([])
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading chat...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
              ← 
            </Link>
            <div>
              <h1 className="font-bold text-gray-900 flex items-center gap-2">
                💬 Ask Prism
              </h1>
              <p className="text-xs text-gray-500">
                AI tutor for {professionLabels[profession] || 'your profession'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">
              {chatCount}/{chatLimit === 999 ? '∞' : chatLimit} today
            </span>
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs text-gray-400 hover:text-red-500 transition"
                title="Clear history"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <span className="text-6xl mb-6 block">💬</span>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Hi! I&apos;m Prism
              </h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Your AI tutor. Ask me anything about AI — I&apos;ll explain it
                through the lens of your work as a {professionLabels[profession]?.toLowerCase() || 'professional'}.
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                {[
                  'What is AI in simple terms?',
                  'How can AI help in my job?',
                  'Is AI going to replace me?',
                  'What should I learn first?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion)
                      setTimeout(() => sendMessage(), 50)
                    }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-purple-300 hover:bg-purple-50 transition"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="text-xs text-purple-600 font-semibold mb-1">Prism</div>
                )}
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="mb-4 flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <div className="text-xs text-purple-600 font-semibold mb-1">Prism</div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 flex justify-center">
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {limitReached ? (
            <div className="text-center py-3">
              <p className="text-gray-600 mb-2">You&apos;ve used all {chatLimit} messages today</p>
              <button className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-semibold hover:opacity-90">
                Upgrade to Pro — $9.99/mo
              </button>
            </div>
          ) : (
            <form onSubmit={sendMessage} className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about AI..."
                rows={1}
                maxLength={2000}
                className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 max-h-32"
                style={{ minHeight: '44px' }}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className={`px-4 py-3 rounded-xl font-semibold text-sm transition ${
                  loading || !input.trim()
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90'
                }`}
              >
                Send
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
