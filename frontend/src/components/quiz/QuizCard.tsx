import { useState } from 'react'
import { motion } from 'framer-motion'

export function QuizCard({ question, onAnswer }: { question: { question: string; options: string[]; correct: number }; onAnswer: (i: number) => void }) {
  const [selected, setSelected] = useState<number | null>(null)

  const pick = (i: number) => {
    if (selected !== null) return
    setSelected(i)
    setTimeout(() => onAnswer(i), 700)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <p className="font-semibold text-gray-900 mb-5 leading-snug">{question.question}</p>
      <div className="space-y-2" role="radiogroup" aria-label="Answer options">
        {question.options.map((opt: string, i: number) => {
          let cls = 'w-full text-left px-4 py-3 rounded-xl border text-sm transition-all '
          if (selected === null) cls += 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
          else if (i === question.correct) cls += 'border-green-400 bg-green-50 text-green-800'
          else if (i === selected && selected !== question.correct) cls += 'border-red-300 bg-red-50 text-red-700'
          else cls += 'border-gray-200 text-gray-400'
          return (
            <motion.button key={i} role="radio" aria-checked={selected === i}
              whileTap={selected === null ? { scale: 0.98 } : undefined}
              className={cls} onClick={() => pick(i)}>
              {opt}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
