import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-emerald-500">Market Warrior</h1>
          <div className="flex gap-4">
            <Link href="/login" className="text-gray-300 hover:text-white transition">
              Login
            </Link>
            <Link href="/register" className="btn-primary py-2 px-4">
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">
            Master Trading in <span className="text-emerald-500">30 Days</span>
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Transform from beginner to confident trader with our comprehensive daily lessons, 
            quizzes, and practical exercises.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary text-lg py-4 px-8">
              Start Your Journey - $39.99
            </Link>
            <Link href="/register" className="btn-secondary text-lg py-4 px-8">
              Try Free Journal
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">What You'll Get</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="text-4xl mb-4">📚</div>
              <h4 className="text-xl font-semibold mb-2">30 Daily Lessons</h4>
              <p className="text-gray-400">
                Structured curriculum covering everything from basics to advanced strategies
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">✅</div>
              <h4 className="text-xl font-semibold mb-2">Interactive Quizzes</h4>
              <p className="text-gray-400">
                Test your knowledge with quizzes after each lesson (60% to pass)
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">📔</div>
              <h4 className="text-xl font-semibold mb-2">Trading Journal</h4>
              <p className="text-gray-400">
                Track your trades and analyze your performance over time
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">👥</div>
              <h4 className="text-xl font-semibold mb-2">Community Forum</h4>
              <p className="text-gray-400">
                Connect with fellow traders, share insights, and learn together
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">🏆</div>
              <h4 className="text-xl font-semibold mb-2">Certificate</h4>
              <p className="text-gray-400">
                Earn a certificate of completion when you finish all 30 days
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">💰</div>
              <h4 className="text-xl font-semibold mb-2">Affiliate Program</h4>
              <p className="text-gray-400">
                Earn 30% commission by referring friends to Market Warrior
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum Preview */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Course Curriculum</h3>
          <div className="space-y-4">
            <div className="card flex items-center gap-4">
              <span className="text-emerald-500 font-bold text-lg">Week 1</span>
              <span className="text-gray-300">Foundations - Markets, Charts & Candlesticks</span>
            </div>
            <div className="card flex items-center gap-4">
              <span className="text-emerald-500 font-bold text-lg">Week 2</span>
              <span className="text-gray-300">Technical Analysis - Indicators & Patterns</span>
            </div>
            <div className="card flex items-center gap-4">
              <span className="text-emerald-500 font-bold text-lg">Week 3</span>
              <span className="text-gray-300">Strategy - Entries, Exits & Risk Management</span>
            </div>
            <div className="card flex items-center gap-4">
              <span className="text-emerald-500 font-bold text-lg">Week 4</span>
              <span className="text-gray-300">Psychology & Advanced Trading Concepts</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4 bg-gray-900/50">
        <div className="max-w-lg mx-auto">
          <div className="card text-center">
            <h3 className="text-2xl font-bold mb-2">30-Day Trading Challenge</h3>
            <div className="text-5xl font-bold text-emerald-500 my-6">
              $39.99
            </div>
            <p className="text-gray-400 mb-6">One-time payment, lifetime access</p>
            <ul className="text-left space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                30 comprehensive daily lessons
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                Interactive quizzes for each day
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                Full trading journal access
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                Community forum access
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                Certificate of completion
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                Lifetime updates
              </li>
            </ul>
            <Link href="/register" className="btn-primary w-full block text-center">
              Get Started Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500">© 2024 Market Warrior. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="text-gray-500 hover:text-gray-300">Terms</Link>
            <Link href="/privacy" className="text-gray-500 hover:text-gray-300">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
