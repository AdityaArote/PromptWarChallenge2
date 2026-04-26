import { motion } from 'framer-motion'
import { useChecklist } from '@/hooks/useChecklist'
import { ChecklistItemComponent } from '@/components/checklist/ChecklistItem'

export function Checklist() {
  const { items, loading, toggle, progress } = useChecklist()

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Your Voter Checklist</h1>
      <p className="text-gray-600 mb-6">Complete every step before election day.</p>

      {/* Animated progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">
            {items.filter((i) => i.completed).length} of {items.length} complete
          </span>
          <span className="font-semibold text-gray-900">{progress}%</span>
        </div>
        <div
          className="h-3 bg-gray-200 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Checklist completion"
        >
          <motion.div
            className="h-full bg-green-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="space-y-2" role="group" aria-label="Voter checklist">
        {items.map((item) => (
          <ChecklistItemComponent key={item.id} item={item} onToggle={toggle} />
        ))}
      </div>

      {progress === 100 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-green-50 border border-green-200 rounded-2xl text-center"
          role="status"
        >
          <p className="text-green-700 font-semibold">🎉 You're election-ready!</p>
        </motion.div>
      )}
    </div>
  )
}
