import { useLanguage } from '../i18n/LanguageContext'

function LanguageSelector({ className = '' }) {
  const { language, setLanguage, languages, t } = useLanguage()

  return (
    <label className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="text-xs text-gray-500 hidden sm:inline" aria-hidden>
        🌐
      </span>
      <span className="sr-only">{t('chooseLanguage')}</span>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="text-xs sm:text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-green-500 max-w-[9rem] sm:max-w-none"
        aria-label={t('chooseLanguage')}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.native}
          </option>
        ))}
      </select>
    </label>
  )
}

export default LanguageSelector
