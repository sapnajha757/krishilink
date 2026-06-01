import { useState } from 'react'

function App() {
  return (
    <div className="min-h-screen bg-green-50">

      {/* Navbar */}
      <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-green-700">🌾 KrishiLink</h1>
        <div className="flex gap-4">
          <button className="text-green-700 font-medium hover:underline">Login</button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Sign Up</button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="text-center py-20 px-4">
        <h2 className="text-5xl font-bold text-green-800 mb-4">
          Fresh From Farm 🥦
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          Buy directly from local farmers. No middlemen. Pure & fresh.
        </p>
        <div className="flex gap-4 justify-center">
          <button className="bg-green-600 text-white px-8 py-3 rounded-full text-lg hover:bg-green-700">
            Shop Now
          </button>
          <button className="border-2 border-green-600 text-green-600 px-8 py-3 rounded-full text-lg hover:bg-green-50">
            Sell Your Produce
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="px-8 py-10">
        <h3 className="text-2xl font-bold text-center text-green-800 mb-8">Shop by Category</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {['🥬 Vegetables', '🍎 Fruits', '🌾 Grains', '🥛 Dairy'].map((cat) => (
            <div key={cat} className="bg-white rounded-xl p-6 text-center shadow hover:shadow-md cursor-pointer">
              <p className="text-lg font-medium text-gray-700">{cat}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white py-12 px-8 mt-8">
        <h3 className="text-2xl font-bold text-center text-green-800 mb-8">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { icon: '👨‍🌾', title: 'Farmer Lists', desc: 'Farmers list fresh produce directly' },
            { icon: '🛒', title: 'You Order', desc: 'Browse and order what you need' },
            { icon: '🚚', title: 'Fresh Delivery', desc: 'Get fresh produce at your door' },
          ].map((step) => (
            <div key={step.title} className="text-center p-6 rounded-xl bg-green-50">
              <div className="text-4xl mb-3">{step.icon}</div>
              <h4 className="font-bold text-green-700 text-lg mb-2">{step.title}</h4>
              <p className="text-gray-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-gray-500 mt-8">
        🌾 KrishiLink — Connecting Farmers & Consumers across India
      </footer>

    </div>
  )
}

export default App 
