import '@/i18n'
import { Routes, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Navbar } from '@/components/Navbar'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { Timeline } from '@/pages/Timeline'
import { Checklist } from '@/pages/Checklist'
import { FactCheck } from '@/pages/FactCheck'
import { useAuth } from '@/hooks/useAuth'

function Home() {
  const { t } = useTranslation()
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <div className="text-6xl mb-6">🗳️</div>
        <h1 className="text-4xl font-bold mb-4" style={{ color: '#1a4e8a' }}>
          {t('home.title')}
        </h1>
        <p className="text-gray-600 text-lg mb-8">{t('home.subtitle')}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="/timeline"
            className="px-6 py-3 rounded-xl font-semibold text-white hover:scale-[1.02] transition-transform"
            style={{ background: '#1a4e8a' }}
          >
            📅 {t('nav.timeline')}
          </a>
          <a
            href="/checklist"
            className="px-6 py-3 rounded-xl font-semibold border border-gray-300
              hover:bg-gray-50 hover:scale-[1.02] transition-transform text-gray-700"
          >
            ✅ {t('nav.checklist')}
          </a>
          <a
            href="/fact-check"
            className="px-6 py-3 rounded-xl font-semibold border border-gray-300
              hover:bg-gray-50 hover:scale-[1.02] transition-transform text-gray-700"
          >
            🔍 {t('nav.factcheck')}
          </a>
        </div>
      </div>
    </div>
  )
}

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
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/fact-check" element={<FactCheck />} />
        </Routes>
      </main>

      {/* Global floating chat assistant */}
      <ChatWindow />
    </>
  )
}
