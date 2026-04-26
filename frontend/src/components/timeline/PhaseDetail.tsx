import { AnimatePresence, motion } from 'framer-motion'
import { X, CheckCircle } from 'lucide-react'

interface Phase {
  id: string
  phase_order: number
  title: string
  description: string
  duration: string
  icon: string
  voter_actions: string[]
  cta_text: string
  cta_checklist_item: string | null
}

interface Props {
  phase: Phase | null
  onClose: () => void
  onCtaClick: (item_id: string) => void
}

export function PhaseDetail({ phase, onClose, onCtaClick }: Props) {
  return (
    <AnimatePresence>
      {phase && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={phase.title}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">{phase.icon}</span>
                <div>
                  <p className="text-xs text-gray-500 font-mono">
                    Phase {phase.phase_order} · {phase.duration}
                  </p>
                  <h2 className="font-bold text-gray-900">{phase.title}</h2>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close panel"
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-gray-700 leading-relaxed mb-6">{phase.description}</p>

              <h3 className="font-semibold text-gray-900 mb-3">What should you do?</h3>
              <ul className="space-y-2 mb-6">
                {phase.voter_actions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle
                      size={16}
                      className="text-green-500 mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    {action}
                  </li>
                ))}
              </ul>

              {phase.cta_checklist_item && (
                <button
                  onClick={() => onCtaClick(phase.cta_checklist_item!)}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-transform hover:scale-[1.02]"
                  style={{ background: '#1a4e8a' }}
                >
                  {phase.cta_text}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
