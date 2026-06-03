import { useState, useEffect } from "react"
import Auth from "./Auth"
import FarmerDashboard from "./FarmerDashboard"
import Marketplace from "./Marketplace"
import AdminPanel from "./AdminPanel"
import Profile from './Profile'
import LanguageSelector from './components/LanguageSelector'
import { useLanguage } from './i18n/LanguageContext'
import { supabase } from './supabase'

function App() {
  const { t } = useLanguage()
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [page, setPage] = useState("home")
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const isAdmin = user?.email && adminEmails.includes(user.email.toLowerCase())

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = (u) => {
    setUser(u)
    setPage("home")
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setPage("home")
  }

  const requireAuth = (nextPage) => {
    if (!user) {
      setPage("auth")
      return false
    }
    setPage(nextPage)
    return true
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center text-gray-500">
        {t('loading')}
      </div>
    )
  }

  const Navbar = () => (
    <nav className="bg-white shadow-md px-3 sm:px-6 py-3 sm:py-4 flex flex-wrap justify-between items-center gap-2">
      <h1
        className="text-lg sm:text-2xl font-bold text-green-700 cursor-pointer shrink-0"
        onClick={() => setPage("home")}
      >
        🌾 KrishiLink
      </h1>
      <div className="flex flex-wrap gap-2 sm:gap-3 items-center justify-end">
        <LanguageSelector />
        {user ? (
          <div className="flex flex-wrap gap-1.5 sm:gap-3 items-center">
            <span className="text-gray-600 text-sm hidden md:block">
              👋 {user.email}
            </span>
            <button
              onClick={() => setPage("marketplace")}
              className="bg-green-50 text-green-700 border border-green-300 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-green-100 text-xs sm:text-sm font-medium"
            >
              <span className="sm:hidden">🛒</span>
              <span className="hidden sm:inline">🛒 {t('marketplace')}</span>
            </button>
            <button
              onClick={() => requireAuth('profile')}
              className="bg-gray-50 text-gray-700 border border-gray-300 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-gray-100 text-xs sm:text-sm font-medium"
            >
              <span className="sm:hidden">👤</span>
              <span className="hidden sm:inline">👤 {t('profile')}</span>
            </button>
            <button
              onClick={() => requireAuth('farmer')}
              className="bg-green-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-green-700 text-xs sm:text-sm font-medium"
            >
              <span className="sm:hidden">👨‍🌾</span>
              <span className="hidden sm:inline">👨‍🌾 {t('farmerDashboard')}</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => setPage("admin")}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black text-sm font-medium"
              >
                🛡️ {t('admin')}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-500 text-sm"
            >
              {t('logout')}
            </button>
          </div>
        ) : (
          <div className="flex gap-3 items-center">
            <button
              onClick={() => setPage("auth")}
              className="text-green-700 font-medium hover:underline text-sm"
            >
              {t('login')}
            </button>
            <button
              onClick={() => setPage("auth")}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
            >
              {t('signUp')}
            </button>
          </div>
        )}
      </div>
    </nav>
  )

  const BackButton = ({ onClick }) => (
    <div className="px-4 sm:px-6 pt-4">
      <button
        onClick={onClick || (() => setPage("home"))}
        className="flex items-center gap-2 text-green-700 hover:text-green-900 font-medium mb-2"
      >
        {t('backToHome')}
      </button>
    </div>
  )

  if (page === "auth") {
    return <Auth onLogin={handleLogin} />
  }

  if (page === "farmer" && user) {
    return (
      <div className="min-h-screen bg-green-50">
        <Navbar />
        <BackButton onClick={() => setPage("home")} />
        <FarmerDashboard user={user} />
      </div>
    )
  }

  if (page === 'profile' && user) {
    return (
      <div className="min-h-screen bg-green-50">
        <Navbar />
        <BackButton onClick={() => setPage("home")} />
        <Profile user={user} />
      </div>
    )
  }

  if (page === "marketplace") {
    return (
      <div className="min-h-screen bg-green-50">
        <Navbar />
        <BackButton onClick={() => setPage("home")} />
        <Marketplace user={user} />
      </div>
    )
  }

  if (page === "admin" && user && isAdmin) {
    return (
      <div className="min-h-screen bg-green-50">
        <Navbar />
        <BackButton onClick={() => setPage("home")} />
        <AdminPanel user={user} onBack={() => setPage("home")} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="text-center py-20 px-4">
        <h2 className="text-5xl font-bold text-green-800 mb-4">{t('heroTitle')}</h2>
        <p className="text-xl text-gray-600 mb-8">{t('heroSubtitle')}</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <button
            onClick={() => setPage("marketplace")}
            className="bg-green-600 text-white px-8 py-3 rounded-full text-lg hover:bg-green-700 transition"
          >
            {t('shopNow')}
          </button>
          <button
            onClick={() => user ? setPage("farmer") : setPage("auth")}
            className="border-2 border-green-600 text-green-600 px-8 py-3 rounded-full text-lg hover:bg-green-50 transition"
          >
            {t('sellProduce')}
          </button>
        </div>
      </div>

      <div className="px-8 py-10">
        <h3 className="text-2xl font-bold text-center text-green-800 mb-8">
          {t('shopByCategory')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[
            { label: t('catVegetables'), cat: 'Vegetables' },
            { label: t('catFruits'), cat: 'Fruits' },
            { label: t('catGrains'), cat: 'Grains' },
            { label: t('catDairy'), cat: 'Dairy' },
          ].map(({ label, cat }) => (
            <div
              key={cat}
              onClick={() => setPage("marketplace")}
              className="bg-white rounded-xl p-6 text-center shadow hover:shadow-md cursor-pointer hover:border-2 hover:border-green-400 transition"
            >
              <p className="text-lg font-medium text-gray-700">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="text-center py-6 text-gray-500 mt-8">
        {t('footer')}
      </footer>
    </div>
  )
}

export default App
