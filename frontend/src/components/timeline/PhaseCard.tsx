import { motion } from 'framer-motion'

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
  phase: Phase
  onClick: (phase: Phase) => void
  index: number
}

export function PhaseCard({ phase, onClick, index }: Props) {
  return (
    <motion.button
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: index * 0.08 }}
      onClick={() => onClick(phase)}
      className="w-full text-left bg-white rounded-2xl border border-gray-200 p-5
        hover:border-blue-300 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
      aria-label={`Phase ${phase.phase_order}: ${phase.title}`}
    >
      <div className="flex items-start gap-4">
        <div className="text-3xl mt-0.5" aria-hidden="true">{phase.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-400">Phase {phase.phase_order}</span>
            <span className="text-xs text-gray-400">· {phase.duration}</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-base mb-1">{phase.title}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{phase.description}</p>
        </div>
        <span className="text-gray-400 text-lg" aria-hidden="true">›</span>
      </div>
    </motion.button>
  )
}
