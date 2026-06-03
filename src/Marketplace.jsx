import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import ChatPanel from './ChatPanel'
import Loading from './Loading'
import LanguageSelector from './components/LanguageSelector'
import { useLanguage } from './i18n/LanguageContext'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

function Marketplace({ user }) {
  const { t } = useLanguage()
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
  const [showPayments, setShowPayments] = useState(false)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentDetailsByOrder, setPaymentDetailsByOrder] = useState({})
  const [refreshingOrderId, setRefreshingOrderId] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [farmers, setFarmers] = useState({})
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('online')
  const [showChat, setShowChat] = useState(false)
  const [buyNowItem, setBuyNowItem] = useState(null)
  const [buyNowPaymentMethod, setBuyNowPaymentMethod] = useState('online')
  const [receipt, setReceipt] = useState(null)

  useEffect(() => { fetchProducts() }, [])

  useEffect(() => {
    let data = products
    if (category !== 'All') data = data.filter(p => p.category === category)
    if (search) data = data.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    setFiltered(data)
  }, [search, category, products])

  useEffect(() => {
    if (!showPayments || payments.length === 0) return

    const intervalId = setInterval(() => {
      payments.forEach((payment) => {
        const orderId = payment.order_id || payment.orderId
        if (orderId) refreshPaymentStatus(orderId)
      })
    }, 15000)

    return () => clearInterval(intervalId)
  }, [showPayments, payments])

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
      .select('id, full_name, avatar_url')
      .in('id', farmerIds)
    if (data) {
      const map = {}
      data.forEach(f => { map[f.id] = { name: f.full_name, avatar_url: f.avatar_url } })
      setFarmers(map)
    }
  }

  // FIX: user check added
  const fetchOrders = async () => {
    if (!user) { setOrdersLoading(false); return }
    setOrdersLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*, products(name, category)')
      .eq('consumer_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setOrders(data)
    setOrdersLoading(false)
  }

  const fetchPayments = async () => {
    if (!user) { setPaymentsLoading(false); return }
    setPaymentsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments?consumerId=${encodeURIComponent(user.id)}`)
      const data = await response.json()
      if (response.ok) {
        setPayments(data.payments || [])
      } else {
        setPayments([])
      }
    } catch {
      setPayments([])
    }
    setPaymentsLoading(false)
  }

  const refreshPaymentStatus = async (orderId) => {
    if (!orderId) return
    setRefreshingOrderId(orderId)
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/status/${encodeURIComponent(orderId)}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch payment status')
      }

      setPaymentDetailsByOrder(prev => ({
        ...prev,
        [orderId]: data,
      }))
    } catch (error) {
      setPaymentDetailsByOrder(prev => ({
        ...prev,
        [orderId]: { error: error.message },
      }))
    }
    setRefreshingOrderId('')
  }

  const handleQuantityChange = (productId, value) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, Math.min(Number(value), 100))
    }))
  }

  const placeSingleOrder = async ({ product, qty, method }) => {
    const nextStatus = method === 'cod' ? 'confirmed' : 'pending'
    const { data, error } = await supabase.from('orders').insert({
      consumer_id: user.id,
      farmer_id: product.farmer_id,
      product_id: product.id,
      quantity_kg: qty,
      total_price: product.price_per_kg * qty,
      status: nextStatus
    }).select('id, quantity_kg, total_price, status, created_at').single()
    if (error) throw new Error(error.message || 'Failed to place order')
    return data
  }

  const openBuyNowCheckout = (product) => {
    if (!user) { alert(t('loginToOrder')); return }
    const qty = quantities[product.id] || 1
    setBuyNowItem({
      ...product,
      qty,
      amount: product.price_per_kg * qty,
    })
    setBuyNowPaymentMethod('online')
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
    setOrdered(t('addedToCart', { name: product.name }))
    setTimeout(() => setOrdered(null), 2000)
  }

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price_per_kg * item.cartQty, 0)
  const chatContacts = [...new Set(products.map((p) => p.farmer_id).filter(Boolean))]
    .filter((id) => id !== user?.id)
    .map((id) => ({ id, label: farmers[id]?.name || 'Farmer' }))

  const FarmerBadge = ({ farmerId }) => {
    const farmer = farmers[farmerId]
    if (!farmer?.name) return null
    return (
      <div className="flex items-center gap-2 mt-1">
        {farmer.avatar_url ? (
          <img src={farmer.avatar_url} alt={farmer.name} className="w-6 h-6 rounded-full object-cover" />
        ) : (
          <span className="text-sm">👨‍🌾</span>
        )}
        <p className="text-green-600 text-sm">{farmer.name}</p>
      </div>
    )
  }

  const placeCartOrders = async (method = 'online') => {
    if (!user) { alert(t('loginToPlaceOrders')); return }
    const nextStatus = method === 'cod' ? 'confirmed' : 'pending'
    const inserts = cart.map(item => ({
      consumer_id: user.id,
      farmer_id: item.farmer_id,
      product_id: item.id,
      quantity_kg: item.cartQty,
      total_price: item.price_per_kg * item.cartQty,
      status: nextStatus
    }))
    const { data, error } = await supabase.from('orders').insert(inserts).select('id, quantity_kg, total_price, status, created_at')
    if (!error) {
      setReceipt({
        type: 'cart',
        orderCount: data?.length || inserts.length,
        paymentMethod: method,
        totalAmount: cartTotal,
        createdAt: new Date().toISOString(),
        firstOrderId: data?.[0]?.id || null,
      })
      setCart([])
      setShowCart(false)
      setOrdered(t('ordersPlacedSuccess'))
      setTimeout(() => setOrdered(null), 3000)
    }
  }

  const loadRazorpayScript = () => {
    if (window.Razorpay) return Promise.resolve(true)
    return new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const handleCheckout = async () => {
    if (!user) { alert(t('loginToCheckout')); return }
    if (cart.length === 0) { alert(t('cartEmptyAlert')); return }

    if (paymentMethod === 'cod') {
      setCheckoutLoading(true)
      try {
        await placeCartOrders('cod')
        setOrdered(t('ordersPlacedSuccess'))
        setTimeout(() => setOrdered(null), 4000)
      } finally {
        setCheckoutLoading(false)
      }
      return
    }

    setCheckoutLoading(true)
    try {
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) throw new Error('Razorpay SDK load failed')

      const checkoutPayload = {
        consumerId: user.id,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          farmer_id: item.farmer_id,
          quantity_kg: item.cartQty,
          price_per_kg: item.price_per_kg,
        })),
      }

      const checkoutRes = await fetch(`${API_BASE_URL}/api/payments/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload),
      })
      const checkoutData = await checkoutRes.json()
      if (!checkoutRes.ok) throw new Error(checkoutData?.error || 'Checkout init failed')

      const options = {
        key: checkoutData.keyId,
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        name: 'KrishiLink',
        description: 'Order checkout',
        order_id: checkoutData.orderId,
        prefill: {
          email: user.email || '',
        },
        theme: {
          color: '#15803d',
        },
        handler: async (response) => {
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/api/payments/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            })
            const verifyData = await verifyRes.json()
            if (!verifyRes.ok || !verifyData.verified) {
              throw new Error(verifyData?.error || 'Payment verification failed')
            }

            await placeCartOrders('online')
            setOrdered(`Payment ${verifyData.paymentStatus || 'successful'} • Orders placed!`)
            setTimeout(() => setOrdered(null), 4000)
          } catch (error) {
            setOrdered(`Payment failed: ${error.message}`)
            setTimeout(() => setOrdered(null), 4000)
          }
        },
        modal: {
          ondismiss: () => {
            setOrdered(t('paymentCancelled'))
            setTimeout(() => setOrdered(null), 2000)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (error) {
      setOrdered(`Checkout error: ${error.message}`)
      setTimeout(() => setOrdered(null), 4000)
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleBuyNowCheckout = async () => {
    if (!buyNowItem || !user) return
    setCheckoutLoading(true)
    try {
      if (buyNowPaymentMethod === 'cod') {
        const createdOrder = await placeSingleOrder({ product: buyNowItem, qty: buyNowItem.qty, method: 'cod' })
        setReceipt({
          type: 'single',
          orderId: createdOrder?.id,
          productName: buyNowItem.name,
          quantity: buyNowItem.qty,
          totalAmount: buyNowItem.amount,
          paymentMethod: 'cod',
          status: createdOrder?.status || 'confirmed',
          createdAt: createdOrder?.created_at || new Date().toISOString(),
        })
        setOrdered(t('orderPlacedCod', { name: buyNowItem.name }))
        setBuyNowItem(null)
        setSelectedProduct(null)
        setTimeout(() => setOrdered(null), 3500)
        return
      }

      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) throw new Error('Razorpay SDK load failed')

      const checkoutRes = await fetch(`${API_BASE_URL}/api/payments/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumerId: user.id,
          items: [{
            id: buyNowItem.id,
            name: buyNowItem.name,
            farmer_id: buyNowItem.farmer_id,
            quantity_kg: buyNowItem.qty,
            price_per_kg: buyNowItem.price_per_kg,
          }],
        }),
      })
      const checkoutData = await checkoutRes.json()
      if (!checkoutRes.ok) throw new Error(checkoutData?.error || 'Checkout init failed')

      const options = {
        key: checkoutData.keyId,
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        name: 'KrishiLink',
        description: `Order: ${buyNowItem.name}`,
        order_id: checkoutData.orderId,
        prefill: { email: user.email || '' },
        theme: { color: '#15803d' },
        handler: async (response) => {
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/api/payments/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            })
            const verifyData = await verifyRes.json()
            if (!verifyRes.ok || !verifyData.verified) {
              throw new Error(verifyData?.error || 'Payment verification failed')
            }

            const createdOrder = await placeSingleOrder({ product: buyNowItem, qty: buyNowItem.qty, method: 'online' })
            setReceipt({
              type: 'single',
              orderId: createdOrder?.id,
              productName: buyNowItem.name,
              quantity: buyNowItem.qty,
              totalAmount: buyNowItem.amount,
              paymentMethod: 'online',
              status: createdOrder?.status || 'pending',
              createdAt: createdOrder?.created_at || new Date().toISOString(),
            })
            setOrdered(`Payment ${verifyData.paymentStatus || 'successful'} • Order placed!`)
            setBuyNowItem(null)
            setSelectedProduct(null)
            setTimeout(() => setOrdered(null), 4000)
          } catch (error) {
            setOrdered(`Payment failed: ${error.message}`)
            setTimeout(() => setOrdered(null), 4000)
          }
        },
        modal: {
          ondismiss: () => {
            setOrdered(t('paymentCancelled'))
            setTimeout(() => setOrdered(null), 2000)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (error) {
      setOrdered(`Checkout error: ${error.message}`)
      setTimeout(() => setOrdered(null), 3500)
    } finally {
      setCheckoutLoading(false)
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

  const categoryKeys = {
    All: 'all',
    Vegetables: 'vegetables',
    Fruits: 'fruits',
    Grains: 'grains',
    Dairy: 'dairy',
  }

  return (
    <div>
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 flex flex-wrap gap-1.5 sm:gap-3 items-center justify-end border-b border-green-100">
        <LanguageSelector />
        <button
          onClick={() => { setShowCart(true); setShowOrders(false) }}
          className="relative bg-green-50 text-green-700 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-base font-medium hover:bg-green-100 transition"
        >
          <span className="sm:hidden">🛒</span><span className="hidden sm:inline">🛒 {t('cart')}</span>
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            if (!user) { alert(t('loginViewOrders')); return }
            setShowOrders(true)
            setShowCart(false)
            setShowPayments(false)
            fetchOrders()
          }}
          className="bg-blue-50 text-blue-700 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-base font-medium hover:bg-blue-100 transition"
        >
          <span className="sm:hidden">📦</span><span className="hidden sm:inline">📦 {t('myOrders')}</span>
        </button>
        <button
          onClick={() => {
            if (!user) { alert(t('loginChat')); return }
            setShowChat(true)
          }}
          className="bg-emerald-50 text-emerald-700 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-base font-medium hover:bg-emerald-100 transition"
        >
          <span className="sm:hidden">💬</span><span className="hidden sm:inline">💬 {t('messages')}</span>
        </button>
        <button
          onClick={() => {
            if (!user) { alert(t('loginPayments')); return }
            setShowPayments(true)
            setShowOrders(false)
            setShowCart(false)
            fetchPayments()
          }}
          className="bg-purple-50 text-purple-700 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-base font-medium hover:bg-purple-100 transition"
        >
          <span className="sm:hidden">💳</span><span className="hidden sm:inline">💳 {t('payments')}</span>
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-8">

        {/* Success Toast */}
        {ordered && (
          <div className="bg-green-600 text-white px-6 py-3 rounded-xl mb-4 text-center font-medium animate-pulse">
            ✅ {ordered}
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <input
            placeholder={t('searchPlaceholder')}
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
                {t(categoryKeys[cat])}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <Loading label={t('loadingProducts')} size="lg" className="py-20" />
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">🥦</p>
            <p className="text-xl">{t('noProducts')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filtered.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow hover:shadow-lg transition p-5 flex flex-col">

                {/* Product Emoji */}
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
                <FarmerBadge farmerId={p.farmer_id} />
                <p className="text-gray-600 text-sm mt-1 line-clamp-2">{p.description}</p>

                {/* Price & Stock */}
                <div className="flex justify-between items-center mt-4">
                  <div>
                    <span className="text-2xl font-bold text-green-700">₹{p.price_per_kg}</span>
                    <span className="text-gray-500 text-sm">{t('perKg')}</span>
                  </div>
                  <span className="text-blue-600 text-sm font-medium">{p.quantity_kg}kg {t('left')}</span>
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
                    {t('addToCart')}
                  </button>
                  <button
                    onClick={() => openBuyNowCheckout(p)}
                    className="flex-1 bg-green-600 text-white py-2 rounded-xl font-medium hover:bg-green-700 transition text-sm"
                  >
                    {t('buyNow')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== CART SIDEBAR ========== */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col sm:flex-row">
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm order-2 sm:order-1 min-h-0 sm:min-h-full"
            onClick={() => setShowCart(false)}
          />
          <div className="w-full sm:max-w-md bg-white shadow-2xl flex flex-col overflow-hidden order-1 sm:order-2 max-h-[92vh] sm:max-h-none sm:h-full rounded-t-2xl sm:rounded-none">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b flex justify-between items-center bg-green-700 text-white shrink-0">
              <h2 className="text-lg sm:text-xl font-bold">{t('yourCart', { count: cart.length })}</h2>
              <button onClick={() => setShowCart(false)} className="text-white text-2xl p-1" aria-label="Close cart">×</button>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <p className="text-5xl mb-4">🛒</p>
                <p className="text-lg">{t('cartEmpty')}</p>
                <p className="text-sm mt-1">{t('cartEmptyHint')}</p>
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
                        >{t('remove')}</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t bg-white shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <div className="flex justify-between items-center mb-3 sm:mb-4">
                    <span className="text-gray-600 font-medium text-sm sm:text-base">{t('totalAmount')}</span>
                    <span className="text-xl sm:text-2xl font-bold text-green-700">₹{cartTotal.toFixed(0)}</span>
                  </div>
                  <div className="mb-3 sm:mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">{t('selectPayment')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('online')}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium border ${paymentMethod === 'online' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-gray-300 text-gray-600'}`}
                      >
                        {t('onlinePayment')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cod')}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium border ${paymentMethod === 'cod' ? 'bg-yellow-100 border-yellow-500 text-yellow-700' : 'bg-white border-gray-300 text-gray-600'}`}
                      >
                        {t('cod')}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={checkoutLoading}
                    className="w-full bg-green-600 text-white py-3 sm:py-3.5 rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-70 flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    {checkoutLoading && (
                      <span className="h-5 w-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    )}
                    {checkoutLoading
                      ? t('processingPayment')
                      : paymentMethod === 'cod'
                        ? t('placeOrderCod')
                        : t('payRazorpay')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========== ORDER HISTORY SIDEBAR ========== */}
      {showOrders && (
        <div className="fixed inset-0 z-50 flex flex-col sm:flex-row">
          <div className="flex-1 bg-black/40 backdrop-blur-sm order-2 sm:order-1" onClick={() => setShowOrders(false)} />
          <div className="w-full sm:max-w-md bg-white shadow-2xl flex flex-col overflow-hidden order-1 sm:order-2 max-h-[92vh] sm:max-h-none sm:h-full rounded-t-2xl sm:rounded-none">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-blue-700 text-white">
              <h2 className="text-xl font-bold">📦 {t('myOrders')}</h2>
              <button onClick={() => setShowOrders(false)} className="text-white text-2xl">×</button>
            </div>

            {ordersLoading ? (
              <Loading label={t('loadingOrders')} className="flex-1" />
            ) : orders.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <p className="text-5xl mb-4">📦</p>
                <p className="text-lg">{t('noOrders')}</p>
                <p className="text-sm mt-1">{t('noOrdersHint')}</p>
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

      {/* ========== PAYMENT HISTORY SIDEBAR ========== */}
      {showPayments && (
        <div className="fixed inset-0 z-50 flex flex-col sm:flex-row">
          <div className="flex-1 bg-black/40 backdrop-blur-sm order-2 sm:order-1" onClick={() => setShowPayments(false)} />
          <div className="w-full sm:max-w-md bg-white shadow-2xl flex flex-col overflow-hidden order-1 sm:order-2 max-h-[92vh] sm:max-h-none sm:h-full rounded-t-2xl sm:rounded-none">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-purple-700 text-white">
              <h2 className="text-xl font-bold">{t('paymentHistory')}</h2>
              <button onClick={() => setShowPayments(false)} className="text-white text-2xl">×</button>
            </div>

            {paymentsLoading ? (
              <Loading label={t('loadingPayments')} className="flex-1" />
            ) : payments.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <p className="text-5xl mb-4">💳</p>
                <p className="text-lg">{t('noPayments')}</p>
                <p className="text-sm mt-1">{t('noPaymentsHint')}</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {payments.map(payment => (
                  <div key={payment.order_id || payment.orderId} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    {(() => {
                      const orderId = payment.order_id || payment.orderId
                      const details = paymentDetailsByOrder[orderId]
                      return (
                        <>
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm break-all">
                          Order: {orderId}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Amount: ₹{payment.amount || 0} {payment.currency || 'INR'}
                        </p>
                        {payment.method && (
                          <p className="text-xs text-gray-500 mt-1">Method: {payment.method}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(payment.updated_at || payment.created_at || Date.now()).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <span className="text-xs px-3 py-1 rounded-full font-medium capitalize bg-purple-100 text-purple-700">
                        {payment.checkout_status || 'unknown'}
                      </span>
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() => refreshPaymentStatus(orderId)}
                        disabled={refreshingOrderId === orderId}
                        className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 disabled:opacity-70"
                      >
                        {refreshingOrderId === orderId ? 'Refreshing...' : 'View payment details'}
                      </button>
                    </div>
                    {details && (
                      <div className="mt-3 bg-white border border-purple-100 rounded-lg p-3">
                        {details.error ? (
                          <p className="text-xs text-red-600">Error: {details.error}</p>
                        ) : (
                          <>
                            <p className="text-xs text-gray-700">Live status: <span className="font-semibold capitalize">{details.checkout_status || 'unknown'}</span></p>
                            <p className="text-xs text-gray-700 mt-1">Verified: {details.verified === true ? 'Yes' : details.verified === false ? 'No' : 'N/A'}</p>
                            {details.payment_id && (
                              <p className="text-xs text-gray-700 mt-1 break-all">Payment ID: {details.payment_id}</p>
                            )}
                            {details.method && (
                              <p className="text-xs text-gray-700 mt-1">Method: {details.method}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">Source: {details.source || 'live'}</p>
                          </>
                        )}
                      </div>
                    )}
                        </>
                      )
                    })()}
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
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
            <div className="mt-2">
              <FarmerBadge farmerId={selectedProduct.farmer_id} />
            </div>
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
                {t('addToCart')}
              </button>
              <button
                onClick={() => openBuyNowCheckout(selectedProduct)}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition"
              >
                {t('buyNow')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showChat && (
        <ChatPanel
          user={user}
          contacts={chatContacts}
          onClose={() => setShowChat(false)}
        />
      )}

      {buyNowItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setBuyNowItem(null)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
            <h3 className="text-lg sm:text-xl font-bold text-green-800">{t('placeOrder')}</h3>
            <p className="text-sm text-gray-600 mt-1 capitalize">{buyNowItem.name} • {buyNowItem.qty} kg</p>
            <p className="text-lg font-bold text-green-700 mt-3">Total: ₹{buyNowItem.amount.toFixed(0)}</p>

            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">{t('selectPayment')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBuyNowPaymentMethod('online')}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium border ${buyNowPaymentMethod === 'online' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-gray-300 text-gray-600'}`}
                >
                  {t('onlinePayment')}
                </button>
                <button
                  type="button"
                  onClick={() => setBuyNowPaymentMethod('cod')}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium border ${buyNowPaymentMethod === 'cod' ? 'bg-yellow-100 border-yellow-500 text-yellow-700' : 'bg-white border-gray-300 text-gray-600'}`}
                >
                  {t('cod')}
                </button>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
              <button
                type="button"
                onClick={() => setBuyNowItem(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-3 sm:py-2 rounded-lg hover:bg-gray-50 min-h-[44px]"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleBuyNowCheckout}
                disabled={checkoutLoading}
                className="flex-1 bg-green-600 text-white py-3 sm:py-2 rounded-lg hover:bg-green-700 disabled:opacity-70 flex items-center justify-center gap-2 min-h-[44px] font-medium"
              >
                {checkoutLoading && (
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                {checkoutLoading ? t('processingPayment') : buyNowPaymentMethod === 'cod' ? t('placeCodOrder') : t('payAndPlace')}
              </button>
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setReceipt(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10">
            <h3 className="text-xl font-bold text-green-800">{t('orderReceipt')}</h3>
            <div className="mt-4 space-y-2 text-sm text-gray-700">
              <p><span className="font-semibold">{t('paymentLabel')}</span> {receipt.paymentMethod === 'cod' ? t('cashOnDelivery') : t('onlinePaymentLabel')}</p>
              {receipt.type === 'single' ? (
                <>
                  <p><span className="font-semibold">{t('orderIdLabel')}</span> {receipt.orderId || 'N/A'}</p>
                  <p><span className="font-semibold">{t('productLabel')}</span> {receipt.productName}</p>
                  <p><span className="font-semibold">{t('quantityLabel')}</span> {receipt.quantity} kg</p>
                  <p><span className="font-semibold">{t('amountLabel')}</span> ₹{Number(receipt.totalAmount || 0).toFixed(0)}</p>
                  <p><span className="font-semibold">{t('statusLabel')}</span> {receipt.status}</p>
                </>
              ) : (
                <>
                  <p><span className="font-semibold">{t('ordersPlacedLabel')}</span> {receipt.orderCount}</p>
                  {receipt.firstOrderId && <p><span className="font-semibold">{t('firstOrderIdLabel')}</span> {receipt.firstOrderId}</p>}
                  <p><span className="font-semibold">{t('totalAmount')}</span> ₹{Number(receipt.totalAmount || 0).toFixed(0)}</p>
                </>
              )}
              <p><span className="font-semibold">{t('dateLabel')}</span> {new Date(receipt.createdAt || Date.now()).toLocaleString('en-IN')}</p>
            </div>
            <button
              onClick={() => setReceipt(null)}
              className="mt-6 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default Marketplace