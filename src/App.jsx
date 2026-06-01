import { useState } from "react"
import Auth from "./Auth"

function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState("home")

  if (page === "auth") {
    return <Auth onLogin={(u) => { setUser(u); setPage("home") }} />
  }

  return (
    <div className="min-h-screen bg-green-50">
      <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-green-700">🌾 KrishiLink</h1>
        <div className="flex gap-4 items-center">
          {user ? (
            <span className="text-green-700 font-medium">👋 {user.email}</span>
          ) : (
            <>
              <button onClick={() => setPage("auth")} className="text-green-700 font-medium hover:underline">Login</button>
              <button onClick={() => setPage("auth")} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Sign Up</button>
            </>
          )}
        </div>
      </nav>
      <div className="text-center py-20 px-4">
        <h2 className="text-5xl font-bold text-green-800 mb-4">Fresh From Farm 🥦</h2>
        <p className="text-xl text-gray-600 mb-8">Buy directly from local farmers. No middlemen. Pure and fresh.</p>
        <div className="flex gap-4 justify-center">
          <button onClick={() => setPage("auth")} className="bg-green-600 text-white px-8 py-3 rounded-full text-lg hover:bg-green-700">Shop Now</button>
          <button onClick={() => setPage("auth")} className="border-2 border-green-600 text-green-600 px-8 py-3 rounded-full text-lg">Sell Your Produce</button>
        </div>
      </div>
      <div className="px-8 py-10">
        <h3 className="text-2xl font-bold text-center text-green-800 mb-8">Shop by Category</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {["🥬 Vegetables", "🍎 Fruits", "🌾 Grains", "🥛 Dairy"].map((cat) => (
            <div key={cat} className="bg-white rounded-xl p-6 text-center shadow hover:shadow-md cursor-pointer">
              <p className="text-lg font-medium text-gray-700">{cat}</p>
            </div>
          ))}
        </div>
      </div>
      <footer className="text-center py-6 text-gray-500 mt-8">
        🌾 KrishiLink — Connecting Farmers and Consumers across India
      </footer>
    </div>
  )
}

export default App
