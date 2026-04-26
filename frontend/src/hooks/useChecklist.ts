import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api'

export interface ChecklistItem {
  id: string
  item_id: string
  label: string
  completed: boolean
  completed_at: string | null
}

export function useChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/checklist')
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const toggle = useCallback(async (item_id: string, completed: boolean) => {
    // Optimistic update — instant UI feedback
    setItems((prev) =>
      prev.map((i) => (i.item_id === item_id ? { ...i, completed } : i))
    )
    try {
      await apiFetch(`/api/checklist/${item_id}`, {
        method: 'PUT',
        body: JSON.stringify({ completed }),
      })
    } catch {
      // Revert on failure
      setItems((prev) =>
        prev.map((i) => (i.item_id === item_id ? { ...i, completed: !completed } : i))
      )
    }
  }, [])

  const progress =
    items.length > 0
      ? Math.round((items.filter((i) => i.completed).length / items.length) * 100)
      : 0

  return { items, loading, toggle, progress }
}
