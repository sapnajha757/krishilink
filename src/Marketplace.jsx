import { useState, useEffect } from 'react'
import { supabase } from './supabase'

function Marketplace({ user, onBack }) {
  const [products, setProducts] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [ordered, setOrdered] = useState(null)
  const [quantities, setQuantities] = useState({})
  const [cart, setCart] = useState([])
  const [showCart, setShowCart] = useState(false)
  const [showOrders, setShowOrders] = useState(false)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [farmers, setFarmers] = useState({})

  useEffect(() => { fetchProducts() }, [])

  useEffect(() => {
    let data = products
    if (category !== 'All') data = data.filter(p => p.category === category)
    if (search) data = data.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    setFiltered(data)
  }, [search, category, products])

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('is_available', true)
    if (data) {
      setProducts(data)
      setFiltered(data)
      fetchFarmerNames(data)
    }
    setLoading(false)
  }

  const fetchFarmerNames = async (productsData) => {
    const farmerIds = [...new Set(productsData.map(p => p.farmer_id).filter(Boolean))]
    if (farmerIds.length === 0) return
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', farmerIds)
    if (data) {
      const map = {}
      data.forEach(f => { map[f.id] = f.full_name })
      setFarmers(map)
    }
  }

  const fetchOrders = async () => {
    setOrdersLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*, products(name, category)')
      .eq('consumer_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setOrders(data)
    setOrdersLoading(false)
  }

  const handleQuantityChange = (productId, value) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, Math.min(Number(value), 100))
    }))
  }

  const handleOrder = async (product) => {
    if (!user) { alert('Please login to order!'); return }
    const qty = quantities[product.id] || 1
    const { error } = await supabase.from('orders').insert({
      consumer_id: user.id,
      farmer_id: product.farmer_id,
      product_id: product.id,
      quantity_kg: qty,
      total_price: product.price_per_kg * qty,
      status: 'pending'
    })
    if (!error) {
      setOrdered(product.name)
      setSelectedProduct(null)
      setTimeout(() => setOrdered(null), 3000)
    }
  }

  const addToCart = (product) => {
    const qty = quantities[product.id] || 1
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, cartQty: item.cartQty + qty }
            : item
        )
      }
      return [...prev, { ...product, cartQty: qty }]
    })
    setOrdered(`${product.name} added to cart!`)
    setTimeout(() => setOrdered(null), 2000)
  }

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price_per_kg * item.cartQty, 0)

  const placeCartOrders = async () => {
    if (!user) { alert('Please login!'); return }
    const inserts = cart.map(item => ({
      consumer_id: user.id,
      farmer_id: item.farmer_id,
      product_id: item.id,
      quantity_kg: item.cartQty,
      total_price: item.price_per_kg * item.cartQty,
      status: 'pending'
    }))
    const { error } = await supabase.from('orders').insert(inserts)
    if (!error) {
      setCart([])
      setShowCart(false)
      setOrdered('All orders placed successfully!')
      setTimeout(() => setOrdered(null), 3000)
    }
  }

  const getCategoryEmoji = (cat) => {
    if (cat === 'Vegetables') return '🥬'
    if (cat === 'Fruits') return '🍎'
    if (cat === 'Grains') return '🌾'
    if (cat === 'Dairy') return '🥛'
    return '🌿'
  }

  const getStatusColor = (status) => {
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700'
    if (status === 'confirmed') return 'bg-blue-100 text-blue-700'
    if (status === 'delivered') return 'bg-green-100 text-green-700'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="min-h-screen bg-green-50">

      {/* Navbar */}
      <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <h1 className="text-2xl font-bold text-green-700">🌾 KrishiLink</h1>
        <div className="flex gap-3 items-center">
          {/* Cart Button */}
          <button
            onClick={() => { setShowCart(true); setShowOrders(false) }}
            className="relative bg-green-50 text-green-700 px-4 py-2 rounded-xl font-medium hover:bg-green-100 transition"
          >
            🛒 Cart
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
          {/* Orders Button */}
          <button
            onClick={() => { setShowOrders(true); setShowCart(false); fetchOrders() }}
            className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-medium hover:bg-blue-100 transition"
          >
            📦 My Orders
          </button>
          <button onClick={onBack} className="text-gray-500 hover:text-red-500 text-sm">← Back</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Success Toast */}
        {ordered && (
          <div className="bg-green-600 text-white px-6 py-3 rounded-xl mb-4 text-center font-medium animate-pulse">
            ✅ {ordered}
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <input
            placeholder="🔍 Search vegetables, fruits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500"
          />
          <div className="flex gap-2 flex-wrap">
            {['All', 'Vegetables', 'Fruits', 'Grains', 'Dairy'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition ${category === cat ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:border-green-400'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-xl">Loading fresh produce... 🌾</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">🥦</p>
            <p className="text-xl">No products found!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filtered.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow hover:shadow-lg transition p-5 flex flex-col">
                {/* Product Image / Emoji */}
                <div
                  className="bg-green-100 rounded-xl h-32 flex items-center justify-center text-5xl mb-4 cursor-pointer hover:bg-green-200 transition"
                  onClick={() => setSelectedProduct(p)}
                >
                  {getCategoryEmoji(p.category)}
                </div>

                {/* Product Info */}
                <h3
                  className="font-bold text-lg text-green-800 capitalize cursor-pointer hover:text-green-600"
                  onClick={() => setSelectedProduct(p)}
                >
                  {p.name}
                </h3>
                <p className="text-gray-500 text-sm">{p.category} • 📍 {p.location}</p>
                {farmers[p.farmer_id] && (
                  <p className="text-green-600 text-sm mt-1">👨‍🌾 {farmers[p.farmer_id]}</p>
                )}
                <p className="text-gray-600 text-sm mt-1 line-clamp-2">{p.description}</p>

                {/* Price & Stock */}
                <div className="flex justify-between items-center mt-4">
                  <div>
                    <span className="text-2xl font-bold text-green-700">₹{p.price_per_kg}</span>
                    <span className="text-gray-500 text-sm">/kg</span>
                  </div>
                  <span className="text-blue-600 text-sm font-medium">{p.quantity_kg}kg left</span>
                </div>

                {/* Quantity Selector */}
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => handleQuantityChange(p.id, (quantities[p.id] || 1) - 1)}
                    className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center hover:bg-green-200"
                  >−</button>
                  <span className="font-semibold text-gray-700 w-12 text-center">
                    {quantities[p.id] || 1} kg
                  </span>
                  <button
                    onClick={() => handleQuantityChange(p.id, (quantities[p.id] || 1) + 1)}
                    className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center hover:bg-green-200"
                  >+</button>
                  <span className="text-green-700 font-bold ml-auto">
                    ₹{((quantities[p.id] || 1) * p.price_per_kg).toFixed(0)}
                  </span>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => addToCart(p)}
                    className="flex-1 border-2 border-green-600 text-green-600 py-2 rounded-xl font-medium hover:bg-green-50 transition text-sm"
                  >
                    🛒 Add to Cart
                  </button>
                  <button
                    onClick={() => handleOrder(p)}
                    className="flex-1 bg-green-600 text-white py-2 rounded-xl font-medium hover:bg-green-700 transition text-sm"
                  >
                    ⚡ Buy Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== CART SIDEBAR ========== */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black bg-opacity-40" onClick={() => setShowCart(false)} />
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-green-700 text-white">
              <h2 className="text-xl font-bold">🛒 Your Cart ({cart.length})</h2>
              <button onClick={() => setShowCart(false)} className="text-white text-2xl">×</button>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <p className="text-5xl mb-4">🛒</p>
                <p className="text-lg">Cart is empty!</p>
                <p className="text-sm mt-1">Add some fresh produce</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                      <span className="text-3xl">{getCategoryEmoji(item.category)}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 capitalize">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.cartQty} kg × ₹{item.price_per_kg}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-700">₹{item.cartQty * item.price_per_kg}</p>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-400 text-xs hover:text-red-600 mt-1"
                        >Remove</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t bg-white">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600 font-medium">Total Amount</span>
                    <span className="text-2xl font-bold text-green-700">₹{cartTotal.toFixed(0)}</span>
                  </div>
                  <button
                    onClick={placeCartOrders}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition"
                  >
                    ✅ Place All Orders
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========== ORDER HISTORY SIDEBAR ========== */}
      {showOrders && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black bg-opacity-40" onClick={() => setShowOrders(false)} />
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-blue-700 text-white">
              <h2 className="text-xl font-bold">📦 My Orders</h2>
              <button onClick={() => setShowOrders(false)} className="text-white text-2xl">×</button>
            </div>

            {ordersLoading ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                Loading orders...
              </div>
            ) : orders.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <p className="text-5xl mb-4">📦</p>
                <p className="text-lg">No orders yet!</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {orders.map(order => (
                  <div key={order.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-800 capitalize">
                          {getCategoryEmoji(order.products?.category)} {order.products?.name || 'Product'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {order.quantity_kg} kg • ₹{order.total_price}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </p>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== PRODUCT DETAIL MODAL ========== */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setSelectedProduct(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold"
            >×</button>

            <div className="bg-green-100 rounded-xl h-40 flex items-center justify-center text-7xl mb-5">
              {getCategoryEmoji(selectedProduct.category)}
            </div>

            <h2 className="text-2xl font-bold text-green-800 capitalize">{selectedProduct.name}</h2>
            <p className="text-gray-500 mt-1">{selectedProduct.category} • 📍 {selectedProduct.location}</p>
            {farmers[selectedProduct.farmer_id] && (
              <p className="text-green-600 mt-1 font-medium">👨‍🌾 Farmer: {farmers[selectedProduct.farmer_id]}</p>
            )}
            <p className="text-gray-600 mt-3 leading-relaxed">{selectedProduct.description}</p>

            <div className="flex justify-between items-center mt-4 py-3 border-t border-b border-gray-100">
              <div>
                <span className="text-3xl font-bold text-green-700">₹{selectedProduct.price_per_kg}</span>
                <span className="text-gray-500">/kg</span>
              </div>
              <span className="text-blue-600 font-medium">{selectedProduct.quantity_kg} kg available</span>
            </div>

            {/* Quantity Selector in Modal */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => handleQuantityChange(selectedProduct.id, (quantities[selectedProduct.id] || 1) - 1)}
                className="w-10 h-10 rounded-full bg-green-100 text-green-700 font-bold text-xl flex items-center justify-center hover:bg-green-200"
              >−</button>
              <span className="font-bold text-gray-700 text-lg w-16 text-center">
                {quantities[selectedProduct.id] || 1} kg
              </span>
              <button
                onClick={() => handleQuantityChange(selectedProduct.id, (quantities[selectedProduct.id] || 1) + 1)}
                className="w-10 h-10 rounded-full bg-green-100 text-green-700 font-bold text-xl flex items-center justify-center hover:bg-green-200"
              >+</button>
              <span className="text-green-700 font-bold text-xl ml-auto">
                ₹{((quantities[selectedProduct.id] || 1) * selectedProduct.price_per_kg).toFixed(0)}
              </span>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { addToCart(selectedProduct); setSelectedProduct(null) }}
                className="flex-1 border-2 border-green-600 text-green-600 py-3 rounded-xl font-bold hover:bg-green-50 transition"
              >
                🛒 Add to Cart
              </button>
              <button
                onClick={() => handleOrder(selectedProduct)}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition"
              >
                ⚡ Buy Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Marketplace