import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { ChecklistItem as Item } from '@/hooks/useChecklist'

interface Props {
  item: Item
  onToggle: (item_id: string, completed: boolean) => void
}

export function ChecklistItemComponent({ item, onToggle }: Props) {
  return (
    <motion.div
      layout
      className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors cursor-pointer
        ${item.completed
          ? 'bg-green-50 border-green-200'
          : 'bg-white border-gray-200 hover:border-blue-200'
        }`}
      onClick={() => onToggle(item.item_id, !item.completed)}
      role="checkbox"
      aria-checked={item.completed}
      tabIndex={0}
      onKeyDown={(e) => e.key === ' ' && onToggle(item.item_id, !item.completed)}
    >
      <motion.div
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
          ${item.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}
        animate={item.completed ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {item.completed && (
          <Check size={14} color="white" strokeWidth={3} aria-hidden="true" />
        )}
      </motion.div>
      <span
        className={`text-sm ${
          item.completed ? 'text-gray-500 line-through' : 'text-gray-800'
        }`}
      >
        {item.label}
      </span>
    </motion.div>
  )
}
