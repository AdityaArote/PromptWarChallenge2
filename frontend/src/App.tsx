import '@/i18n'
import { Routes, Route } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { Timeline } from '@/pages/Timeline'
import { Checklist } from '@/pages/Checklist'
import { FactCheck } from '@/pages/FactCheck'
import { Maps } from '@/pages/Maps'
import { Quiz } from '@/pages/Quiz'
import { useAuth } from '@/hooks/useAuth'

import { Home } from '@/pages/Home'
import { SkipToContent } from '@/components/SkipToContent'

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#1a4e8a', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <>
      <SkipToContent />
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/fact-check" element={<FactCheck />} />
          <Route path="/maps" element={<Maps />} />
          <Route path="/quiz" element={<Quiz />} />
        </Routes>
      </main>

      {/* Global floating chat assistant */}
      <ChatWindow />
    </>
  )
}
