import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionId(data.session.user.id)
        setLoading(false)
      } else {
        supabase.auth.signInAnonymously().then(({ data: d }) => {
          setSessionId(d.user?.id ?? null)
          setLoading(false)
        })
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionId(session?.user.id ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return { sessionId, loading }
}
