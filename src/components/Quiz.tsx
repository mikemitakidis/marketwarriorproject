'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QUIZ_PASS_RATE, type QuizQuestion } from '@/lib/types'

interface QuizProps {
  dayNumber: number
  questions: QuizQuestion[]
  previousPassed: boolean
  previousScore?: number | null
}

type AnswerKey = 'A' | 'B' | 'C' | 'D'

export default function Quiz({ dayNumber, questions, previousPassed, previousScore }: QuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerKey>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [passed, setPassed] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // If already passed, show completed state
  if (previousPassed && !submitted) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-emerald-500 mb-2">Quiz Completed!</h3>
        <p className="text-gray-400 mb-4">
          You scored {previousScore}% and passed this quiz.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="btn-secondary text-sm"
        >
          Review Questions
        </button>
      </div>
    )
  }

  const question = questions[currentQuestion]
  const totalQuestions = questions.length
  const answeredCount = Object.keys(answers).length
  const passThreshold = Math.ceil(totalQuestions * QUIZ_PASS_RATE)

  const selectAnswer = (answer: AnswerKey) => {
    if (submitted) return
    setAnswers(prev => ({
      ...prev,
      [question.id]: answer
    }))
  }

  const handleSubmit = async () => {
    // Ensure all questions answered
    if (answeredCount < totalQuestions) {
      setError(`Please answer all questions (${answeredCount}/${totalQuestions} answered)`)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayNumber,
          answers
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to submit quiz')
        return
      }

      setScore(data.score)
      setPassed(data.passed)
      setSubmitted(true)

      // Refresh page data
      router.refresh()
    } catch (err) {
      setError('Failed to submit quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setSubmitted(false)
    setScore(null)
    setPassed(null)
    setCurrentQuestion(0)
  }

  // Results view
  if (submitted && score !== null) {
    return (
      <div>
        {/* Score Display */}
        <div className={`text-center py-8 rounded-lg mb-6 ${passed ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
          <div className="text-5xl mb-4">{passed ? '🎉' : '😔'}</div>
          <h3 className={`text-2xl font-bold mb-2 ${passed ? 'text-emerald-500' : 'text-red-500'}`}>
            {passed ? 'You Passed!' : 'Not Quite'}
          </h3>
          <p className="text-3xl font-bold mb-2">{score}%</p>
          <p className="text-gray-400">
            {passed 
              ? 'Great job! You can now proceed to the next day.' 
              : `You need ${Math.round(QUIZ_PASS_RATE * 100)}% to pass. Try again!`}
          </p>
        </div>

        {/* Answer Review */}
        <div className="space-y-4 mb-6">
          <h4 className="font-semibold">Review Your Answers:</h4>
          {questions.map((q, idx) => {
            const userAnswer = answers[q.id]
            const isCorrect = userAnswer === q.correct_answer
            
            return (
              <div key={q.id} className={`p-4 rounded-lg border-2 ${isCorrect ? 'border-emerald-500 bg-emerald-900/20' : 'border-red-500 bg-red-900/20'}`}>
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-lg">{isCorrect ? '✅' : '❌'}</span>
                  <span className="font-medium">Q{idx + 1}: {q.question_text}</span>
                </div>
                <p className="text-sm text-gray-400 ml-7">
                  Your answer: {userAnswer} - {q[`option_${userAnswer.toLowerCase()}` as keyof QuizQuestion]}
                </p>
                {!isCorrect && (
                  <p className="text-sm text-emerald-400 ml-7">
                    Correct answer: {q.correct_answer} - {q[`option_${q.correct_answer.toLowerCase()}` as keyof QuizQuestion]}
                  </p>
                )}
                {q.explanation && (
                  <p className="text-sm text-gray-500 ml-7 mt-1 italic">
                    {q.explanation}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Retry Button */}
        {!passed && (
          <button onClick={handleRetry} className="btn-primary w-full">
            Try Again
          </button>
        )}
      </div>
    )
  }

  // Quiz taking view
  return (
    <div>
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Question {currentQuestion + 1} of {totalQuestions}</span>
          <span>{answeredCount}/{totalQuestions} answered</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Question */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4">{question.question_text}</h3>
        
        <div className="space-y-3">
          {(['A', 'B', 'C', 'D'] as AnswerKey[]).map((option) => {
            const optionKey = `option_${option.toLowerCase()}` as keyof QuizQuestion
            const optionText = question[optionKey] as string
            const isSelected = answers[question.id] === option
            
            return (
              <button
                key={option}
                onClick={() => selectAnswer(option)}
                className={`quiz-option ${isSelected ? 'quiz-option-selected' : 'quiz-option-default'}`}
              >
                <span className="font-bold mr-3">{option}.</span>
                {optionText}
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
          disabled={currentQuestion === 0}
          className="btn-secondary disabled:opacity-50"
        >
          Previous
        </button>

        {/* Question Dots */}
        <div className="flex gap-1">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestion(idx)}
              className={`w-3 h-3 rounded-full transition-all ${
                idx === currentQuestion 
                  ? 'bg-emerald-500' 
                  : answers[q.id] 
                    ? 'bg-gray-500' 
                    : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        {currentQuestion < totalQuestions - 1 ? (
          <button
            onClick={() => setCurrentQuestion(prev => Math.min(totalQuestions - 1, prev + 1))}
            className="btn-secondary"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading || answeredCount < totalQuestions}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Quiz'}
          </button>
        )}
      </div>
    </div>
  )
}
