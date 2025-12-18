'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'

interface QuizQuestion {
  question: string
  options: string[]
  correct: number
}

export default function DayPage() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [userAnswers, setUserAnswers] = useState<number[]>([])
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState(0)
  const [quizPassed, setQuizPassed] = useState(false)
  const [taskText, setTaskText] = useState('')
  const [taskSubmitted, setTaskSubmitted] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const day = Number(params.day)

  useEffect(() => {
    checkAuthAndLoadContent()
  }, [day])

  const checkAuthAndLoadContent = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (!user || !user.has_paid) {
      router.push('/login')
      return
    }

    const start = new Date(user.challenge_start_date).getTime()
    const daysPassed = Math.floor((Date.now() - start) / (24 * 60 * 60 * 1000))
    const maxUnlocked = Math.min(daysPassed + 1, 30)

    if (day > maxUnlocked) {
      alert('This day is not yet unlocked!')
      router.push('/dashboard')
      return
    }

    if (day > 1) {
      const prevScore = user.quiz_scores?.[`day${day-1}`]
      if (prevScore === undefined || prevScore < 60) {
        alert(`Complete Day ${day-1} quiz with 60%+ to unlock Day ${day}`)
        router.push('/dashboard')
        return
      }
    }

    if (user.quiz_scores?.[`day${day}`] !== undefined) {
      setQuizSubmitted(true)
      setQuizScore(user.quiz_scores[`day${day}`])
      setQuizPassed(user.quiz_scores[`day${day}`] >= 60)
    }

    if (user.task_submissions?.[`day${day}`]) {
      setTaskSubmitted(true)
    }

    setAuthorized(true)
    generateQuizQuestions()
    setLoading(false)
  }

  const generateQuizQuestions = () => {
    const questions: QuizQuestion[] = [
      { question: `What is the main focus of Day ${day}?`, options: ["Random trading", "Educational content", "Gambling", "None of these"], correct: 1 },
      { question: "What type of account should beginners use?", options: ["Real money account", "Demo/Virtual account", "Borrowed funds", "No account needed"], correct: 1 },
      { question: "Trading involves:", options: ["Guaranteed profits", "No risk at all", "Risk of loss", "Free money"], correct: 2 },
      { question: "Before trading with real money, you should:", options: ["Just start", "Practice extensively", "Borrow more", "Skip education"], correct: 1 },
      { question: "Risk management is:", options: ["Optional", "Only for experts", "Essential for all traders", "Not important"], correct: 2 }
    ]
    setQuizQuestions(questions)
    setUserAnswers(new Array(questions.length).fill(-1))
  }

  const handleAnswerSelect = (qIndex: number, oIndex: number) => {
    if (quizSubmitted) return
    const newAnswers = [...userAnswers]
    newAnswers[qIndex] = oIndex
    setUserAnswers(newAnswers)
  }

  const submitQuiz = async () => {
    if (userAnswers.includes(-1)) {
      alert('Please answer all questions.')
      return
    }

    let correct = 0
    quizQuestions.forEach((q, i) => {
      if (userAnswers[i] === q.correct) correct++
    })
    const score = Math.round((correct / quizQuestions.length) * 100)

    try {
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day, score, answers: userAnswers })
      })
      const data = await response.json()

      if (data.success) {
        setQuizScore(score)
        setQuizPassed(score >= 60)
        setQuizSubmitted(true)
        alert(data.message)
      } else {
        alert('Error: ' + data.error)
      }
    } catch {
      alert('Error submitting quiz.')
    }
  }

  const submitTask = async () => {
    if (!taskText.trim()) {
      alert('Please enter your response.')
      return
    }

    try {
      const response = await fetch('/api/task/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day, taskData: taskText })
      })
      const data = await response.json()

      if (data.success) {
        setTaskSubmitted(true)
        alert(data.message)
      }
    } catch {
      alert('Error submitting task.')
    }
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5em' }}>Loading Day {day}...</div>
  }

  if (!authorized) return null

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: #f5f7fa; color: #1e293b; }
        .nav-bar { position: fixed; top: 0; left: 0; right: 0; background: linear-gradient(135deg, #667eea, #764ba2); padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; z-index: 1000; }
        .nav-btn { background: rgba(255,255,255,0.2); color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; }
        .nav-btn:hover { background: rgba(255,255,255,0.3); }
        .nav-title { color: white; font-size: 1.2em; font-weight: 700; }
        .container { max-width: 900px; margin: 0 auto; padding: 100px 20px 40px; }
        .day-header { background: white; padding: 40px; border-radius: 20px; text-align: center; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .day-badge { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 10px 25px; border-radius: 25px; font-weight: 700; display: inline-block; margin-bottom: 20px; }
        .section { background: white; padding: 30px; border-radius: 15px; margin-bottom: 25px; box-shadow: 0 5px 20px rgba(0,0,0,0.08); }
        .section h2 { color: #667eea; margin-bottom: 20px; }
        .section p { margin-bottom: 15px; color: #475569; }
        .quiz-section { background: linear-gradient(135deg, #f8fafc, #e2e8f0); border: 2px solid #667eea; }
        .question { background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
        .question h4 { color: #1e293b; margin-bottom: 15px; }
        .option { display: block; padding: 12px 20px; margin: 8px 0; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .option:hover { border-color: #667eea; }
        .option.selected { background: #667eea; color: white; border-color: #667eea; }
        .option.correct { background: #10b981; color: white; border-color: #10b981; }
        .option.incorrect { background: #ef4444; color: white; border-color: #ef4444; }
        .btn { padding: 15px 35px; border: none; border-radius: 10px; font-size: 1.1em; font-weight: 700; cursor: pointer; transition: all 0.3s; }
        .btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
        .btn-primary:hover { transform: translateY(-2px); }
        .btn-success { background: linear-gradient(135deg, #10b981, #059669); color: white; }
        .result-box { padding: 20px; border-radius: 12px; text-align: center; margin-top: 20px; }
        .result-box.passed { background: #d1fae5; border: 2px solid #10b981; }
        .result-box.failed { background: #fee2e2; border: 2px solid #ef4444; }
        .task-textarea { width: 100%; min-height: 150px; padding: 15px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 1em; }
        .task-textarea:focus { outline: none; border-color: #667eea; }
        .completed-badge { background: #10b981; color: white; padding: 8px 20px; border-radius: 20px; font-weight: 600; }
        .progress-bar { width: 100%; height: 10px; background: #e2e8f0; border-radius: 5px; margin: 20px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 5px; }
      `}</style>

      <nav className="nav-bar">
        <a href="/dashboard" className="nav-btn">← Dashboard</a>
        <span className="nav-title">Day {day} of 30</span>
        {quizPassed && day < 30 && <a href={`/days/${day + 1}`} className="nav-btn">Next Day →</a>}
        {quizPassed && day === 30 && <a href="/certificate" className="nav-btn">🎓 Certificate</a>}
        {!quizPassed && <span></span>}
      </nav>

      <div className="container">
        <div className="day-header">
          <span className="day-badge">Day {day}</span>
          <h1 style={{ fontSize: '2em', marginBottom: '10px' }}>Trading Challenge - Day {day}</h1>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${(day / 30) * 100}%` }}></div></div>
          <p style={{ color: '#64748b' }}>{Math.round((day / 30) * 100)}% Complete</p>
        </div>

        <div className="section">
          <h2>📚 Today&apos;s Lesson</h2>
          <p>Welcome to Day {day}! Today you&apos;ll learn important trading concepts.</p>
          <p>Remember: Always practice with a demo account before risking real money.</p>
        </div>

        <div className="section quiz-section">
          <h2>📝 Daily Quiz</h2>
          <p style={{ marginBottom: '25px' }}>Score 60% or higher to unlock the next day.</p>

          {quizQuestions.map((q, qIndex) => (
            <div className="question" key={qIndex}>
              <h4>Q{qIndex + 1}: {q.question}</h4>
              {q.options.map((option, oIndex) => {
                let className = 'option'
                if (quizSubmitted) {
                  if (oIndex === q.correct) className += ' correct'
                  else if (userAnswers[qIndex] === oIndex) className += ' incorrect'
                } else if (userAnswers[qIndex] === oIndex) {
                  className += ' selected'
                }
                return (
                  <label key={oIndex} className={className} onClick={() => handleAnswerSelect(qIndex, oIndex)}>
                    {option}
                  </label>
                )
              })}
            </div>
          ))}

          {!quizSubmitted ? (
            <button className="btn btn-primary" onClick={submitQuiz}>Submit Quiz</button>
          ) : (
            <div className={`result-box ${quizPassed ? 'passed' : 'failed'}`}>
              <h3 style={{ fontSize: '1.5em', marginBottom: '10px' }}>{quizPassed ? '🎉 Passed!' : '😔 Not quite!'}</h3>
              <p>Score: <strong>{quizScore}%</strong></p>
              <p>{quizPassed ? (day < 30 ? `Day ${day + 1} unlocked!` : 'Challenge complete!') : 'You need 60% to pass.'}</p>
            </div>
          )}
        </div>

        <div className="section">
          <h2>✍️ Daily Task</h2>
          {taskSubmitted ? (
            <div style={{ textAlign: 'center', padding: '20px' }}><span className="completed-badge">✓ Task Submitted</span></div>
          ) : (
            <>
              <textarea className="task-textarea" placeholder="Write your response..." value={taskText} onChange={(e) => setTaskText(e.target.value)} />
              <button className="btn btn-success" style={{ marginTop: '15px' }} onClick={submitTask}>Submit Task</button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
          <a href="/dashboard" className="btn btn-primary" style={{ textDecoration: 'none' }}>← Dashboard</a>
          {quizPassed && day < 30 && <a href={`/days/${day + 1}`} className="btn btn-success" style={{ textDecoration: 'none' }}>Day {day + 1} →</a>}
          {quizPassed && day === 30 && <a href="/certificate" className="btn btn-success" style={{ textDecoration: 'none' }}>🎓 Certificate</a>}
        </div>
      </div>
    </>
  )
}
