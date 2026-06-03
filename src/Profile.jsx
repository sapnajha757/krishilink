import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import Loading from './Loading'
import { useLanguage } from './i18n/LanguageContext'

const AVATAR_BUCKET = 'avatars'

function Profile({ user }) {
  const { t } = useLanguage()
  const [form, setForm] = useState({ full_name: '', phone: '', location: '', role: '', avatar_url: '' })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (user?.id) fetchProfile()
  }, [user?.id])

  const fetchProfile = async () => {
    setFetching(true)
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setForm(data)
    setFetching(false)
  }

  const uploadPhoto = async (file) => {
    if (!file.type.startsWith('image/')) {
      setError(t('imageTypeError'))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError(t('imageSizeError'))
      return
    }

    setUploadingPhoto(true)
    setError('')
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`
      setForm((prev) => ({ ...prev, avatar_url: avatarUrl }))
      await supabase.from('profiles').upsert({ id: user.id, avatar_url: avatarUrl })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message || t('uploadFailed'))
    }
    setUploadingPhoto(false)
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) uploadPhoto(file)
    e.target.value = ''
  }

  const handleSave = async () => {
    if (!form.full_name?.trim()) {
      setError(t('enterName'))
      return
    }
    setLoading(true)
    setError('')
    const { error: saveError } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: form.full_name.trim(),
      phone: form.phone || '',
      location: form.location || '',
      role: form.role || 'consumer',
      avatar_url: form.avatar_url || null,
    })
    if (saveError) setError(saveError.message)
    else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setLoading(false)
  }

  const avatarFallback = form.role === 'farmer' ? '👨‍🌾' : '🛒'

  if (!user?.id) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 text-center text-gray-500">
        {t('login')}
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-4 sm:py-8">
      <div className="bg-white rounded-2xl shadow p-6 sm:p-8">
        {fetching ? (
          <Loading label={t('loadingProfile')} />
        ) : (
          <>
            <div className="flex flex-col items-center mb-8">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="relative group mb-3 disabled:opacity-60"
              >
                {form.avatar_url ? (
                  <img
                    src={form.avatar_url}
                    alt={form.full_name || t('yourName')}
                    className="w-24 h-24 rounded-full object-cover border-4 border-green-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center text-5xl border-4 border-green-200">
                    {avatarFallback}
                  </div>
                )}
                <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition">
                  {uploadingPhoto ? t('uploading') : t('changePhoto')}
                </span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              <h2 className="text-xl font-bold text-green-800">{form.full_name || t('yourName')}</h2>
              <span className="text-sm text-gray-500 capitalize">{form.role === 'farmer' ? t('farmer') : form.role === 'consumer' ? t('consumer') : form.role}</span>
              <p className="text-sm text-gray-400 mt-1">{user.email}</p>
              {form.role === 'farmer' && (
                <p className="text-xs text-green-600 mt-2 text-center">{t('farmerListingHint')}</p>
              )}
            </div>

            {saved && (
              <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl mb-4 text-center font-medium">
                {t('profileSaved')}
              </div>
            )}
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl mb-4 text-center text-sm">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">
                  {form.role === 'farmer' ? t('farmerName') : t('fullName')}
                </label>
                <input
                  value={form.full_name || ''}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder={t('fullName')}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">{t('phoneNumber')}</label>
                <input
                  value={form.phone || ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder={t('phonePlaceholder')}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">{t('location')}</label>
                <input
                  value={form.location || ''}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder={t('locationPlaceholder')}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">{t('role')}</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, role: 'consumer' })}
                    className={`flex-1 border-2 rounded-xl py-3 font-medium transition ${form.role === 'consumer' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
                  >🛒 {t('consumer')}</button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, role: 'farmer' })}
                    className={`flex-1 border-2 rounded-xl py-3 font-medium transition ${form.role === 'farmer' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
                  >👨‍🌾 {t('farmer')}</button>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={loading || uploadingPhoto}
              className="w-full mt-6 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? t('saving') : t('saveProfile')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default Profile
