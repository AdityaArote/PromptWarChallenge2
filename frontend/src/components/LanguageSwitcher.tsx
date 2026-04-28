import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'zh', label: '中文' },
  { code: 'ur', label: 'اردو' },
  { code: 'pt', label: 'Português' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ru', label: 'Русский' },
]
const RTL = ['ar', 'he', 'ur']

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const change = async (code: string) => {
    setLoading(true)
    setError(false)
    localStorage.setItem('electiq-lang', code)
    document.documentElement.setAttribute('dir', RTL.includes(code) ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', code)

    if (code !== 'en') {
      // Only fetch if bundle isn't already registered
      if (!i18n.hasResourceBundle(code, 'translation')) {
        try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
          const res = await fetch(`${baseUrl}/api/translate/bundle?lang=${code}`)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const bundle = await res.json()
          // Register bundle BEFORE changing language so React re-renders with correct strings
          i18n.addResourceBundle(code, 'translation', bundle, true, true)
        } catch (err) {
          console.warn(`[i18n] Translation fetch failed for "${code}", falling back to English`, err)
          setError(true)
          // Fall back gracefully — change to English so UI stays readable
          await i18n.changeLanguage('en')
          setLoading(false)
          return
        }
      }
    }

    await i18n.changeLanguage(code)
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={i18n.language}
        onChange={(e) => change(e.target.value)}
        disabled={loading}
        aria-label="Select language"
        className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white
          focus:ring-2 focus:ring-blue-300 focus:outline-none disabled:opacity-50"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {loading && i18n.language !== l.code ? l.label : l.label}
          </option>
        ))}
      </select>
      {loading && (
        <span className="text-xs text-gray-400 animate-pulse" aria-live="polite">
          Translating…
        </span>
      )}
      {error && (
        <span className="text-xs text-red-500" role="alert">
          Translation unavailable
        </span>
      )}
    </div>
  )
}
