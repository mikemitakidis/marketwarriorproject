import Head from 'next/head';
import Link from 'next/link';

/**
 * Landing page - Market Warrior Trading Challenge
 *
 * Fully functional React component with proper styling.
 * No template dependencies.
 */
export default function LandingPage() {
  return (
    <>
      <Head>
        <title>Market Warrior - 30-Day Trading Challenge</title>
        <meta name="description" content="Transform from trading novice to confident market warrior in just 30 days. Daily lessons, quizzes, and hands-on practice." />
        <link rel="icon" type="image/png" href="/logo.png" />
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0f172a;
          color: white;
        }
      `}</style>

      <style jsx>{`
        /* Navigation */
        .nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          padding: 16px 24px;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255,255,255,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.5rem;
          font-weight: 700;
          color: #667eea;
          text-decoration: none;
        }
        .nav-logo img { width: 40px; height: 40px; border-radius: 8px; }
        .nav-links { display: flex; gap: 24px; align-items: center; }
        .nav-links a { color: #94a3b8; text-decoration: none; transition: color 0.2s; }
        .nav-links a:hover { color: white; }
        .nav-btn {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 10px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .nav-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4); }

        /* Hero Section */
        .hero {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 120px 24px 80px;
          background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
          position: relative;
          overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse at center, rgba(102, 126, 234, 0.15) 0%, transparent 70%);
        }
        .hero-content { position: relative; max-width: 900px; }
        .hero-badge {
          display: inline-block;
          background: rgba(102, 126, 234, 0.2);
          color: #667eea;
          padding: 8px 20px;
          border-radius: 50px;
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 24px;
          border: 1px solid rgba(102, 126, 234, 0.3);
        }
        .hero h1 {
          font-size: clamp(2.5rem, 6vw, 4rem);
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 24px;
          background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero p {
          font-size: 1.25rem;
          color: #94a3b8;
          max-width: 600px;
          margin: 0 auto 40px;
          line-height: 1.6;
        }
        .hero-buttons { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
        .btn-primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 16px 40px;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.3s;
          border: none;
          cursor: pointer;
        }
        .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 20px 40px rgba(102, 126, 234, 0.4); }
        .btn-secondary {
          background: transparent;
          color: white;
          padding: 16px 40px;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          text-decoration: none;
          border: 2px solid #334155;
          transition: all 0.3s;
        }
        .btn-secondary:hover { border-color: #667eea; background: rgba(102, 126, 234, 0.1); }
        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 48px;
          margin-top: 60px;
          flex-wrap: wrap;
        }
        .stat { text-align: center; }
        .stat-value { font-size: 2.5rem; font-weight: 800; color: #667eea; }
        .stat-label { color: #64748b; margin-top: 4px; }

        /* Features Section */
        .features {
          padding: 100px 24px;
          background: #1e293b;
        }
        .section-title {
          text-align: center;
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 16px;
        }
        .section-subtitle {
          text-align: center;
          color: #94a3b8;
          max-width: 600px;
          margin: 0 auto 60px;
          font-size: 1.1rem;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 32px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .feature-card {
          background: #0f172a;
          padding: 32px;
          border-radius: 20px;
          border: 1px solid #334155;
          transition: all 0.3s;
        }
        .feature-card:hover { border-color: #667eea; transform: translateY(-5px); }
        .feature-icon { font-size: 3rem; margin-bottom: 20px; }
        .feature-card h3 { font-size: 1.5rem; margin-bottom: 12px; }
        .feature-card p { color: #94a3b8; line-height: 1.6; }

        /* Curriculum Section */
        .curriculum {
          padding: 100px 24px;
          background: #0f172a;
        }
        .phases-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .phase-card {
          background: linear-gradient(135deg, #1e293b, #0f172a);
          padding: 32px;
          border-radius: 20px;
          border: 1px solid #334155;
        }
        .phase-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
        .phase-number {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.25rem;
        }
        .phase-card h3 { font-size: 1.25rem; }
        .phase-card ul { list-style: none; }
        .phase-card li { padding: 8px 0; color: #94a3b8; display: flex; align-items: center; gap: 10px; }
        .phase-card li::before { content: '✓'; color: #22c55e; }

        /* Pricing Section */
        .pricing {
          padding: 100px 24px;
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
        }
        .price-card {
          max-width: 500px;
          margin: 0 auto;
          background: linear-gradient(135deg, #667eea, #764ba2);
          padding: 48px;
          border-radius: 30px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .price-card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
        }
        .price-badge {
          display: inline-block;
          background: rgba(255,255,255,0.2);
          padding: 8px 20px;
          border-radius: 50px;
          font-size: 0.9rem;
          margin-bottom: 24px;
        }
        .price-amount { font-size: 4rem; font-weight: 800; margin-bottom: 8px; }
        .price-period { opacity: 0.9; margin-bottom: 32px; }
        .price-features { text-align: left; margin-bottom: 32px; list-style: none; }
        .price-features li {
          padding: 12px 0;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .price-features li:last-child { border-bottom: none; }
        .price-btn {
          width: 100%;
          padding: 18px;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 12px;
          font-size: 1.2rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          text-decoration: none;
          display: block;
        }
        .price-btn:hover { transform: scale(1.02); }
        .guarantee {
          margin-top: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          opacity: 0.9;
        }

        /* Testimonials */
        .testimonials {
          padding: 100px 24px;
          background: #0f172a;
        }
        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .testimonial-card {
          background: #1e293b;
          padding: 32px;
          border-radius: 20px;
          border: 1px solid #334155;
        }
        .testimonial-text { font-style: italic; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px; }
        .testimonial-author { display: flex; align-items: center; gap: 12px; }
        .testimonial-avatar {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }
        .testimonial-name { font-weight: 600; }
        .testimonial-role { color: #64748b; font-size: 0.9rem; }

        /* CTA Section */
        .cta {
          padding: 100px 24px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          text-align: center;
        }
        .cta h2 { font-size: 2.5rem; margin-bottom: 16px; }
        .cta p { opacity: 0.9; max-width: 500px; margin: 0 auto 32px; font-size: 1.1rem; }
        .cta-btn {
          background: white;
          color: #667eea;
          padding: 18px 48px;
          border-radius: 12px;
          font-size: 1.2rem;
          font-weight: 700;
          text-decoration: none;
          display: inline-block;
          transition: all 0.3s;
        }
        .cta-btn:hover { transform: translateY(-3px); box-shadow: 0 20px 40px rgba(0,0,0,0.3); }

        /* Footer */
        .footer {
          padding: 60px 24px 30px;
          background: #0f172a;
          border-top: 1px solid #1e293b;
        }
        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 40px;
        }
        .footer-brand h3 { font-size: 1.5rem; color: #667eea; margin-bottom: 12px; }
        .footer-brand p { color: #64748b; line-height: 1.6; }
        .footer-links h4 { font-size: 1rem; margin-bottom: 16px; color: #94a3b8; }
        .footer-links a { display: block; color: #64748b; text-decoration: none; padding: 6px 0; transition: color 0.2s; }
        .footer-links a:hover { color: #667eea; }
        .footer-bottom {
          text-align: center;
          padding-top: 40px;
          margin-top: 40px;
          border-top: 1px solid #1e293b;
          color: #64748b;
          font-size: 0.9rem;
        }

        @media (max-width: 768px) {
          .nav-links { display: none; }
          .hero-stats { gap: 24px; }
          .stat-value { font-size: 2rem; }
        }
      `}</style>

      {/* Navigation */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          <img src="/logo.png" alt="" onError={(e) => e.target.style.display = 'none'} />
          Market Warrior
        </a>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#curriculum">Curriculum</a>
          <a href="#pricing">Pricing</a>
          <Link href="/login" className="nav-btn">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <span className="hero-badge">🚀 Transform Your Trading in 30 Days</span>
          <h1>Become a Confident Trader with Our Proven System</h1>
          <p>Join thousands of aspiring traders who have transformed their skills with our structured 30-day challenge. Daily lessons, quizzes, and hands-on practice.</p>
          <div className="hero-buttons">
            <Link href="/login?register=true" className="btn-primary">Start Your Journey</Link>
            <a href="#curriculum" className="btn-secondary">View Curriculum</a>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <div className="stat-value">30</div>
              <div className="stat-label">Daily Lessons</div>
            </div>
            <div className="stat">
              <div className="stat-value">100+</div>
              <div className="stat-label">Quiz Questions</div>
            </div>
            <div className="stat">
              <div className="stat-value">120</div>
              <div className="stat-label">Days Access</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <h2 className="section-title">Everything You Need to Succeed</h2>
        <p className="section-subtitle">Our comprehensive program covers all aspects of trading, from basics to advanced strategies.</p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📚</div>
            <h3>Daily Lessons</h3>
            <p>Structured content delivered every day, covering everything from market basics to advanced technical analysis.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">✅</div>
            <h3>Interactive Quizzes</h3>
            <p>Test your knowledge with quizzes after each lesson. Track your progress and identify areas for improvement.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Practical Tasks</h3>
            <p>Apply what you learn with hands-on tasks designed to build real trading skills in a risk-free environment.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📓</div>
            <h3>Trading Journal</h3>
            <p>Track your trades, analyze your decisions, and improve your strategy with our built-in trading journal.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>Community Forum</h3>
            <p>Connect with fellow traders, share insights, ask questions, and learn from each other's experiences.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏆</div>
            <h3>Certificate</h3>
            <p>Earn a personalized certificate upon completion to showcase your achievement and commitment to trading.</p>
          </div>
        </div>
      </section>

      {/* Curriculum Section */}
      <section className="curriculum" id="curriculum">
        <h2 className="section-title">30-Day Curriculum</h2>
        <p className="section-subtitle">A carefully structured journey from beginner to confident trader.</p>
        <div className="phases-grid">
          <div className="phase-card">
            <div className="phase-header">
              <div className="phase-number">1</div>
              <h3>Trading Foundations</h3>
            </div>
            <p style={{color: '#64748b', marginBottom: '16px'}}>Days 1-7</p>
            <ul>
              <li>Understanding financial markets</li>
              <li>Setting up your demo account</li>
              <li>Reading price charts</li>
              <li>Introduction to candlesticks</li>
            </ul>
          </div>
          <div className="phase-card">
            <div className="phase-header">
              <div className="phase-number">2</div>
              <h3>Technical Analysis</h3>
            </div>
            <p style={{color: '#64748b', marginBottom: '16px'}}>Days 8-14</p>
            <ul>
              <li>Support and resistance</li>
              <li>Trend identification</li>
              <li>Key chart patterns</li>
              <li>Technical indicators</li>
            </ul>
          </div>
          <div className="phase-card">
            <div className="phase-header">
              <div className="phase-number">3</div>
              <h3>Advanced Strategies</h3>
            </div>
            <p style={{color: '#64748b', marginBottom: '16px'}}>Days 15-21</p>
            <ul>
              <li>Entry and exit strategies</li>
              <li>Multiple timeframe analysis</li>
              <li>Building a trading plan</li>
              <li>Backtesting strategies</li>
            </ul>
          </div>
          <div className="phase-card">
            <div className="phase-header">
              <div className="phase-number">4</div>
              <h3>Risk Management</h3>
            </div>
            <p style={{color: '#64748b', marginBottom: '16px'}}>Days 22-28</p>
            <ul>
              <li>Position sizing</li>
              <li>Stop-loss strategies</li>
              <li>Risk-reward ratios</li>
              <li>Portfolio management</li>
            </ul>
          </div>
          <div className="phase-card">
            <div className="phase-header">
              <div className="phase-number">5</div>
              <h3>Final Challenge</h3>
            </div>
            <p style={{color: '#64748b', marginBottom: '16px'}}>Days 29-30</p>
            <ul>
              <li>Complete trading simulation</li>
              <li>Final assessment</li>
              <li>Certificate of completion</li>
              <li>Next steps guidance</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing" id="pricing">
        <h2 className="section-title">Simple, Transparent Pricing</h2>
        <p className="section-subtitle">One-time payment, lifetime value. No subscriptions, no hidden fees.</p>
        <div className="price-card">
          <span className="price-badge">Most Popular</span>
          <div className="price-amount">$39.99</div>
          <div className="price-period">One-time payment</div>
          <ul className="price-features">
            <li><span>✓</span> Full 30-day trading challenge</li>
            <li><span>✓</span> 120 days of platform access</li>
            <li><span>✓</span> Interactive quizzes & tasks</li>
            <li><span>✓</span> Trading journal access</li>
            <li><span>✓</span> Community forum access</li>
            <li><span>✓</span> Certificate of completion</li>
          </ul>
          <Link href="/login?register=true" className="price-btn">Get Started Now</Link>
          <div className="guarantee">
            <span>🛡️</span>
            <span>3-day money-back guarantee</span>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials">
        <h2 className="section-title">What Our Warriors Say</h2>
        <p className="section-subtitle">Join thousands of traders who have transformed their skills.</p>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <p className="testimonial-text">"This challenge completely changed how I approach trading. The structured daily lessons made complex concepts easy to understand."</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">JD</div>
              <div>
                <div className="testimonial-name">James D.</div>
                <div className="testimonial-role">Day Trader</div>
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-text">"The trading journal feature is invaluable. I can finally track my progress and see where I need to improve."</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">SM</div>
              <div>
                <div className="testimonial-name">Sarah M.</div>
                <div className="testimonial-role">Swing Trader</div>
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-text">"Worth every penny! The quizzes really helped reinforce the concepts. I feel much more confident now."</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">RK</div>
              <div>
                <div className="testimonial-name">Robert K.</div>
                <div className="testimonial-role">Beginner Trader</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <h2>Ready to Transform Your Trading?</h2>
        <p>Join the Market Warrior challenge today and take the first step towards becoming a confident trader.</p>
        <Link href="/login?register=true" className="cta-btn">Start Your 30-Day Challenge</Link>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>Market Warrior</h3>
            <p>Empowering traders with knowledge, skills, and confidence since 2024.</p>
          </div>
          <div className="footer-links">
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#curriculum">Curriculum</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="footer-links">
            <h4>Legal</h4>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </div>
          <div className="footer-links">
            <h4>Support</h4>
            <a href="mailto:support@marketwarrior.club">Contact Us</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Market Warrior. All rights reserved.</p>
          <p style={{marginTop: '8px', fontSize: '0.8rem'}}>Trading involves risk. This is education only, not financial advice.</p>
        </div>
      </footer>
    </>
  );
}
