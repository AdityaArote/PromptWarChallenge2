import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { QuizCard } from '@/components/quiz/QuizCard'
import { ScoreBoard } from '@/components/quiz/ScoreBoard'
import { motion } from 'framer-motion'

export function Quiz() {
  const [questions, setQuestions] = useState<{ question: string; options: string[]; correct: number }[]>([])
  const [answers, setAnswers] = useState<number[]>([])
  const [current, setCurrent] = useState(0)
  const [result, setResult] = useState<{ badge?: string; score?: number; correct?: number; total?: number; detail?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const start = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await apiFetch('/api/quiz/generate', { method: 'POST' })
      if (!r.ok) throw new Error('Failed to load questions')
      const d = await r.json()
      setQuestions(d.questions || [])
      setAnswers([])
      setCurrent(0)
      setResult(null)
    } catch (err) {
      setError('Could not load quiz questions. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const answer = (idx: number) => {
    const next = [...answers, idx]
    setAnswers(next)
    if (current + 1 < questions.length) { setCurrent(current + 1) }
    else {
      setLoading(true)
      apiFetch('/api/quiz/submit', { method: 'POST', body: JSON.stringify({ answers: next, questions }) })
        .then(async r => {
          const data = await r.json()
          if (!r.ok) throw new Error(data.detail || 'Failed to submit quiz')
          setResult(data)
        })
        .catch((err: any) => {
          setResult({ detail: err.message, score: 0, correct: 0, total: questions.length })
        })
        .finally(() => setLoading(false))
    }
  }

  if (result) return <ScoreBoard result={result} onRestart={start} />

  if (questions.length === 0) return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Civic Knowledge Quiz</h1>
      <p className="text-gray-600 mb-8">Test your election knowledge with 10 questions.</p>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <button onClick={start} disabled={loading}
        className="px-8 py-3 rounded-xl font-semibold text-white disabled:opacity-40 transition-all hover:opacity-90 active:scale-95"
        style={{ background: '#1a4e8a' }}>
        {loading ? 'Loading questions...' : 'Start Quiz'}
      </button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
        <span>Question {current + 1} of {questions.length}</span>
        <div className="h-2 flex-1 mx-4 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${(current / questions.length) * 100}%` }} />
        </div>
      </div>
      <motion.div key={current} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}>
        <QuizCard question={questions[current]} onAnswer={answer} />
      </motion.div>
    </div>
  )
}
