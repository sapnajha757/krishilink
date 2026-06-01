import { useState, useEffect } from 'react'
import { supabase } from './supabase'

function FarmerDashboard({ user, onBack }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', price_per_kg: '', quantity_kg: '', category: 'Vegetables', location: ''
  })

  useEffect(() => { fetchProducts() }, [])

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('farmer_id', user.id)
    if (data) setProducts(data)
  }

  const handleAdd = async () => {
    setLoading(true)
    await supabase.from('products').insert({
      ...form,
      farmer_id: user.id,
      price_per_kg: parseFloat(form.price_per_kg),
      quantity_kg: parseFloat(form.quantity_kg),
    })
    setForm({ name: '', description: '', price_per_kg: '', quantity_kg: '', category: 'Vegetables', location: '' })
    setShowForm(false)
    fetchProducts()
    setLoading(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('products').delete().eq('id', id)
    fetchProducts()
  }

  return (
    <div className="min-h-screen bg-green-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-green-700">🌾 KrishiLink</h1>
        <div className="flex gap-4 items-center">
          <span className="text-green-700 font-medium">👨‍🌾 Farmer Dashboard</span>
          <button onClick={onBack} className="text-gray-500 hover:text-red-500 text-sm">Logout</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-green-800">My Products</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium"
          >
            {showForm ? 'Cancel' : '+ Add Product'}
          </button>
        </div>

        {/* Add Product Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h3 className="text-lg font-bold text-green-700 mb-4">Add New Product</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                placeholder="Product Name (e.g. Fresh Tomatoes)"
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
              />
              <select
                value={form.category}
                onChange={(e) => setForm({...form, category: e.target.value})}
                className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
              >
                <option>Vegetables</option>
                <option>Fruits</option>
                <option>Grains</option>
                <option>Dairy</option>
              </select>
              <input
                placeholder="Price per KG (₹)"
                value={form.price_per_kg}
                onChange={(e) => setForm({...form, price_per_kg: e.target.value})}
                type="number"
                className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
              />
              <input
                placeholder="Available Quantity (KG)"
                value={form.quantity_kg}
                onChange={(e) => setForm({...form, quantity_kg: e.target.value})}
                type="number"
                className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
              />
              <input
                placeholder="Location (e.g. Nashik, Maharashtra)"
                value={form.location}
                onChange={(e) => setForm({...form, location: e.target.value})}
                className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
              />
              <input
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
                className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={loading}
              className="mt-4 bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-bold w-full"
            >
              {loading ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        )}

        {/* Products List */}
        {products.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">🌾</p>
            <p className="text-xl">No products yet! Add your first product.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl shadow p-5 hover:shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-green-800">{p.name}</h3>
                    <p className="text-gray-500 text-sm">{p.category} • {p.location}</p>
                    <p className="text-gray-600 text-sm mt-1">{p.description}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    🗑️
                  </button>
                </div>
                <div className="flex gap-4 mt-3">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    ₹{p.price_per_kg}/kg
                  </span>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                    {p.quantity_kg} kg available
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default FarmerDashboard