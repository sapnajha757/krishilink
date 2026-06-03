import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import LanguageSelector from './components/LanguageSelector'
import { useLanguage } from './i18n/LanguageContext'

function AdminPanel({ user, onBack }) {
  const { t } = useLanguage()
  const [users, setUsers] = useState([])
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [tab, setTab] = useState('analytics')
  const [loading, setLoading] = useState(false)
  const [actionLoadingUserId, setActionLoadingUserId] = useState('')
  const [error, setError] = useState('')

  const fetchAll = async () => {
    setLoading(true)
    setError('')
    const [usersRes, ordersRes, productsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*, products(name, category)').order('created_at', { ascending: false }),
      supabase.from('products').select('*'),
    ])

    if (usersRes.error || ordersRes.error || productsRes.error) {
      setError(usersRes.error?.message || ordersRes.error?.message || productsRes.error?.message || 'Failed to load admin data')
    }
    setUsers(usersRes.data || [])
    setOrders(ordersRes.data || [])
    setProducts(productsRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const analytics = useMemo(() => {
    const deliveredRevenue = orders.filter((o) => o.status === 'delivered').reduce((sum, o) => sum + Number(o.total_price || 0), 0)
    const pendingOrders = orders.filter((o) => o.status === 'pending').length
    const flaggedUsers = users.filter((u) => u.is_flagged === true).length
    const suspendedUsers = users.filter((u) => u.is_suspended === true).length
    return {
      totalUsers: users.length,
      totalFarmers: users.filter((u) => u.role === 'farmer').length,
      totalConsumers: users.filter((u) => u.role === 'consumer').length,
      totalOrders: orders.length,
      pendingOrders,
      deliveredRevenue,
      totalProducts: products.length,
      flaggedUsers,
      suspendedUsers,
    }
  }, [orders, products.length, users])

  const toggleUserFlagOrSuspend = async (targetUser, field) => {
    if (!targetUser?.id) return
    setActionLoadingUserId(targetUser.id)
    setError('')
    const nextValue = !targetUser[field]
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ [field]: nextValue })
      .eq('id', targetUser.id)

    if (updateError) {
      setError(
        `${field} update failed: ${updateError.message}. Ensure '${field}' boolean column exists in profiles and RLS allows admin updates.`
      )
    } else {
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, [field]: nextValue } : u)))
    }
    setActionLoadingUserId('')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('adminPanel')}</h1>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
        <div className="flex gap-2 items-center">
          <LanguageSelector />
          <button onClick={fetchAll} className="bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">{t('refresh')}</button>
        </div>
      </div>
        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setTab('analytics')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'analytics' ? 'bg-gray-900 text-white' : 'bg-white border'}`}>{t('analytics')}</button>
          <button onClick={() => setTab('users')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'users' ? 'bg-gray-900 text-white' : 'bg-white border'}`}>{t('users')}</button>
          <button onClick={() => setTab('orders')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'orders' ? 'bg-gray-900 text-white' : 'bg-white border'}`}>{t('allOrders')}</button>
        </div>

        {loading ? (
          <div className="text-gray-500">{t('loadingAdmin')}</div>
        ) : (
          <>
            {tab === 'analytics' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat title={t('totalUsers')} value={analytics.totalUsers} />
                <Stat title={t('farmers')} value={analytics.totalFarmers} />
                <Stat title={t('consumers')} value={analytics.totalConsumers} />
                <Stat title={t('totalProducts')} value={analytics.totalProducts} />
                <Stat title={t('allOrders')} value={analytics.totalOrders} />
                <Stat title={t('pendingOrders')} value={analytics.pendingOrders} />
                <Stat title={t('deliveredRevenue')} value={`₹${analytics.deliveredRevenue}`} />
                <Stat title={t('flaggedSuspended')} value={`${analytics.flaggedUsers} / ${analytics.suspendedUsers}`} />
              </div>
            )}

            {tab === 'users' && (
              <div className="bg-white rounded-xl shadow border overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="text-left px-4 py-3">{t('name')}</th>
                      <th className="text-left px-4 py-3">{t('role')}</th>
                      <th className="text-left px-4 py-3">{t('flaggedCol')}</th>
                      <th className="text-left px-4 py-3">{t('suspendedCol')}</th>
                      <th className="text-left px-4 py-3">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{u.full_name || u.email || u.id}</p>
                          <p className="text-xs text-gray-500">{u.id}</p>
                        </td>
                        <td className="px-4 py-3 capitalize">{u.role || 'user'}</td>
                        <td className="px-4 py-3">{u.is_flagged ? t('yes') : t('no')}</td>
                        <td className="px-4 py-3">{u.is_suspended ? t('yes') : t('no')}</td>
                        <td className="px-4 py-3 flex gap-2">
                          <button
                            onClick={() => toggleUserFlagOrSuspend(u, 'is_flagged')}
                            disabled={actionLoadingUserId === u.id}
                            className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200 disabled:opacity-70"
                          >
                            {u.is_flagged ? t('unflag') : t('flag')}
                          </button>
                          <button
                            onClick={() => toggleUserFlagOrSuspend(u, 'is_suspended')}
                            disabled={actionLoadingUserId === u.id}
                            className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 disabled:opacity-70"
                          >
                            {u.is_suspended ? t('unsuspend') : t('suspend')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'orders' && (
              <div className="bg-white rounded-xl shadow border overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="text-left px-4 py-3">{t('order')}</th>
                      <th className="text-left px-4 py-3">{t('productCol')}</th>
                      <th className="text-left px-4 py-3">{t('qty')}</th>
                      <th className="text-left px-4 py-3">{t('amountLabel')}</th>
                      <th className="text-left px-4 py-3">{t('status')}</th>
                      <th className="text-left px-4 py-3">{t('date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-t">
                        <td className="px-4 py-3">{o.id}</td>
                        <td className="px-4 py-3">{o.products?.name || 'Product'}</td>
                        <td className="px-4 py-3">{o.quantity_kg} kg</td>
                        <td className="px-4 py-3">₹{o.total_price}</td>
                        <td className="px-4 py-3 capitalize">{o.status}</td>
                        <td className="px-4 py-3">{new Date(o.created_at).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
    </div>
  )
}

function Stat({ title, value }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

export default AdminPanel
