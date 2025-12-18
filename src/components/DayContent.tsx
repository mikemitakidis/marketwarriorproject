'use client'

import { useState, useEffect } from 'react'

interface DayContentProps {
  dayNumber: number
}

export default function DayContent({ dayNumber }: DayContentProps) {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchContent()
  }, [dayNumber])

  const fetchContent = async () => {
    try {
      const response = await fetch(`/api/content/${dayNumber}`)
      if (!response.ok) {
        throw new Error('Failed to load content')
      }
      const data = await response.json()
      setContent(data.content)
    } catch (err) {
      setError('Failed to load lesson content')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div 
      className="day-content prose prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}
