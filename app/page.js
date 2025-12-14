'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  useEffect(() => {
    // Check for referral code in URL and store it
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      sessionStorage.setItem('referral_code', refCode);
    }
  }, []);

  function goToRegister() {
    let url = '/login?register=true';
    const refCode = sessionStorage.getItem('referral_code');
    if (refCode) {
      url += '&ref=' + encodeURIComponent(refCode);
    }
    window.location.href = url;
  }

  function toggleFaq(e) {
    const item = e.target.parentElement;
    item.classList.toggle('active');
  }

  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          line-height: 1.6;
          color: #1e293b;
          overflow-x: hidden;
        }
        
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 15px 0;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        .header-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: white;
        }
        
        .logo {
          max-width: 50px;
          height: auto;
          border-radius: 10px;
        }
        
        .logo-text {
          font-size: 1.5em;
          font-weight: 700;
        }
        
        .nav-menu {
          display: flex;
          gap: 25px;
          align-items: center;
        }
        
        .nav-link {
          color: white;
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.3s;
        }
        
        .nav-link:hover {
          opacity: 0.8;
        }
        
        .btn-login {
          background: white;
          color: #667eea;
          padding: 10px 25px;
          border-radius: 25px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.3s;
        }
        
        .btn-login:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: white;
          font-size: 1.5em;
          cursor: pointer;
        }
        
        @media (max-width: 768px) {
          .nav-menu { display: none; }
          .mobile-menu-btn { display: block; }
        }
        
        .hero {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 80px 20px 100px;
          text-align: center;
        }
        
        .hero-content {
          max-width: 900px;
          margin: 0 auto;
        }
        
        .hero-badge {
          display: inline-block;
          background: rgba(255,255,255,0.2);
          padding: 10px 25px;
          border-radius: 50px;
          margin-bottom: 25px;
          font-weight: 600;
        }
        
        .hero h1 {
          font-size: 3em;
          margin-bottom: 20px;
          line-height: 1.2;
        }
        
        .hero-subtitle {
          font-size: 1.4em;
          margin-bottom: 35px;
          opacity: 0.95;
        }
        
        .btn-cta {
          display: inline-block;
          background: white;
          color: #667eea;
          padding: 18px 45px;
          border-radius: 50px;
          font-size: 1.2em;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.3s;
          border: none;
          cursor: pointer;
        }
        
        .btn-cta:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        .features {
          padding: 80px 20px;
          background: white;
        }
        
        .section-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .section-title {
          text-align: center;
          font-size: 2.5em;
          color: #1e293b;
          margin-bottom: 50px;
        }
        
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 35px;
        }
        
        .feature-card {
          padding: 35px;
          background: white;
          border-radius: 20px;
          border: 2px solid #e2e8f0;
          transition: all 0.3s;
          text-align: center;
        }
        
        .feature-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 20px 40px rgba(102, 126, 234, 0.15);
          border-color: #667eea;
        }
        
        .feature-icon {
          font-size: 3em;
          margin-bottom: 20px;
        }
        
        .feature-card h3 {
          color: #667eea;
          font-size: 1.4em;
          margin-bottom: 15px;
        }
        
        .feature-card p {
          color: #64748b;
          line-height: 1.7;
        }
        
        .curriculum {
          padding: 80px 20px;
          background: #f8fafc;
        }
        
        .phase-grid {
          display: grid;
          gap: 25px;
          margin-top: 40px;
        }
        
        .phase-card {
          background: white;
          padding: 30px;
          border-radius: 20px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.08);
          display: flex;
          gap: 25px;
          align-items: flex-start;
        }
        
        .phase-number {
          width: 60px;
          height: 60px;
          min-width: 60px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5em;
          font-weight: 700;
        }
        
        .phase-content h3 {
          color: #1e293b;
          font-size: 1.3em;
          margin-bottom: 8px;
        }
        
        .phase-days {
          color: #667eea;
          font-weight: 600;
          font-size: 0.9em;
          margin-bottom: 10px;
        }
        
        .phase-content p {
          color: #64748b;
        }
        
        .testimonials {
          padding: 80px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .testimonials .section-title {
          color: white;
        }
        
        .testimonial-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 30px;
          margin-top: 40px;
        }
        
        .testimonial-card {
          background: white;
          padding: 35px;
          border-radius: 20px;
          color: #1e293b;
        }
        
        .testimonial-stars {
          color: #fbbf24;
          font-size: 1.5em;
          margin-bottom: 15px;
        }
        
        .testimonial-text {
          color: #475569;
          font-size: 1.05em;
          line-height: 1.7;
          margin-bottom: 20px;
        }
        
        .testimonial-author {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .author-avatar {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 1.2em;
        }
        
        .author-name {
          font-weight: 700;
          color: #1e293b;
        }
        
        .author-role {
          font-size: 0.9em;
          color: #64748b;
        }
        
        .pricing {
          padding: 80px 20px;
          background: white;
        }
        
        .pricing-card {
          max-width: 500px;
          margin: 0 auto;
          background: white;
          border-radius: 25px;
          padding: 50px 40px;
          box-shadow: 0 20px 60px rgba(102, 126, 234, 0.2);
          border: 3px solid #667eea;
          text-align: center;
          position: relative;
        }
        
        .price-badge {
          position: absolute;
          top: -15px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 8px 25px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.9em;
        }
        
        .price {
          font-size: 4em;
          font-weight: 700;
          color: #667eea;
          margin: 20px 0 10px;
        }
        
        .price-note {
          color: #64748b;
          margin-bottom: 30px;
        }
        
        .price-features {
          list-style: none;
          text-align: left;
          margin: 30px 0;
        }
        
        .price-features li {
          padding: 12px 0;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .check-icon {
          color: #10b981;
          font-weight: 700;
        }
        
        .btn-checkout {
          width: 100%;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 15px;
          font-size: 1.3em;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 20px;
        }
        
        .btn-checkout:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4);
        }
        
        .affiliate-banner {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 60px 20px;
          text-align: center;
        }
        
        .affiliate-content {
          max-width: 700px;
          margin: 0 auto;
        }
        
        .affiliate-content h2 {
          color: #92400e;
          font-size: 2em;
          margin-bottom: 15px;
        }
        
        .affiliate-content p {
          color: #78350f;
          margin-bottom: 20px;
        }
        
        .commission-badge {
          display: inline-block;
          background: white;
          padding: 20px 40px;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          margin: 20px 0;
          border: 2px solid #10b981;
        }
        
        .commission-rate {
          font-size: 3em;
          font-weight: 700;
          color: #059669;
        }
        
        .journal-banner {
          background: linear-gradient(135deg, #10b981, #059669);
          padding: 60px 20px;
          text-align: center;
          color: white;
        }
        
        .journal-banner h2 {
          font-size: 2em;
          margin-bottom: 15px;
        }
        
        .journal-banner p {
          opacity: 0.95;
          margin-bottom: 25px;
        }
        
        .btn-journal {
          display: inline-block;
          background: white;
          color: #059669;
          padding: 15px 35px;
          border-radius: 30px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.3s;
        }
        
        .btn-journal:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        .faq {
          padding: 80px 20px;
          background: #f8fafc;
        }
        
        .faq-grid {
          display: grid;
          gap: 20px;
          max-width: 900px;
          margin: 40px auto 0;
        }
        
        .faq-item {
          background: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        
        .faq-question {
          padding: 25px 30px;
          font-weight: 700;
          color: #1e293b;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .faq-question::after {
          content: '+';
          font-size: 1.5em;
          color: #667eea;
        }
        
        .faq-item.active .faq-question::after {
          content: '−';
        }
        
        .faq-answer {
          padding: 0 30px 25px;
          color: #64748b;
          display: none;
          line-height: 1.7;
        }
        
        .faq-item.active .faq-answer {
          display: block;
        }
        
        .footer {
          background: #1e293b;
          color: #94a3b8;
          padding: 40px 20px;
          text-align: center;
        }
        
        .footer-links {
          margin-top: 20px;
        }
        
        .footer-link {
          color: #94a3b8;
          text-decoration: none;
          margin: 0 15px;
          transition: color 0.3s;
        }
        
        .footer-link:hover {
          color: white;
        }
        
        @media (max-width: 768px) {
          .hero h1 { font-size: 2em; }
          .hero-subtitle { font-size: 1.1em; }
          .section-title { font-size: 1.8em; }
          .pricing-card { padding: 40px 25px; }
          .price { font-size: 3em; }
          .phase-card { flex-direction: column; text-align: center; }
          .phase-number { margin: 0 auto; }
        }
      `}</style>

      {/* Header */}
      <header className="header">
        <div className="header-container">
          <Link href="/" className="logo-section">
            <img src="/logo.png" alt="Market Warrior" className="logo" />
            <span className="logo-text">Market Warrior</span>
          </Link>
          <nav className="nav-menu">
            <a href="#features" className="nav-link">Features</a>
            <a href="#curriculum" className="nav-link">Curriculum</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <a href="#faq" className="nav-link">FAQ</a>
            <Link href="/login" className="nav-link">Login</Link>
            <a href="#pricing" className="btn-login">Get Started</a>
          </nav>
          <button className="mobile-menu-btn">☰</button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">🚀 30-Day Structured Challenge</div>
          <h1>Become a Confident Trader in 30 Days</h1>
          <p className="hero-subtitle">Learn trading fundamentals, technical analysis, and risk management through our proven step-by-step program. No experience required.</p>
          <a href="#pricing" className="btn-cta">Start Your Journey - $39.99</a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="section-container">
          <h2 className="section-title">Why Market Warrior?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📚</div>
              <h3>Structured Learning</h3>
              <p>30 days of carefully designed lessons that build on each other, taking you from complete beginner to confident trader.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📝</div>
              <h3>Interactive Quizzes</h3>
              <p>Test your knowledge with quizzes after each lesson. Score 60% or higher to unlock the next day's content.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💼</div>
              <h3>Practical Tasks</h3>
              <p>Apply what you learn with real-world tasks. Practice on demo accounts with zero financial risk.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎓</div>
              <h3>Official Certificate</h3>
              <p>Earn a professional certificate of completion to showcase your trading education on LinkedIn.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Affiliate Program</h3>
              <p>Earn 25-30% commission for every friend you refer. No purchase required to start - share your link and build passive income.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Free Trading Journal</h3>
              <p>Get access to our professional trading journal app to track your demo trades and analyze performance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum Section */}
      <section id="curriculum" className="curriculum">
        <div className="section-container">
          <h2 className="section-title">Your 30-Day Journey</h2>
          <div className="phase-grid">
            <div className="phase-card">
              <div className="phase-number">1</div>
              <div className="phase-content">
                <h3>Trading Foundations</h3>
                <div className="phase-days">Days 1-7</div>
                <p>Master the basics: market types, trading terminology, demo accounts, chart reading, and candlestick patterns.</p>
              </div>
            </div>
            <div className="phase-card">
              <div className="phase-number">2</div>
              <div className="phase-content">
                <h3>Technical Analysis</h3>
                <div className="phase-days">Days 8-14</div>
                <p>Learn trend lines, support/resistance, moving averages, RSI, MACD, and how to identify trading opportunities.</p>
              </div>
            </div>
            <div className="phase-card">
              <div className="phase-number">3</div>
              <div className="phase-content">
                <h3>Advanced Strategies</h3>
                <div className="phase-days">Days 15-21</div>
                <p>Develop your trading plan, learn risk management, position sizing, Fibonacci levels, and backtesting strategies.</p>
              </div>
            </div>
            <div className="phase-card">
              <div className="phase-number">4</div>
              <div className="phase-content">
                <h3>Portfolio Management</h3>
                <div className="phase-days">Days 22-28</div>
                <p>Explore dividends, ETFs, copy trading, portfolio rebalancing, and economic indicators that move markets.</p>
              </div>
            </div>
            <div className="phase-card">
              <div className="phase-number">5</div>
              <div className="phase-content">
                <h3>Assessment & Graduation</h3>
                <div className="phase-days">Days 29-30</div>
                <p>Final review, goal setting with SMART framework, and comprehensive assessment to earn your certificate.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials">
        <div className="section-container">
          <h2 className="section-title">What Our Warriors Say</h2>
          <div className="testimonial-grid">
            <div className="testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">"I was a complete beginner with zero trading knowledge. After 30 days, I'm confidently analyzing charts and making demo trades. The structured approach made all the difference!"</p>
              <div className="testimonial-author">
                <div className="author-avatar">S</div>
                <div>
                  <div className="author-name">Sarah Johnson</div>
                  <div className="author-role">Completed in 30 days</div>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">"The quizzes and tasks really reinforce the learning. I love that they focus on demo trading first - no pressure to risk real money while learning. Highly recommend!"</p>
              <div className="testimonial-author">
                <div className="author-avatar">M</div>
                <div>
                  <div className="author-name">Michael Chen</div>
                  <div className="author-role">Completed in 32 days</div>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">"Perfect for beginners! The content is clear, well-organized, and the certificate looks great on my LinkedIn. Already referred two friends through the affiliate program."</p>
              <div className="testimonial-author">
                <div className="author-avatar">J</div>
                <div>
                  <div className="author-name">Jennifer Martinez</div>
                  <div className="author-role">Completed in 28 days</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing">
        <div className="section-container">
          <h2 className="section-title">Simple, One-Time Payment</h2>
          
          <div className="pricing-card">
            <div className="price-badge">BEST VALUE</div>
            <div className="price">$39.99</div>
            <p className="price-note">One-time payment • Lifetime certificate • 120 days access</p>
            
            <ul className="price-features">
              <li><span className="check-icon">✓</span> All 30 days of premium content</li>
              <li><span className="check-icon">✓</span> Interactive video lessons</li>
              <li><span className="check-icon">✓</span> Quizzes with explanations</li>
              <li><span className="check-icon">✓</span> Practical trading tasks</li>
              <li><span className="check-icon">✓</span> Official certificate of completion</li>
              <li><span className="check-icon">✓</span> Free trading journal access</li>
              <li><span className="check-icon">✓</span> 25-30% affiliate commission</li>
              <li><span className="check-icon">✓</span> Use on 2 devices</li>
              <li><span className="check-icon">✓</span> 3-day money-back guarantee</li>
            </ul>
            
            <button className="btn-checkout" onClick={goToRegister}>
              <span>🚀 Start Challenge Now</span>
            </button>
            
            <p style={{ marginTop: '15px', fontSize: '0.9em', color: '#64748b' }}>
              Secure payment via Stripe • Instant access after payment
            </p>
          </div>
        </div>
      </section>

      {/* Affiliate Banner */}
      <section className="affiliate-banner">
        <div className="affiliate-content">
          <h2>💰 Earn Money Sharing Market Warrior</h2>
          <p>No purchase required! Anyone can become an affiliate and earn commission.</p>
          <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', flexWrap: 'wrap', margin: '20px 0' }}>
            <div className="commission-badge">
              <div className="commission-rate">25%</div>
              <p style={{ margin: 0, color: '#059669', fontWeight: 600 }}>Standard Affiliate</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>$10 per sale • No purchase needed</p>
            </div>
            <div className="commission-badge" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderColor: '#f59e0b' }}>
              <div className="commission-rate" style={{ color: '#d97706' }}>30%</div>
              <p style={{ margin: 0, color: '#d97706', fontWeight: 600 }}>Course Member</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>$12 per sale • After purchasing course</p>
            </div>
          </div>
          <p><Link href="/login?affiliate=true" style={{ color: '#059669', fontWeight: 600 }}>Sign up as affiliate</Link> to get your referral link. Automatic payouts via Stripe.</p>
        </div>
      </section>

      {/* Free Journal Banner */}
      <section className="journal-banner">
        <h2>📊 Try Our Free Trading Journal</h2>
        <p>Track your demo trades, analyze performance, and build good habits - completely free!</p>
        <Link href="/journal" className="btn-journal">Open Free Journal →</Link>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq">
        <div className="section-container">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-item active">
              <div className="faq-question" onClick={toggleFaq}>Is this suitable for complete beginners?</div>
              <div className="faq-answer">Absolutely! The challenge is designed specifically for people with zero trading experience. We start from the very basics and build up gradually over 30 days.</div>
            </div>
            <div className="faq-item">
              <div className="faq-question" onClick={toggleFaq}>Do I need real money to trade?</div>
              <div className="faq-answer">No! We strongly recommend using only demo/virtual accounts during the entire challenge. You'll learn with fake money until you're consistently profitable. Never risk real money while learning.</div>
            </div>
            <div className="faq-item">
              <div className="faq-question" onClick={toggleFaq}>How long do I have access?</div>
              <div className="faq-answer">You have 120 days (4 months) of platform access from your purchase date. Your certificate is yours forever once earned.</div>
            </div>
            <div className="faq-item">
              <div className="faq-question" onClick={toggleFaq}>What if I miss a day?</div>
              <div className="faq-answer">No problem! Days unlock automatically every 24 hours, but you can complete them at your own pace within your 120-day access period. You must pass each quiz (60%+) to proceed.</div>
            </div>
            <div className="faq-item">
              <div className="faq-question" onClick={toggleFaq}>Can I get a refund?</div>
              <div className="faq-answer">Yes! We offer a 3-day money-back guarantee. If you're not satisfied within 72 hours of purchase, contact support for a full refund, no questions asked.</div>
            </div>
            <div className="faq-item">
              <div className="faq-question" onClick={toggleFaq}>How does the affiliate program work?</div>
              <div className="faq-answer">Anyone can join our affiliate program - no purchase required! Sign up free and get your unique link. Standard affiliates earn 25% ($10) per sale. Complete the course and upgrade to Graduate status for 30% ($12) per sale. Payouts are automatic via Stripe.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="section-container">
          <p>© 2025 Market Warrior. All rights reserved.</p>
          <div className="footer-links">
            <Link href="/terms" className="footer-link">Terms & Conditions</Link>
            <Link href="/privacy" className="footer-link">Privacy Policy</Link>
            <Link href="/journal" className="footer-link">Free Journal</Link>
          </div>
          <p style={{ marginTop: '20px', fontSize: '0.85em' }}>
            ⚠️ Trading involves risk. This is educational content only, not financial advice. Always practice with demo accounts first.
          </p>
        </div>
      </footer>
    </>
  );
}
