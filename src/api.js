const stripTrailingSlash = (url) => String(url || '').replace(/\/$/, '')

function resolveApiUrl() {
  const fromEnv = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL
  if (fromEnv) return stripTrailingSlash(fromEnv)

  if (import.meta.env.DEV) return ''

  // Production fallback - Render backend
  return 'https://krishilink-backend-rc2k.onrender.com'
}

export const API_URL = resolveApiUrl()
