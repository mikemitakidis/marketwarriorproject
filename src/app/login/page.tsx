'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('login')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAffiliateSignup, setIsAffiliateSignup] = useState(false)
  const [title, setTitle] = useState('Welcome Back!')
  const [subtitle, setSubtitle] = useState('Continue your trading journey')
  const [registerBtnText, setRegisterBtnText] = useState('Create Account')
  const [showPurchaseLink, setShowPurchaseLink] = useState(true)
  const [registerContent, setRegisterContent] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const affiliate = urlParams.get('affiliate') === 'true'
    const register = urlParams.get('register') === 'true'
    
    setIsAffiliateSignup(affiliate)
    
    if (register || affiliate) {
      setActiveTab('register')
    }
    
    if (affiliate) {
      setTitle('Become an Affiliate')
      setSubtitle('Sign up free to earn 25% commission on referrals')
      setRegisterBtnText('Create Affiliate Account')
      setShowPurchaseLink(false)
    }

    if (urlParams.get('reset') === 'true') {
      setSuccessMsg('Password updated! You can now login with your new password.')
    }

    // Check session
    checkSession()
  }, [])

  const checkSession = async () => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('register') === 'true' || urlParams.get('affiliate') === 'true') {
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: userData } = await supabase
        .from('users')
        .select('agreed_to_terms, full_name')
        .eq('id', session.user.id)
        .single()

      if (userData && userData.agreed_to_terms) {
        window.location.href = '/dashboard'
      } else {
        window.location.href = '/welcome'
      }
    }
  }

  const switchTab = (tab: string) => {
    setActiveTab(tab)
    setErrorMsg('')
    setSuccessMsg('')
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)

    const form = e.currentTarget
    const email = (form.elements.namedItem('loginEmail') as HTMLInputElement).value.trim()
    const password = (form.elements.namedItem('loginPassword') as HTMLInputElement).value

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('has_paid, agreed_to_terms')
        .eq('id', data.user.id)
        .single()

      if (userError || !userData || !userData.has_paid) {
        setSuccessMsg('Redirecting to checkout...')
        const urlParams = new URLSearchParams(window.location.search)
        const promoCode = urlParams.get('promo') || ''
        const refCode = urlParams.get('ref') || ''

        const response = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, promoCode, referralCode: refCode })
        })
        const checkoutData = await response.json()
        if (checkoutData.url) {
          window.location.href = checkoutData.url
        } else {
          setErrorMsg('Failed to start checkout. Please try again.')
          setLoading(false)
        }
        return
      }

      setSuccessMsg('Login successful! Redirecting...')
      setTimeout(() => {
        window.location.href = userData.agreed_to_terms ? '/dashboard' : '/welcome'
      }, 1000)

    } catch (error: any) {
      setErrorMsg(error.message || 'Invalid email or password')
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    const form = e.currentTarget
    const email = (form.elements.namedItem('regEmail') as HTMLInputElement).value.trim()
    const password = (form.elements.namedItem('regPassword') as HTMLInputElement).value
    const confirmPassword = (form.elements.namedItem('regConfirmPassword') as HTMLInputElement).value

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + (isAffiliateSignup ? '/dashboard?affiliate=new' : '/welcome'),
          data: { is_affiliate: isAffiliateSignup }
        }
      })

      if (error) throw error

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setRegisterContent(`
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 50px; margin-bottom: 15px;">👋</div>
            <h3 style="color: #1e293b; margin-bottom: 15px;">Welcome Back!</h3>
            <p style="color: #64748b; margin-bottom: 20px;">This email is already registered. What would you like to do?</p>
          </div>
        `)
      } else {
        if (isAffiliateSignup) {
          setSuccessMsg('Affiliate account created! Check your email to verify, then you can get your referral link from the dashboard.')
        } else {
          setRegisterContent(`
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 50px; margin-bottom: 15px;">✅</div>
              <h3 style="color: #16a34a; margin-bottom: 15px;">Account Created!</h3>
              <p style="color: #64748b; margin-bottom: 20px;">Check your email to verify your account, then complete your purchase to access the challenge.</p>
            </div>
          `)
        }
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Failed to create account')
    }

    setLoading(false)
  }

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)

    const form = e.currentTarget
    const email = (form.elements.namedItem('resetEmail') as HTMLInputElement).value.trim()

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login?reset=true'
      })
      if (error) throw error
      setSuccessMsg('Password reset link sent! Check your email inbox.')
    } catch (error: any) {
      setErrorMsg(error.message || 'Failed to send reset email')
    }

    setLoading(false)
  }

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/welcome' }
      })
      if (error) throw error
    } catch (error: any) {
      setErrorMsg(error.message || 'Failed to sign in with Google')
    }
  }

  const goToCheckout = async (email: string) => {
    setSuccessMsg('Redirecting to checkout...')
    const urlParams = new URLSearchParams(window.location.search)
    const promoCode = urlParams.get('promo') || ''
    const refCode = urlParams.get('ref') || ''

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, promoCode, referralCode: refCode })
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setErrorMsg('Failed to start checkout. Please try again.')
      }
    } catch {
      setErrorMsg('Checkout error. Please try again.')
    }
  }

  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        body {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .login-container {
          background: white;
          padding: 50px;
          border-radius: 25px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.3);
          max-width: 450px;
          width: 100%;
          text-align: center;
        }
        
        .logo {
          width: 100px;
          height: auto;
          margin-bottom: 20px;
          border-radius: 15px;
        }
        
        h1 {
          color: #1e293b;
          margin-bottom: 10px;
          font-size: 2em;
        }
        
        .subtitle {
          color: #64748b;
          margin-bottom: 30px;
        }
        
        .form-group {
          margin-bottom: 20px;
          text-align: left;
        }
        
        label {
          display: block;
          margin-bottom: 8px;
          color: #374151;
          font-weight: 600;
        }
        
        input {
          width: 100%;
          padding: 15px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1em;
          transition: border-color 0.3s;
        }
        
        input:focus {
          outline: none;
          border-color: #667eea;
        }
        
        .btn {
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 12px;
          font-size: 1.1em;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          margin-bottom: 15px;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }
        
        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        
        .btn-google {
          background: white;
          color: #1e293b;
          border: 2px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        
        .btn-google:hover {
          background: #f8fafc;
          border-color: #667eea;
        }
        
        .btn-google svg {
          width: 20px;
          height: 20px;
        }
        
        .divider {
          display: flex;
          align-items: center;
          margin: 25px 0;
          color: #94a3b8;
        }
        
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }
        
        .divider span {
          padding: 0 15px;
          font-size: 0.9em;
        }
        
        .links {
          margin-top: 25px;
          color: #64748b;
        }
        
        .links a {
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
        }
        
        .links a:hover {
          text-decoration: underline;
        }
        
        .message {
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
          display: none;
        }
        
        .message.error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }
        
        .message.success {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }
        
        .message.show {
          display: block;
        }
        
        .spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 10px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .forgot-password {
          text-align: right;
          margin-bottom: 20px;
        }
        
        .forgot-password a {
          color: #667eea;
          text-decoration: none;
          font-size: 0.9em;
        }
        
        .forgot-password a:hover {
          text-decoration: underline;
        }
        
        .tab-buttons {
          display: flex;
          margin-bottom: 25px;
          border-radius: 10px;
          overflow: hidden;
          border: 2px solid #e5e7eb;
        }
        
        .tab-btn {
          flex: 1;
          padding: 12px;
          border: none;
          background: #f8fafc;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .tab-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .tab-content {
          display: none;
        }
        
        .tab-content.active {
          display: block;
        }
        
        @media (max-width: 480px) {
          .login-container {
            padding: 35px 25px;
          }
          
          h1 {
            font-size: 1.6em;
          }
        }
      `}</style>

      <div className="login-container">
        <img src="/logo.png" alt="Market Warrior" className="logo" />
        <h1>{title}</h1>
        <p className="subtitle">{subtitle}</p>

        <div className={`message error ${errorMsg ? 'show' : ''}`}>{errorMsg}</div>
        <div className={`message success ${successMsg ? 'show' : ''}`}>{successMsg}</div>

        {/* Tab Buttons */}
        <div className="tab-buttons">
          <button className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`} onClick={() => switchTab('login')}>Login</button>
          <button className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`} onClick={() => switchTab('register')}>Register</button>
        </div>

        {/* Login Form */}
        <div className={`tab-content ${activeTab === 'login' ? 'active' : ''}`}>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="loginEmail">Email Address</label>
              <input type="email" name="loginEmail" id="loginEmail" placeholder="Enter your email" required />
            </div>

            <div className="form-group">
              <label htmlFor="loginPassword">Password</label>
              <input type="password" name="loginPassword" id="loginPassword" placeholder="Enter your password" required minLength={6} />
            </div>

            <div className="forgot-password">
              <a href="#" onClick={(e) => { e.preventDefault(); switchTab('reset') }}>Forgot password?</a>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner"></span> Logging in...</> : 'Login to Challenge'}
            </button>
          </form>

          <div className="divider"><span>or continue with</span></div>

          <button className="btn btn-google" onClick={signInWithGoogle}>
            <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
        </div>

        {/* Register Form */}
        <div className={`tab-content ${activeTab === 'register' ? 'active' : ''}`}>
          {registerContent ? (
            <div dangerouslySetInnerHTML={{ __html: registerContent }} />
          ) : (
            <>
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label htmlFor="regEmail">Email Address</label>
                  <input type="email" name="regEmail" id="regEmail" placeholder="Enter your email" required />
                </div>

                <div className="form-group">
                  <label htmlFor="regPassword">Create Password</label>
                  <input type="password" name="regPassword" id="regPassword" placeholder="Min 6 characters" required minLength={6} />
                </div>

                <div className="form-group">
                  <label htmlFor="regConfirmPassword">Confirm Password</label>
                  <input type="password" name="regConfirmPassword" id="regConfirmPassword" placeholder="Confirm password" required />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <><span className="spinner"></span> Creating account...</> : registerBtnText}
                </button>
              </form>

              <div className="divider"><span>or continue with</span></div>

              <button className="btn btn-google" onClick={signInWithGoogle}>
                <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>

              <p style={{ marginTop: '20px', color: '#64748b', fontSize: '0.9em' }}>
                By registering, you agree to our <a href="/terms" style={{ color: '#667eea' }}>Terms</a> and <a href="/privacy" style={{ color: '#667eea' }}>Privacy Policy</a>
              </p>
            </>
          )}
        </div>

        {/* Password Reset Form */}
        <div className={`tab-content ${activeTab === 'reset' ? 'active' : ''}`}>
          <p style={{ color: '#64748b', marginBottom: '20px' }}>Enter your email and we&apos;ll send you a link to reset your password.</p>

          <form onSubmit={handleReset}>
            <div className="form-group">
              <label htmlFor="resetEmail">Email Address</label>
              <input type="email" name="resetEmail" id="resetEmail" placeholder="Enter your email" required />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner"></span> Sending...</> : 'Send Reset Link'}
            </button>
          </form>

          <p className="links" style={{ marginTop: '20px' }}>
            <a href="#" onClick={(e) => { e.preventDefault(); switchTab('login') }}>← Back to Login</a>
          </p>
        </div>

        <div className="links">
          {showPurchaseLink && <p>Don&apos;t have access? <a href="/#pricing">Purchase Challenge - $39.99</a></p>}
          <p style={{ marginTop: '10px' }}><a href="/">← Back to Home</a></p>
        </div>
      </div>
    </>
  )
}
