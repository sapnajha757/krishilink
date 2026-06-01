import { useState } from 'react'
import { supabase } from './supabase'

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true)
  const [role, setRole] = useState('consumer')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onLogin(data.user)
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: name,
          role: role,
          email: email
        })
        onLogin(data.user)
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        {/* Logo */}
        <h1 className="text-3xl font-bold text-green-700 text-center mb-2">🌾 KrishiLink</h1>
        <p className="text-center text-gray-500 mb-6">
          {isLogin ? 'Welcome back!' : 'Join KrishiLink today'}
        </p>

        {/* Toggle */}
        <div className="flex bg-green-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-md font-medium transition ${isLogin ? 'bg-white text-green-700 shadow' : 'text-gray-500'}`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-md font-medium transition ${!isLogin ? 'bg-white text-green-700 shadow' : 'text-gray-500'}`}
          >
            Sign Up
          </button>
        </div>

        {/* Role selector (signup only) */}
        {!isLogin && (
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setRole('consumer')}
              className={`flex-1 border-2 rounded-lg py-3 font-medium ${role === 'consumer' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
            >
              🛒 I'm a Consumer
            </button>
            <button
              onClick={() => setRole('farmer')}
              className={`flex-1 border-2 rounded-lg py-3 font-medium ${role === 'farmer' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
            >
              👨‍🌾 I'm a Farmer
            </button>
          </div>
        )}

        {/* Name (signup only) */}
        {!isLogin && (
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-3 focus:outline-none focus:border-green-500"
          />
        )}

        {/* Email & Password */}
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-3 focus:outline-none focus:border-green-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-green-500"
        />

        {/* Error */}
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Please wait...' : isLogin ? 'Login' : 'Create Account'}
        </button>

        <p className="text-center text-gray-500 mt-4 text-sm">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span
            onClick={() => setIsLogin(!isLogin)}
            className="text-green-600 font-medium cursor-pointer hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  )
}

export default Auth