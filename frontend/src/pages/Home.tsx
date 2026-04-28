import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const FEATURES = [
  { icon: '🗓️', label: 'Election Timeline', path: '/timeline', desc: 'Step-by-step election lifecycle' },
  { icon: '✅', label: 'Voter Checklist', path: '/checklist', desc: 'Your personalised to-do list' },
  { icon: '📍', label: 'Find Your Booth', path: '/maps', desc: 'Nearest polling centres' },
  { icon: '🧠', label: 'Take the Quiz', path: '/quiz', desc: 'Test your civic knowledge' },
  { icon: '🔍', label: 'Fact Checker', path: '/fact-check', desc: 'Bust election misinformation' },
]

export function Home() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('home.title')}</h1>
      <p className="text-gray-600 mb-8">{t('home.subtitle')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FEATURES.map(f => (
          <button key={f.path} onClick={() => navigate(f.path)}
            className="text-left p-5 bg-white rounded-2xl border border-gray-200
              hover:border-blue-300 hover:shadow-md transition-all focus:ring-2 focus:ring-blue-400 focus:outline-none"
            aria-label={`Go to ${f.label}: ${f.desc}`}>
            <span className="text-3xl block mb-2" aria-hidden="true">{f.icon}</span>
            <p className="font-semibold text-gray-900 text-sm">{f.label}</p>
            <p className="text-gray-500 text-xs mt-0.5">{f.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
