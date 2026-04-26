import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './LanguageSwitcher'

const NAV_LINKS = [
  { to: '/', label: 'nav.home', exact: true },
  { to: '/timeline', label: 'nav.timeline' },
  { to: '/checklist', label: 'nav.checklist' },
  { to: '/fact-check', label: 'nav.factcheck' },
]

export function Navbar() {
  const { t } = useTranslation()

  return (
    <nav
      className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3"
      aria-label="Main navigation"
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <NavLink
          to="/"
          className="font-bold text-lg shrink-0"
          style={{ color: '#1a4e8a' }}
          aria-label="ElectIQ home"
        >
          🗳️ ElectIQ
        </NavLink>

        <div className="flex items-center gap-1 overflow-x-auto">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                 ${isActive
                   ? 'text-white'
                   : 'text-gray-600 hover:bg-gray-100'
                 }`
              }
              style={({ isActive }) =>
                isActive ? { background: '#1a4e8a' } : undefined
              }
  
            >
              {t(label)}
            </NavLink>
          ))}
        </div>

        <LanguageSwitcher />
      </div>
    </nav>
  )
}
