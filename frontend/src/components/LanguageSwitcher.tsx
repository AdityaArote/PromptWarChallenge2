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

  const change = async (code: string) => {
    setLoading(true)
    localStorage.setItem('electiq-lang', code)
    document.documentElement.setAttribute('dir', RTL.includes(code) ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', code)

    if (code !== 'en') {
      try {
        const res = await fetch(`/api/translate/bundle?lang=${code}`)
        const bundle = await res.json()
        i18n.addResourceBundle(code, 'translation', bundle, true, true)
      } catch {
        // Fallback to English if translation fails
      }
    }
    await i18n.changeLanguage(code)
    setLoading(false)
  }

  return (
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
          {l.label}
        </option>
      ))}
    </select>
  )
}
