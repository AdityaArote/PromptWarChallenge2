import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '@/lib/api'

const VERDICT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  TRUE: { bg: 'bg-green-50 border-green-300', text: 'text-green-700', label: '✅ TRUE' },
  FALSE: { bg: 'bg-red-50 border-red-300', text: 'text-red-700', label: '❌ FALSE' },
  MISLEADING: {
    bg: 'bg-yellow-50 border-yellow-300',
    text: 'text-yellow-700',
    label: '⚠️ MISLEADING',
  },
  'CONTEXT-DEPENDENT': {
    bg: 'bg-blue-50 border-blue-300',
    text: 'text-blue-700',
    label: 'ℹ️ CONTEXT-DEPENDENT',
  },
}

interface Result {
  verdict: string
  explanation: string
  sources: string[]
  cached?: boolean
}

export function FactCheck() {
  const [claim, setClaim] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const check = async () => {
    if (!claim.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const r = await apiFetch('/api/fact-check', {
        method: 'POST',
        body: JSON.stringify({ claim }),
      })
      if (!r.ok) throw new Error('Check failed')
      setResult(await r.json())
    } catch {
      setError('Could not check this claim. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const style = result
    ? VERDICT_STYLES[result.verdict] ?? VERDICT_STYLES['CONTEXT-DEPENDENT']
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Election Fact Checker</h1>
      <p className="text-gray-600 mb-6">
        Submit a claim you've seen or heard — we'll check it against verified election information.
      </p>

      <div className="flex gap-2 mb-4">
        <input
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          placeholder="e.g. You need a passport to vote"
          aria-label="Enter a claim to fact-check"
          className="flex-1 px-4 py-3 rounded-xl border border-gray-300
            focus:ring-2 focus:ring-blue-300 focus:outline-none text-sm"
        />
        <button
          onClick={check}
          disabled={loading || !claim.trim()}
          className="px-5 py-3 rounded-xl font-semibold text-white disabled:opacity-40
            hover:scale-[1.02] transition-transform"
          style={{ background: '#1a4e8a' }}
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Check'
          )}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-red-600 text-sm mb-4">
          {error}
        </p>
      )}

      <AnimatePresence>
        {result && style && (
          <motion.div
            className={`border rounded-2xl p-5 ${style.bg}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <p className={`font-bold text-lg mb-2 ${style.text}`}>{style.label}</p>
            <p className="text-gray-800 text-sm leading-relaxed mb-3">
              {result.explanation}
            </p>
            {result.sources?.length > 0 && (
              <div className="text-xs text-gray-500 mb-3">
                Sources: {result.sources.join(' · ')}
              </div>
            )}
            {result.cached && (
              <p className="text-xs text-gray-400 mb-2">⚡ Cached result</p>
            )}
            <button
              onClick={() =>
                apiFetch('/api/fact-check/flag', {
                  method: 'POST',
                  body: JSON.stringify({ claim, verdict_returned: result.verdict }),
                })
              }
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Flag this result as incorrect
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
