import { useState } from 'react';
import logger from '../lib/logger';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getUserFromRequest, getGateStatus } from '../lib/serverAuth';

/**
 * Welcome / Onboarding page.
 *
 * Users land here after payment to enter their name and accept terms
 * before accessing the dashboard. This is a required step in the flow:
 * Register -> Confirm Email -> Payment -> Welcome -> Dashboard
 *
 * Once completed, terms acceptance persists in user_profiles and the user
 * is never shown this page again (redirected to dashboard).
 */
export async function getServerSideProps({ req }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return { redirect: { destination: '/login', permanent: false } };
    }

    const gate = await getGateStatus(user.id);

    // If not paid, redirect to payment
    if (!gate.hasPaid) {
      return { redirect: { destination: '/pay', permanent: false } };
    }

    // If already completed welcome (terms accepted), go to dashboard
    if (gate.welcomeCompleted) {
      return { redirect: { destination: '/dashboard', permanent: false } };
    }

    return { props: { userEmail: user.email } };
  } catch (err) {
    logger.error('Welcome SSR error:', err);
    return { redirect: { destination: '/login', permanent: false } };
  }
}

export default function WelcomePage({ userEmail }) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [agreements, setAgreements] = useState({
    terms: false,
    education: false,
    namePermanent: false,
    accessPeriod: false,
    risk: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const allAgreed = Object.values(agreements).every(Boolean) && fullName.trim().length >= 2;

  const handleCheckbox = (key) => {
    setAgreements((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    if (!allAgreed) return;

    const confirmed = window.confirm(
      `Confirm your name: "${fullName.trim()}"\n\n` +
      `This will appear on your certificate and CANNOT be changed later.\n\n` +
      `Is this correct?`
    );

    if (!confirmed) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/welcome/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: fullName.trim(),
          agreements: {
            agree1: agreements.terms,
            agree2: agreements.education,
            agree3: agreements.namePermanent,
            agree4: agreements.accessPeriod,
            agree5: agreements.risk,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      router.push(data.next || '/dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Welcome to Market Warrior Challenge</title>
        <link rel="icon" type="image/png" href="/logo.png" />
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 40px 20px;
        }
      `}</style>

      <style jsx>{`
        .container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 30px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.3);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 50px 40px;
          text-align: center;
        }
        .logo { font-size: 80px; margin-bottom: 20px; }
        h1 { font-size: 2.5em; margin-bottom: 15px; }
        .subtitle { font-size: 1.2em; opacity: 0.95; }
        .content { padding: 50px 40px; }

        /* Intro Section */
        .intro-section {
          background: linear-gradient(135deg, #e0f2fe, #bae6fd);
          padding: 30px;
          border-radius: 20px;
          margin-bottom: 30px;
          border-left: 5px solid #0284c7;
        }
        .intro-section h2 { color: #0369a1; margin-bottom: 15px; font-size: 1.5em; }
        .intro-section p { color: #075985; line-height: 1.8; margin-bottom: 15px; }
        .intro-section strong { color: #0c4a6e; }

        /* Instructions Section */
        .instructions-section {
          background: #f8fafc;
          padding: 30px;
          border-radius: 20px;
          margin-bottom: 30px;
        }
        .instructions-section h2 { color: #1e293b; margin-bottom: 20px; font-size: 1.5em; }
        .instructions-section h3 { color: #667eea; margin: 20px 0 10px; font-size: 1.2em; }
        .instructions-section p { color: #475569; line-height: 1.8; margin-bottom: 10px; }
        .instructions-section ul { margin: 10px 0 20px 20px; }
        .instructions-section li { color: #475569; line-height: 1.8; margin-bottom: 8px; }

        /* Rewards Section */
        .rewards-section {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 30px;
          border-radius: 20px;
          margin-bottom: 30px;
          border-left: 5px solid #fbbf24;
        }
        .rewards-section h2 { color: #92400e; margin-bottom: 15px; font-size: 1.5em; }
        .rewards-section h3 { color: #78350f; margin: 15px 0 10px; font-size: 1.1em; }
        .rewards-section p { color: #78350f; line-height: 1.8; margin-bottom: 10px; }
        .rewards-section ul { margin: 10px 0 15px 20px; }
        .rewards-section li { color: #78350f; line-height: 1.8; margin-bottom: 8px; }

        /* Disclaimer Section */
        .disclaimer-section {
          background: #fef2f2;
          padding: 30px;
          border-radius: 20px;
          margin-bottom: 30px;
          border-left: 5px solid #ef4444;
        }
        .disclaimer-section h2 { color: #991b1b; margin-bottom: 15px; font-size: 1.3em; }
        .disclaimer-section h3 { color: #b91c1c; margin: 15px 0 10px; font-size: 1.1em; }
        .disclaimer-section p { color: #7f1d1d; line-height: 1.8; margin-bottom: 10px; font-size: 0.95em; }

        .divider {
          border: none;
          border-top: 2px solid #e2e8f0;
          margin: 30px 0;
        }

        .welcome-message {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 30px;
          border-radius: 20px;
          margin-bottom: 40px;
          border-left: 5px solid #fbbf24;
        }
        .welcome-message h2 { color: #92400e; margin-bottom: 15px; }
        .welcome-message p { color: #78350f; line-height: 1.8; }
        .name-section {
          background: #f8fafc;
          padding: 30px;
          border-radius: 20px;
          margin-bottom: 40px;
        }
        .name-section h3 { color: #1e293b; margin-bottom: 20px; }
        .name-input input {
          width: 100%;
          padding: 15px 20px;
          border: 2px solid #cbd5e1;
          border-radius: 10px;
          font-size: 1.1em;
          margin-top: 10px;
        }
        .name-input input:focus { outline: none; border-color: #667eea; }
        .warning-box {
          background: #fee2e2;
          border: 2px solid #ef4444;
          padding: 20px;
          border-radius: 15px;
          margin-top: 20px;
        }
        .warning-box strong { color: #991b1b; }
        .terms-section { margin: 40px 0; }
        .terms-section h3 { color: #1e293b; margin-bottom: 25px; font-size: 1.8em; }
        .term-item {
          background: white;
          border: 2px solid #e2e8f0;
          padding: 25px;
          border-radius: 15px;
          margin-bottom: 20px;
        }
        .term-item h4 { color: #667eea; margin-bottom: 15px; font-size: 1.3em; }
        .term-item ul { list-style: none; padding-left: 0; }
        .term-item li {
          padding: 8px 0 8px 25px;
          position: relative;
          color: #475569;
          line-height: 1.6;
        }
        .term-item li:before {
          content: "•";
          position: absolute;
          left: 5px;
          color: #667eea;
          font-weight: 700;
        }
        .highlight {
          background: #fef3c7;
          padding: 3px 8px;
          border-radius: 5px;
          font-weight: 600;
          color: #92400e;
        }
        .agreement-section {
          background: #f8fafc;
          padding: 30px;
          border-radius: 20px;
          margin: 40px 0;
        }
        .agreement-section h3 { color: #1e293b; margin-bottom: 25px; }
        .checkbox-item {
          padding: 15px;
          margin: 15px 0;
          background: white;
          border-radius: 10px;
          display: flex;
          align-items: flex-start;
          gap: 15px;
          border: 2px solid #e2e8f0;
          transition: all 0.3s;
          cursor: pointer;
        }
        .checkbox-item:hover { border-color: #667eea; }
        .checkbox-item input[type="checkbox"] {
          width: 24px;
          height: 24px;
          margin-top: 3px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .checkbox-item label {
          flex: 1;
          cursor: pointer;
          color: #475569;
          line-height: 1.6;
        }
        .start-button {
          width: 100%;
          padding: 20px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 15px;
          font-size: 1.3em;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 30px;
        }
        .start-button:hover:not(:disabled) {
          background: #5568d3;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }
        .start-button:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }
        .error-message {
          background: #fee2e2;
          color: #dc2626;
          padding: 15px;
          border-radius: 10px;
          margin-top: 20px;
          text-align: center;
        }
        @media (max-width: 768px) {
          .content { padding: 30px 20px; }
          h1 { font-size: 2em; }
        }
      `}</style>

      <div className="container">
        <div className="header">
          <div className="logo">🎉</div>
          <h1>Welcome, Market Warrior!</h1>
          <p className="subtitle">Your trading journey starts here</p>
        </div>

        <div className="content">
          {/* Intro Section */}
          <div className="intro-section">
            <h2>Welcome to the Market Warrior 30-Day Trading Challenge</h2>
            <p><strong>Your ultimate, well-structured 30-day, hands-on journey, designed for beginners, that turns trading curiosity into powerful market expertise!</strong></p>
            <p><strong>Every single day is a new victory!</strong> You will unlock engaging, power-packed modules filled with essential trading insights, practical assignments, real-world examples, and interactive quizzes designed to accelerate your progress.</p>
            <p>We have simplified the path to trading mastery - guiding you step-by-step from opening your no-risk demo account, mastering chart patterns, and controlling risk, to understanding global market dynamics and crafting your own winning trading strategy.</p>
            <p>No fluff, no confusion—just straightforward, actionable tasks that rapidly build your skills, confidence, and market knowledge. Each daily achievement brings you closer to becoming a disciplined, insightful, and profitable trader.</p>
            <p>If you're ready to beat the markets, create powerful trading habits, and discover what you're truly capable of, this is your ideal starting point.</p>
            <p><strong>Your transformation into a Market Warrior starts today!</strong></p>
          </div>

          {/* Challenge Instructions */}
          <div className="instructions-section">
            <h2>Challenge Instructions</h2>
            <p><strong>Welcome, future Market Warrior!</strong> Here's how you'll maximise your journey through this transformative 30-day challenge and forge your path to trading mastery:</p>

            <h3>Your Daily Mission Briefing:</h3>
            <p>Each day, your dedicated Market Warrior dashboard will unlock your day's Power-Packed Module. This isn't just theory – it's a strategic blend of:</p>
            <ul>
              <li><strong>Core Concept Breakdowns:</strong> Clear, concise explanations of the day's essential trading principles.</li>
              <li><strong>Actionable Examples:</strong> Real-world scenarios that bring concepts to life and show you exactly how to apply them.</li>
              <li><strong>Hands-On Daily Tasks:</strong> Practical exercises designed to immediately cement your learning. These are crucial for building muscle memory and confidence!</li>
              <li><strong>Interactive Quizzes:</strong> Quick, engaging checks to ensure you've absorbed the key takeaways and are ready for the next step.</li>
            </ul>

            <h3>Mastering Your Progress:</h3>
            <ul>
              <li><strong>Dedicated Learning Hub:</strong> All your daily modules, resources, and progress tracking will be accessible through your personalised Market Warrior portal. Learn at your own pace, but aim to complete daily to build consistent habits.</li>
              <li><strong>No-Risk Practice Ground:</strong> From Day 1, you'll be guided to set up and utilise a risk-free demo trading account. This is your essential sandbox – practice every strategy, make mistakes, and build confidence without risking a single penny of real capital.</li>
              <li><strong>The Power of Journaling:</strong> We'll show you exactly how to maintain a comprehensive trading journal. This isn't just note-taking, it's your data scientist, revealing patterns in your trades, identifying emotional triggers, and accelerating your improvement.</li>
              <li><strong>Community Access:</strong> Connect, share insights, and get support from fellow Market Warriors in our exclusive Market Warrior Community. Learn from others, celebrate successes, and never feel alone on your journey.</li>
            </ul>

            <h3>What You'll Need to Succeed:</h3>
            <ul>
              <li><strong>A Computer/Tablet/Mobile with Internet Access:</strong> Your portal and trading platforms are online.</li>
              <li><strong>Around 30-50 Minutes Per Day:</strong> This challenge is designed for daily engagement. Consistency is your secret weapon! While you can flex your learning time, aim to tackle each day's module and task to build momentum.</li>
              <li><strong>A Commitment to Learn and Grow:</strong> Bring your ambition, your discipline, and your readiness to transform. We provide the map; you walk the path.</li>
            </ul>
          </div>

          {/* Rewards Section */}
          <div className="rewards-section">
            <h2>Rewards & Recognition</h2>
            <p>Your dedication doesn't go unnoticed. The Market Warrior Challenge is designed to transform your trading skills, and we believe in celebrating every step of that journey. Here's what awaits you:</p>

            <h3>The Ultimate Reward: True Trading Confidence & Skill</h3>
            <p>The greatest reward is the profound confidence you'll gain in your ability to analyse markets, strategise trades, and manage risk. You'll finish with a solid, actionable trading plan and the discipline to execute it, setting you up for long-term success. This is a skillset that stays with you forever.</p>

            <h3>Official Certificate of Completion</h3>
            <p>Upon completing all 30 days of the Market Warrior Challenge, you'll receive a personalised Certificate of Completion. This is a testament to your commitment, your perseverance, and the comprehensive trading foundation you've built. Proudly display your achievement – it's a mark of a true Market Warrior!</p>

            <h3>Ongoing Growth & Support</h3>
            <p>Your journey doesn't end on Day 30. As a Market Warrior, you'll gain access to our exclusive community, a vibrant hub where learning never stops. Here, you'll discover:</p>
            <ul>
              <li>New strategies and advanced insights directly from experienced traders.</li>
              <li>Real-time market discussions and analysis.</li>
              <li>A supportive network to share ideas, celebrate wins, and navigate challenges together.</li>
            </ul>
            <p>We're committed to your sustained success, continuously providing value as you evolve in your trading career.</p>
          </div>

          {/* Name Section */}
          <div className="name-section">
            <h3>📝 Enter Your Full Name</h3>
            <p>This name will appear on your Certificate of Completion at the end of the challenge.</p>
            <div className="name-input">
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="warning-box">
              <strong>⚠️ IMPORTANT:</strong> Your name cannot be changed later. Make sure it's spelled correctly!
            </div>
          </div>

          <hr className="divider" />

          {/* Disclaimer Section */}
          <div className="disclaimer-section">
            <h2>📌 Disclaimer</h2>
            <p>The Market Warrior Challenge is designed exclusively for educational and informational purposes. It aims to enhance your understanding of trading strategies, financial markets, risk management, and analytical methods.</p>

            <h3>⚠️ Important Notices:</h3>
            <p><strong>Virtual Trading Only:</strong> All trading activities and tasks within the Market Warrior Challenge must be executed with virtual (demo) funds. The challenge explicitly does not recommend or encourage the use of real money.</p>
            <p><strong>Educational Purpose Only:</strong> The content provided—including examples, tasks, quizzes, and other educational materials—should not be interpreted as financial advice, trading recommendations, or investment guidance.</p>
            <p><strong>Risk Disclosure:</strong> Trading financial markets involves substantial risk and can result in significant financial loss. Even virtual trading simulations cannot fully replicate the emotional and financial consequences of real trading.</p>
            <p><strong>Personal Responsibility:</strong> Participants acknowledge that all decisions and outcomes in real trading scenarios remain their sole responsibility. Always consult a professional financial advisor before making decisions involving real money.</p>

            <h3>⚠️ General Information & Independence Notice</h3>
            <p>The material provided through the Market Warrior Challenge is for general information purposes only. It does not take into account your personal circumstances or objectives. Nothing within this material is (or should be considered to be) financial, investment, or other advice on which reliance should be placed.</p>
            <p>No opinion expressed in this material constitutes a recommendation by Market Warrior or the author that any particular investment, security, transaction, or investment strategy is suitable for any specific individual.</p>
            <p>This material has not been prepared under legal requirements designed to promote the independence of investment research.</p>
          </div>

          <hr className="divider" />

          {/* Terms Section */}
          <div className="terms-section">
            <h3>📋 Terms & Conditions</h3>
            <p style={{ marginBottom: '20px', color: '#64748b' }}>Please read carefully before proceeding</p>

            <div className="term-item">
              <h4>1. Virtual Trading Recommendation</h4>
              <p>We <strong>strongly recommend</strong> using only <span className="highlight">demo/virtual accounts</span> during this challenge.</p>
              <ul>
                <li>All lessons are designed for demo account practice</li>
                <li>Never risk real money until you're ready</li>
                <li>We are not responsible for any trading losses</li>
                <li>This is education, not financial advice</li>
              </ul>
            </div>

            <div className="term-item">
              <h4>2. 3-Day Refund Policy</h4>
              <p>You have <span className="highlight">3 days from purchase</span> to request a full refund, no questions asked.</p>
              <ul>
                <li>Refund requests must be made within 72 hours</li>
                <li>After 3 days, all sales are final</li>
                <li>Contact support@marketwarrior.club for refunds</li>
              </ul>
            </div>

            <div className="term-item">
              <h4>3. 120-Day Access Period</h4>
              <p>You have <span className="highlight">120 days (4 months)</span> of platform access starting from today.</p>
              <ul>
                <li>Access starts from payment date</li>
                <li>Complete the 30-day challenge at your own pace</li>
                <li>Certificate remains valid forever</li>
              </ul>
            </div>

            <div className="term-item">
              <h4>4. Risk Disclosure</h4>
              <p>Trading and investing carry significant risk.</p>
              <ul>
                <li>You can lose 100% of your investment</li>
                <li>Only trade with money you can afford to lose</li>
                <li>No guarantees of profit or success</li>
              </ul>
            </div>
          </div>

          {/* Agreement Section */}
          <div className="agreement-section">
            <h3>✅ I Agree To:</h3>

            <div className="checkbox-item" onClick={() => handleCheckbox('terms')}>
              <input type="checkbox" checked={agreements.terms} onChange={() => {}} />
              <label>I have read and agree to all Terms & Conditions above</label>
            </div>

            <div className="checkbox-item" onClick={() => handleCheckbox('education')}>
              <input type="checkbox" checked={agreements.education} onChange={() => {}} />
              <label>I understand this is education only, not financial advice, and I will use demo accounts</label>
            </div>

            <div className="checkbox-item" onClick={() => handleCheckbox('namePermanent')}>
              <input type="checkbox" checked={agreements.namePermanent} onChange={() => {}} />
              <label>I understand my name is permanent and cannot be changed after submission</label>
            </div>

            <div className="checkbox-item" onClick={() => handleCheckbox('accessPeriod')}>
              <input type="checkbox" checked={agreements.accessPeriod} onChange={() => {}} />
              <label>I understand I have 120 days of access and 3 days for refunds</label>
            </div>

            <div className="checkbox-item" onClick={() => handleCheckbox('risk')}>
              <input type="checkbox" checked={agreements.risk} onChange={() => {}} />
              <label>I understand trading involves risk and I may lose money</label>
            </div>

            <p style={{ marginTop: '20px', color: '#64748b', fontSize: '0.95em' }}>
              By engaging with the Market Warrior Challenge, you confirm acceptance and agreement to these conditions. Always prioritise education, responsible learning, and disciplined trading practices.
            </p>
            <p style={{ marginTop: '10px', color: '#667eea', fontWeight: '600' }}>
              Enjoy your journey and happy learning!
            </p>
          </div>

          <button
            className="start-button"
            disabled={!allAgreed || loading}
            onClick={handleSubmit}
          >
            {loading ? 'Saving...' : '🚀 Start My Challenge'}
          </button>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    </>
  );
}
