import { useState } from "react"
import Auth from "./Auth"
import FarmerDashboard from "./FarmerDashboard"
import Marketplace from "./Marketplace"
import AdminPanel from "./AdminPanel"

function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState("home")
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const isAdmin = user?.email && adminEmails.includes(user.email.toLowerCase())

  const handleLogin = (u) => {
    setUser(u)
    setPage("home")
  }

  const handleLogout = () => {
    setUser(null)
    setPage("home")
  }

  if (page === "auth") {
    return <Auth onLogin={handleLogin} />
  }

  if (page === "farmer" && user) {
    return <FarmerDashboard user={user} onBack={() => setPage("home")} />
  }

  if (page === "marketplace") {
    return <Marketplace user={user} onBack={() => setPage("home")} />
  }

  if (page === "admin" && user && isAdmin) {
    return <AdminPanel user={user} onBack={() => setPage("home")} />
  }

  return (
    <div className="min-h-screen bg-green-50">

      {/* Navbar */}
      <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
        <h1
          className="text-2xl font-bold text-green-700 cursor-pointer"
          onClick={() => setPage("home")}
        >
          🌾 KrishiLink
        </h1>
        <div className="flex gap-4 items-center">
          {user ? (
            <div className="flex gap-3 items-center">
              <span className="text-gray-600 text-sm hidden md:block">
                👋 {user.email}
              </span>
              <button
                onClick={() => setPage("marketplace")}
                className="bg-green-50 text-green-700 border border-green-300 px-4 py-2 rounded-lg hover:bg-green-100 text-sm font-medium"
              >
                🛒 Marketplace
              </button>
              <button
                onClick={() => setPage("farmer")}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                👨‍🌾 Farmer Dashboard
              </button>
              {isAdmin && (
                <button
                  onClick={() => setPage("admin")}
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black text-sm font-medium"
                >
                  🛡️ Admin
                </button>
              )}
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-500 text-sm"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setPage("auth")}
                className="text-green-700 font-medium hover:underline"
              >
                Login
              </button>
              <button
                onClick={() => setPage("auth")}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="text-center py-20 px-4">
        <h2 className="text-5xl font-bold text-green-800 mb-4">Fresh From Farm 🥦</h2>
        <p className="text-xl text-gray-600 mb-8">
          Buy directly from local farmers. No middlemen. Pure and fresh.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <button
            onClick={() => setPage("marketplace")}
            className="bg-green-600 text-white px-8 py-3 rounded-full text-lg hover:bg-green-700 transition"
          >
            Shop Now
          </button>
          <button
            onClick={() => user ? setPage("farmer") : setPage("auth")}
            className="border-2 border-green-600 text-green-600 px-8 py-3 rounded-full text-lg hover:bg-green-50 transition"
          >
            Sell Your Produce
          </button>
        </div>
      </div>

      {/* Category Section */}
      <div className="px-8 py-10">
        <h3 className="text-2xl font-bold text-center text-green-800 mb-8">
          Shop by Category
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[
            { label: "🥬 Vegetables", cat: "Vegetables" },
            { label: "🍎 Fruits", cat: "Fruits" },
            { label: "🌾 Grains", cat: "Grains" },
            { label: "🥛 Dairy", cat: "Dairy" },
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

      {/* Footer */}
      <footer className="text-center py-6 text-gray-500 mt-8">
        🌾 KrishiLink — Connecting Farmers and Consumers across India
      </footer>

    </div>
  )
}

export default App