'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface AffiliateStats {
  referral_code: string
  total_referrals: number
  paid_referrals: number
  total_earnings: number
  pending_earnings: number
  paid_out: number
  is_active: boolean
}

export default function AffiliatePage() {
  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    // Get or create affiliate profile
    let { data: profile } = await supabase
      .from('affiliate_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      // Create new affiliate profile
      const { data: userProfile } = await supabase
        .from('users')
        .select('referral_code')
        .eq('id', user.id)
        .single()

      const referralCode = userProfile?.referral_code || `MW${user.id.slice(0, 8).toUpperCase()}`

      const { data: newProfile } = await supabase
        .from('affiliate_profiles')
        .insert({
          user_id: user.id,
          referral_code: referralCode
        })
        .select()
        .single()

      profile = newProfile
    }

    setStats(profile)
    setLoading(false)
  }

  const copyReferralLink = () => {
    if (!stats) return
    const link = `${window.location.origin}/register?ref=${stats.referral_code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const requestPayout = async () => {
    if (!stats || stats.pending_earnings < 50) return
    
    setRequesting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setRequesting(false)
      return
    }

    await supabase
      .from('payout_requests')
      .insert({
        user_id: user.id,
        amount: stats.pending_earnings,
        status: 'pending'
      })

    alert('Payout request submitted! You will be contacted within 3-5 business days.')
    setRequesting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-gray-400 hover:text-white flex items-center gap-2">
            ← Back to Dashboard
          </Link>
          <h1 className="text-xl font-bold text-emerald-500">Affiliate Program</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Referral Link */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold mb-4">Your Referral Link</h2>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={stats ? `${window.location.origin}/register?ref=${stats.referral_code}` : ''}
              className="input flex-1"
            />
            <button onClick={copyReferralLink} className="btn-primary">
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Share this link with friends and earn 30% commission on every paid signup!
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <p className="text-gray-400 text-sm mb-1">Total Referrals</p>
            <p className="text-2xl font-bold">{stats?.total_referrals || 0}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-1">Paid Conversions</p>
            <p className="text-2xl font-bold text-emerald-500">{stats?.paid_referrals || 0}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-1">Total Earnings</p>
            <p className="text-2xl font-bold">${(stats?.total_earnings || 0).toFixed(2)}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-1">Pending Payout</p>
            <p className="text-2xl font-bold text-yellow-500">${(stats?.pending_earnings || 0).toFixed(2)}</p>
          </div>
        </div>

        {/* Payout Section */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold mb-4">Request Payout</h2>
          <p className="text-gray-400 mb-4">
            Minimum payout: $50.00 | Already paid out: ${(stats?.paid_out || 0).toFixed(2)}
          </p>
          <button
            onClick={requestPayout}
            disabled={!stats || stats.pending_earnings < 50 || requesting}
            className="btn-primary disabled:opacity-50"
          >
            {requesting ? 'Submitting...' : 'Request Payout'}
          </button>
          {stats && stats.pending_earnings < 50 && (
            <p className="text-sm text-gray-500 mt-2">
              You need ${(50 - stats.pending_earnings).toFixed(2)} more to request a payout.
            </p>
          )}
        </div>

        {/* How It Works */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">How It Works</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="text-2xl">1️⃣</div>
              <div>
                <h3 className="font-medium">Share Your Link</h3>
                <p className="text-gray-400 text-sm">Share your unique referral link with friends, on social media, or your website.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-2xl">2️⃣</div>
              <div>
                <h3 className="font-medium">They Sign Up</h3>
                <p className="text-gray-400 text-sm">When someone uses your link to register, they're automatically tracked as your referral.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-2xl">3️⃣</div>
              <div>
                <h3 className="font-medium">Earn Commission</h3>
                <p className="text-gray-400 text-sm">When they purchase the course, you earn 30% commission ($11.99 per sale).</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-2xl">4️⃣</div>
              <div>
                <h3 className="font-medium">Get Paid</h3>
                <p className="text-gray-400 text-sm">Request a payout once you reach $50. We process payouts within 3-5 business days.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
