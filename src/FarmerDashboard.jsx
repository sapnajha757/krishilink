import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import ChatPanel from './ChatPanel'
import LanguageSelector from './components/LanguageSelector'
import { useLanguage } from './i18n/LanguageContext'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

function FarmerDashboard({ user }) {
  const { t } = useLanguage()
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [activeTab, setActiveTab] = useState('products')
  const [advisory, setAdvisory] = useState('')
  const [weatherSource, setWeatherSource] = useState('')
  const [forecast, setForecast] = useState([])
  const [advisoryLoading, setAdvisoryLoading] = useState(false)
  const [advisoryForm, setAdvisoryForm] = useState({ location: '', month: '' })
  const [showChat, setShowChat] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', price_per_kg: '', quantity_kg: '', category: 'Vegetables', location: '', is_available: true
  })

  useEffect(() => { fetchProducts(); fetchOrders() }, [])

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('farmer_id', user.id)
    if (data) setProducts(data)
  }

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, products(name, category)')
      .eq('farmer_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setOrders(data)
  }

  const getAdvisory = async () => {
    if (!advisoryForm.location) {
      alert(t('enterLocation')); return
    }
    setAdvisoryLoading(true)
    setAdvisory('')
    setForecast([])
    setWeatherSource('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/weather-advisory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: advisoryForm.location,
        })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'API request failed')
      }
      setAdvisory(data.advisory || data.result || 'No advisory returned.')
      setForecast(data.forecast || [])
      setWeatherSource(data.source || '')
    } catch (err) {
      setAdvisory(`An error occurred: ${err.message}. Please check the server.`)
    }
    setAdvisoryLoading(false)
  }

  const handleAdd = async () => {
    if (!form.name || !form.price_per_kg || !form.quantity_kg || !form.location) {
      alert(t('fillAllFields')); return
    }
    setLoading(true)
    await supabase.from('products').insert({
      ...form,
      farmer_id: user.id,
      price_per_kg: parseFloat(form.price_per_kg),
      quantity_kg: parseFloat(form.quantity_kg),
    })
    resetForm()
    fetchProducts()
    setLoading(false)
  }

  const handleEdit = async () => {
    setLoading(true)
    await supabase.from('products').update({
      ...form,
      price_per_kg: parseFloat(form.price_per_kg),
      quantity_kg: parseFloat(form.quantity_kg),
    }).eq('id', editProduct.id)
    resetForm()
    fetchProducts()
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm(t('deleteProduct'))) return
    await supabase.from('products').delete().eq('id', id)
    fetchProducts()
  }

  const toggleAvailability = async (p) => {
    await supabase.from('products').update({ is_available: !p.is_available }).eq('id', p.id)
    fetchProducts()
  }

  const resetForm = () => {
    setForm({ name: '', description: '', price_per_kg: '', quantity_kg: '', category: 'Vegetables', location: '', is_available: true })
    setShowForm(false)
    setEditProduct(null)
  }

  const openEdit = (p) => {
    setEditProduct(p)
    setForm({
      name: p.name, description: p.description, price_per_kg: p.price_per_kg,
      quantity_kg: p.quantity_kg, category: p.category, location: p.location, is_available: p.is_available
    })
    setShowForm(true)
    setActiveTab('products')
  }

  const totalEarnings = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.total_price, 0)

  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const chatContacts = [...new Set(orders.map((o) => o.consumer_id).filter(Boolean))]
    .filter((id) => id !== user?.id)
    .map((id) => ({ id, label: t('buyer') }))

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
      <div className="flex flex-wrap gap-2 justify-end mb-4">
        <LanguageSelector />
        <button onClick={() => setShowChat(true)} className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-200">
          💬 {t('messages')}
        </button>
      </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow p-5 text-center">
            <p className="text-3xl font-bold text-green-700">{products.length}</p>
            <p className="text-gray-500 text-sm mt-1">{t('totalProducts')}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-5 text-center">
            <p className="text-3xl font-bold text-yellow-600">{pendingOrders}</p>
            <p className="text-gray-500 text-sm mt-1">{t('pendingOrders')}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-5 text-center">
            <p className="text-3xl font-bold text-blue-600">₹{totalEarnings}</p>
            <p className="text-gray-500 text-sm mt-1">{t('totalEarnings')}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setActiveTab('products')} className={`px-6 py-2 rounded-xl font-medium transition ${activeTab === 'products' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-300'}`}>
            {t('myProducts')}
          </button>
          <button onClick={() => setActiveTab('orders')} className={`px-6 py-2 rounded-xl font-medium transition ${activeTab === 'orders' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-300'}`}>
            {t('incomingOrders')} {pendingOrders > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingOrders}</span>}
          </button>
          <button onClick={() => setActiveTab('advisory')} className={`px-6 py-2 rounded-xl font-medium transition ${activeTab === 'advisory' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-300'}`}>
            {t('aiAdvisory')}
          </button>
        </div>

        {activeTab === 'products' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-green-800">{t('myProducts')}</h2>
              <button onClick={() => { resetForm(); setShowForm(!showForm) }} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium">
                {showForm ? t('cancel') : t('addProduct')}
              </button>
            </div>

            {showForm && (
              <div className="bg-white rounded-2xl shadow p-6 mb-6">
                <h3 className="text-lg font-bold text-green-700 mb-4">{editProduct ? t('editProduct') : t('addNewProduct')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder={t('productName')} value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500" />
                  <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500">
                    <option value="Vegetables">{t('vegetables')}</option>
                    <option value="Fruits">{t('fruits')}</option>
                    <option value="Grains">{t('grains')}</option>
                    <option value="Dairy">{t('dairy')}</option>
                  </select>
                  <input placeholder={t('pricePerKg')} value={form.price_per_kg} onChange={(e) => setForm({...form, price_per_kg: e.target.value})} type="number" className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500" />
                  <input placeholder={t('availableQty')} value={form.quantity_kg} onChange={(e) => setForm({...form, quantity_kg: e.target.value})} type="number" className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500" />
                  <input placeholder={t('locationPlaceholder')} value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500" />
                  <input placeholder={t('description')} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500" />
                </div>
                <button onClick={editProduct ? handleEdit : handleAdd} disabled={loading} className="mt-4 bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-bold w-full">
                  {loading ? t('saving') : editProduct ? t('saveChanges') : t('addProductBtn')}
                </button>
              </div>
            )}

            {products.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-5xl mb-4">🌾</p>
                <p className="text-xl">{t('noProductsYet')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((p) => (
                  <div key={p.id} className={`bg-white rounded-2xl shadow p-5 hover:shadow-md border-2 ${p.is_available ? 'border-transparent' : 'border-red-200'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getCategoryEmoji(p.category)}</span>
                          <h3 className="font-bold text-lg text-green-800">{p.name}</h3>
                        </div>
                        <p className="text-gray-500 text-sm mt-1">{p.category} • 📍 {p.location}</p>
                        <p className="text-gray-600 text-sm mt-1">{p.description}</p>
                      </div>
                      <div className="flex flex-col gap-2 ml-3">
                        <button onClick={() => openEdit(p)} className="text-blue-400 hover:text-blue-600 text-lg">✏️</button>
                        <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 text-lg">🗑️</button>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 flex-wrap items-center">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">₹{p.price_per_kg}/kg</span>
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">{p.quantity_kg} kg</span>
                      <button onClick={() => toggleAvailability(p)} className={`ml-auto px-3 py-1 rounded-full text-xs font-medium transition ${p.is_available ? 'bg-green-500 text-white' : 'bg-red-100 text-red-600'}`}>
                        {p.is_available ? t('available') : t('hidden')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'orders' && (
          <>
            <h2 className="text-xl font-bold text-green-800 mb-4">{t('incomingOrdersTitle')}</h2>
            {orders.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-5xl mb-4">📦</p>
                <p className="text-xl">{t('noIncomingOrders')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl shadow p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-800">{getCategoryEmoji(order.products?.category)} {order.products?.name || 'Product'}</p>
                        <p className="text-gray-500 text-sm mt-1">{order.quantity_kg} kg • ₹{order.total_price}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${getStatusColor(order.status)}`}>{order.status}</span>
                        {order.status === 'pending' && (
                          <button onClick={async () => { await supabase.from('orders').update({ status: 'confirmed' }).eq('id', order.id); fetchOrders() }} className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full hover:bg-blue-600">{t('confirmOrder')}</button>
                        )}
                        {order.status === 'confirmed' && (
                          <button onClick={async () => { await supabase.from('orders').update({ status: 'delivered' }).eq('id', order.id); fetchOrders() }} className="text-xs bg-green-500 text-white px-3 py-1 rounded-full hover:bg-green-600">{t('markDelivered')}</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'advisory' && (
          <div>
            <h2 className="text-xl font-bold text-green-800 mb-4">{t('aiCropAdvisory')}</h2>
            <div className="bg-white rounded-2xl shadow p-6 mb-6">
              <p className="text-gray-600 mb-4">{t('advisoryIntro')}</p>
              <div className="grid grid-cols-1 gap-4 mb-4">
                <input
                  placeholder={t('locationPlaceholder')}
                  value={advisoryForm.location}
                  onChange={(e) => setAdvisoryForm({...advisoryForm, location: e.target.value})}
                  className="border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500"
                />
              </div>
              <button
                onClick={getAdvisory}
                disabled={advisoryLoading}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition"
              >
                {advisoryLoading ? t('fetchingAdvisory') : t('getWeatherAdvisory')}
              </button>
            </div>
            {advisory && (
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6">
                <h3 className="font-bold text-green-800 mb-3">{t('aiRecommendation')}</h3>
                {weatherSource && (
                  <p className="text-xs text-gray-500 mb-2">{t('source')} {weatherSource}</p>
                )}
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{advisory}</p>
              </div>
            )}
            {forecast.length > 0 && (
              <div className="bg-white rounded-2xl shadow p-6 mt-6">
                <h3 className="font-bold text-green-800 mb-3">{t('forecastTitle')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {forecast.map((day) => (
                    <div key={day.date} className="border border-green-100 rounded-xl p-3">
                      <p className="font-semibold text-gray-800">{new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                      <p className="text-sm text-gray-600">{day.condition} {day.predicted ? t('predicted') : ''}</p>
                      <p className="text-sm text-gray-700">🌡️ {day.temp_min_c}°C - {day.temp_max_c}°C</p>
                      <p className="text-sm text-gray-700">💧 {t('humidity')} {day.humidity}%</p>
                      <p className="text-sm text-gray-700">🌧️ {t('rain')} {day.rain_mm} mm</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      {showChat && (
        <ChatPanel
          user={user}
          contacts={chatContacts}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  )
}

export default FarmerDashboard