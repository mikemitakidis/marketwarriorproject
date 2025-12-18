'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function PaymentPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login?redirect=/pay')
      return
    }

    setUserEmail(user.email || '')

    // Check if already paid
    const { data: profile } = await supabase
      .from('users')
      .select('has_paid, referred_by')
      .eq('id', user.id)
      .single()

    if (profile?.has_paid) {
      router.push('/dashboard')
      return
    }

    setReferralCode(profile?.referred_by || null)
  }

  const handleCheckout = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create checkout session')
        return
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (err) {
      setError('Failed to start checkout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-emerald-500">
            Market Warrior
          </Link>
          <p className="text-gray-400 mt-2">Complete your purchase to start the challenge</p>
        </div>

        <div className="card">
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold mb-2">30-Day Trading Challenge</h2>
            <div className="text-4xl font-bold text-emerald-500 my-4">$39.99</div>
            <p className="text-gray-400 text-sm">One-time payment • Lifetime access</p>
          </div>

          <ul className="space-y-3 mb-6 text-sm">
            <li className="flex items-center gap-2 text-gray-300">
              <span className="text-emerald-500">✓</span>
              30 comprehensive daily lessons
            </li>
            <li className="flex items-center gap-2 text-gray-300">
              <span className="text-emerald-500">✓</span>
              Interactive quizzes after each lesson
            </li>
            <li className="flex items-center gap-2 text-gray-300">
              <span className="text-emerald-500">✓</span>
              Full trading journal access
            </li>
            <li className="flex items-center gap-2 text-gray-300">
              <span className="text-emerald-500">✓</span>
              Community forum access
            </li>
            <li className="flex items-center gap-2 text-gray-300">
              <span className="text-emerald-500">✓</span>
              Certificate of completion
            </li>
          </ul>

          {referralCode && (
            <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg p-3 mb-6 text-center">
              <p className="text-sm text-emerald-400">
                Referred by: <span className="font-mono">{referralCode}</span>
              </p>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Processing...' : 'Pay Now with Stripe'}
          </button>

          <p className="text-center text-gray-500 text-sm mt-4">
            Signed in as {userEmail}
          </p>
        </div>
      </div>
    </div>
  )
}
