'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function WelcomePage() {
  const [fullName, setFullName] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingProfile, setCheckingProfile] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkProfile()
  }, [])

  const checkProfile = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('users')
      .select('full_name, terms_accepted')
      .eq('id', user.id)
      .single()

    // If already completed welcome, redirect to dashboard
    if (profile?.full_name && profile?.terms_accepted) {
      router.push('/dashboard')
      return
    }

    setCheckingProfile(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!fullName.trim()) {
      setError('Please enter your full name')
      return
    }

    if (!termsAccepted) {
      setError('You must accept the terms and conditions')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Not authenticated')
        return
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim(),
          terms_accepted: true,
          challenge_start_date: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        setError(updateError.message)
        return
      }

      router.push('/dashboard')
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-500">Welcome to Market Warrior!</h1>
          <p className="text-gray-400 mt-2">Let's set up your profile</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
                Full Name <span className="text-gray-500">(as it will appear on your certificate)</span>
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
                placeholder="John Smith"
                required
              />
            </div>

            <div className="flex items-start gap-3">
              <input
                id="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
              />
              <label htmlFor="terms" className="text-sm text-gray-300">
                I accept the{' '}
                <a href="/terms" target="_blank" className="text-emerald-500 hover:text-emerald-400">
                  Terms & Conditions
                </a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" className="text-emerald-500 hover:text-emerald-400">
                  Privacy Policy
                </a>
              </label>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Start My Challenge'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
