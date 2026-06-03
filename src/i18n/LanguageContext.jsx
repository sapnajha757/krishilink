import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { translations } from './translations'
import { DEFAULT_LANGUAGE, LANGUAGES, STORAGE_KEY } from './languages'

const LanguageContext = createContext(null)

const interpolate = (text, vars = {}) =>
  String(text).replace(/\{(\w+)\}/g, (_, key) => (vars[key] != null ? vars[key] : `{${key}}`))

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && translations[saved]) return saved
    } catch {
      /* ignore */
    }
    return DEFAULT_LANGUAGE
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      /* ignore */
    }
    document.documentElement.lang = language === 'en' ? 'en' : language
  }, [language])

  const setLanguage = (code) => {
    if (translations[code]) setLanguageState(code)
  }

  const t = useMemo(() => {
    const dict = translations[language] || translations[DEFAULT_LANGUAGE]
    const fallback = translations[DEFAULT_LANGUAGE]
    return (key, vars) => {
      const raw = dict[key] ?? fallback[key] ?? key
      return interpolate(raw, vars)
    }
  }, [language])

  const value = useMemo(
    () => ({ language, setLanguage, t, languages: LANGUAGES }),
    [language, t]
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
