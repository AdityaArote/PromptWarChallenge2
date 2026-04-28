import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PhaseCard } from '@/components/timeline/PhaseCard'
import { PhaseDetail } from '@/components/timeline/PhaseDetail'
import { apiFetch } from '@/lib/api'

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

export function Timeline() {
  const [phases, setPhases] = useState<Phase[]>([])
  const [selected, setSelected] = useState<Phase | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/timeline')
      .then((r) => r.json())
      .then((d) => {
        setPhases(d.phases)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleCta = () => {
    setSelected(null)
    window.location.href = '/checklist'
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Election Timeline</h1>
      <p className="text-gray-600 mb-6">Tap a phase to learn what it means for you.</p>

      <motion.div
        className="space-y-3"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        {phases.map((phase, i) => (
          <PhaseCard key={phase.id} phase={phase} onClick={setSelected} index={i} />
        ))}
      </motion.div>

      <PhaseDetail
        phase={selected}
        onClose={() => setSelected(null)}
        onCtaClick={handleCta}
      />
    </div>
  )
}
