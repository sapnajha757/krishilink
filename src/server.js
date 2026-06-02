import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import crypto from 'crypto'
import Razorpay from 'razorpay'
import { createClient } from '@supabase/supabase-js'

dotenv.config()
const app = express()
app.use(cors())
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf
    },
  })
)

const razorpayKeyId = process.env.RAZORPAY_KEY_ID
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET
const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
const razorpayEnabled = Boolean(razorpayKeyId && razorpayKeySecret)
const razorpay = razorpayEnabled
  ? new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    })
  : null
const paymentStore = new Map()
const webhookEvents = []
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const dbEnabled = Boolean(supabaseUrl && supabaseServiceKey)
const supabaseAdmin = dbEnabled ? createClient(supabaseUrl, supabaseServiceKey) : null

const savePaymentToDb = async (orderId, payload) => {
  if (!dbEnabled) return
  const { error } = await supabaseAdmin.from('payments').upsert(
    {
      order_id: orderId,
      checkout_status: payload.checkout_status || null,
      amount: payload.amount ?? null,
      currency: payload.currency || 'INR',
      consumer_id: payload.consumer_id || null,
      payment_id: payload.payment_id || null,
      verified: payload.verified ?? null,
      method: payload.method || null,
      items: payload.items || null,
      webhook_received_at: payload.webhook_received_at || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'order_id' }
  )
  if (error) {
    console.error('Supabase payment upsert error:', error.message)
  }
}

const saveWebhookEventToDb = async (event) => {
  if (!dbEnabled) return
  const { error } = await supabaseAdmin.from('payment_webhook_events').insert({
    event_id: event.id,
    event_type: event.type,
    payload: event.payload,
    created_at: event.created_at,
  })
  if (error) {
    console.error('Supabase webhook event insert error:', error.message)
  }
}

// Test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'KrishiLink backend running' })
})

const buildLocalAdvisory = ({ location, month }) => {
  const lowerMonth = String(month || '').toLowerCase()
  let season = 'mild'
  if (['march', 'april', 'may', 'june'].includes(lowerMonth)) season = 'summer'
  if (['july', 'august', 'september'].includes(lowerMonth)) season = 'monsoon'
  if (['october', 'november', 'december', 'january', 'february'].includes(lowerMonth)) season = 'winter'

  const cropMap = {
    summer: ['Bajra', 'Moong', 'Groundnut'],
    monsoon: ['Paddy', 'Maize', 'Soybean'],
    winter: ['Wheat', 'Mustard', 'Chickpea'],
    mild: ['Vegetables', 'Pulses', 'Millets'],
  }

  return [
    `Location: ${location}`,
    `Month: ${month}`,
    `Season fit: ${season}`,
    `Suggested crops: ${cropMap[season].join(', ')}`,
    'Tip: Local mandi rates aur soil type ke basis par final decision lo.',
  ].join('\n')
}

const getAiAdvisory = async ({ location, month }) => {
  const groqKey = process.env.VITE_GROQ_KEY || process.env.GROQ_API_KEY
  if (!groqKey) {
    return buildLocalAdvisory({ location, month })
  }

  try {
    const prompt = `You are an agriculture advisor for Indian farmers.
Give practical crop suggestions for:
- Location: ${location}
- Month: ${month}

Respond in simple Hinglish with:
1) Best 3 crops
2) Why suitable now
3) One risk and how to reduce it
4) 2 practical next steps`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0.4,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Groq request failed: ${response.status}`)
    }

    const data = await response.json()
    return data?.choices?.[0]?.message?.content?.trim() || buildLocalAdvisory({ location, month })
  } catch (error) {
    console.warn('AI provider failed, using local advisory fallback:', error.message)
    return buildLocalAdvisory({ location, month })
  }
}

const advisoryHandler = async (req, res) => {
  const { location, month } = req.body || {}
  if (!location || !month) {
    return res.status(400).json({ error: 'location and month are required' })
  }

  try {
    const result = await getAiAdvisory({ location, month })
    return res.json({ result })
  } catch (error) {
    console.error('Advisory API error:', error.message)
    return res.status(500).json({ error: 'Failed to generate advisory' })
  }
}

app.post('/advisory', advisoryHandler)
app.post('/api/advisory', advisoryHandler)

const toDayKey = (timestampSeconds) => {
  const d = new Date(timestampSeconds * 1000)
  return d.toISOString().slice(0, 10)
}

const getWeatherSeasonCrops = (avgTemp, avgRainMm) => {
  if (avgRainMm >= 8) {
    return ['Paddy', 'Maize', 'Soybean']
  }
  if (avgTemp >= 30) {
    return ['Bajra', 'Moong', 'Groundnut']
  }
  if (avgTemp <= 22) {
    return ['Wheat', 'Mustard', 'Chickpea']
  }
  return ['Vegetables', 'Pulses', 'Millets']
}

const buildWeatherAdvisory = ({ location, forecast }) => {
  const avgTemp =
    forecast.reduce((sum, day) => sum + (day.temp_max_c + day.temp_min_c) / 2, 0) / forecast.length
  const avgRain =
    forecast.reduce((sum, day) => sum + day.rain_mm, 0) / forecast.length

  const crops = getWeatherSeasonCrops(avgTemp, avgRain)

  return [
    `Location: ${location}`,
    `Next 7-day avg temp: ${avgTemp.toFixed(1)} C`,
    `Next 7-day avg rain: ${avgRain.toFixed(1)} mm/day`,
    `Best crop options: ${crops.join(', ')}`,
    'Action: Soil moisture monitor karo, aur irrigation/rainfall ke hisaab se sowing plan banao.',
  ].join('\n')
}

const buildFallbackForecast = () => {
  const conditions = ['Clear', 'Clouds', 'Light Rain', 'Clouds', 'Rain', 'Clear', 'Clouds']
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index)
    return {
      date: date.toISOString().slice(0, 10),
      temp_min_c: 24 + (index % 3),
      temp_max_c: 33 + (index % 2),
      humidity: 65 + (index % 4) * 4,
      rain_mm: index % 2 === 0 ? 4 : 1,
      condition: conditions[index],
      predicted: true,
    }
  })
}

const getOpenWeatherForecast = async (location) => {
  const weatherApiKey = process.env.OPENWEATHER_API_KEY || process.env.VITE_OPENWEATHER_KEY
  if (!weatherApiKey) {
    const fallback = buildFallbackForecast()
    return {
      resolvedLocation: location,
      forecast: fallback,
      source: 'fallback',
    }
  }

  const geoRes = await fetch(
    `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${weatherApiKey}`
  )
  if (!geoRes.ok) {
    throw new Error(`OpenWeather geocoding failed: ${geoRes.status}`)
  }
  const geoData = await geoRes.json()
  if (!Array.isArray(geoData) || geoData.length === 0) {
    throw new Error('Location not found in OpenWeather')
  }

  const { lat, lon, name, state, country } = geoData[0]
  const resolvedLocation = [name, state, country].filter(Boolean).join(', ')

  const forecastRes = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${weatherApiKey}`
  )
  if (!forecastRes.ok) {
    throw new Error(`OpenWeather forecast failed: ${forecastRes.status}`)
  }
  const forecastData = await forecastRes.json()
  const entries = forecastData?.list || []
  if (entries.length === 0) {
    throw new Error('No forecast data from OpenWeather')
  }

  const grouped = {}
  for (const entry of entries) {
    const key = toDayKey(entry.dt)
    if (!grouped[key]) {
      grouped[key] = {
        date: key,
        tempMin: Number.POSITIVE_INFINITY,
        tempMax: Number.NEGATIVE_INFINITY,
        humiditySum: 0,
        humidityCount: 0,
        rainMm: 0,
        condition: entry.weather?.[0]?.main || 'Clear',
      }
    }

    grouped[key].tempMin = Math.min(grouped[key].tempMin, entry.main?.temp_min ?? grouped[key].tempMin)
    grouped[key].tempMax = Math.max(grouped[key].tempMax, entry.main?.temp_max ?? grouped[key].tempMax)
    grouped[key].humiditySum += entry.main?.humidity ?? 0
    grouped[key].humidityCount += 1
    grouped[key].rainMm += entry.rain?.['3h'] ?? 0
  }

  const days = Object.values(grouped)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 7)
    .map((d) => ({
      date: d.date,
      temp_min_c: Number.isFinite(d.tempMin) ? Number(d.tempMin.toFixed(1)) : 0,
      temp_max_c: Number.isFinite(d.tempMax) ? Number(d.tempMax.toFixed(1)) : 0,
      humidity: d.humidityCount ? Math.round(d.humiditySum / d.humidityCount) : 0,
      rain_mm: Number(d.rainMm.toFixed(1)),
      condition: d.condition,
      predicted: false,
    }))

  while (days.length < 7) {
    const last = days[days.length - 1] || {
      date: new Date().toISOString().slice(0, 10),
      temp_min_c: 24,
      temp_max_c: 32,
      humidity: 65,
      rain_mm: 2,
      condition: 'Clouds',
      predicted: true,
    }
    const nextDate = new Date(last.date)
    nextDate.setDate(nextDate.getDate() + 1)
    days.push({
      ...last,
      date: nextDate.toISOString().slice(0, 10),
      predicted: true,
    })
  }

  return { resolvedLocation, forecast: days, source: 'openweather' }
}

app.post('/api/weather-advisory', async (req, res) => {
  const { location } = req.body || {}
  if (!location) {
    return res.status(400).json({ error: 'location is required' })
  }

  try {
    const weatherData = await getOpenWeatherForecast(location)
    const advisory = buildWeatherAdvisory({
      location: weatherData.resolvedLocation,
      forecast: weatherData.forecast,
    })

    return res.json({
      location: weatherData.resolvedLocation,
      source: weatherData.source,
      forecast: weatherData.forecast,
      advisory,
    })
  } catch (error) {
    console.error('Weather advisory API error:', error.message)
    return res.status(500).json({ error: 'Failed to fetch weather advisory' })
  }
})

app.get('/api/payments/config', (_req, res) => {
  if (!razorpayEnabled) {
    return res.status(503).json({ error: 'Razorpay is not configured on server' })
  }
  return res.json({ keyId: razorpayKeyId, dbEnabled })
})

app.post('/api/payments/checkout', async (req, res) => {
  if (!razorpayEnabled) {
    return res.status(503).json({ error: 'Razorpay is not configured on server' })
  }

  const { items, consumerId } = req.body || {}
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items are required for checkout' })
  }

  const totalAmount = items.reduce((sum, item) => {
    const price = Number(item.price_per_kg || 0)
    const qty = Number(item.quantity_kg || item.cartQty || 0)
    return sum + price * qty
  }, 0)

  if (!totalAmount || totalAmount <= 0) {
    return res.status(400).json({ error: 'invalid amount for checkout' })
  }

  try {
    const receipt = `rcpt_${Date.now()}`
    const order = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: 'INR',
      receipt,
      notes: {
        consumer_id: consumerId || 'guest',
        item_count: String(items.length),
      },
    })

    paymentStore.set(order.id, {
      checkout_status: 'created',
      amount: totalAmount,
      currency: 'INR',
      consumer_id: consumerId || null,
      items,
      created_at: new Date().toISOString(),
    })
    await savePaymentToDb(order.id, paymentStore.get(order.id))

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: razorpayKeyId,
      receipt: order.receipt,
    })
  } catch (error) {
    console.error('Razorpay checkout error:', error.message)
    return res.status(500).json({ error: 'Failed to create Razorpay order' })
  }
})

app.post('/api/payments/verify', async (req, res) => {
  if (!razorpayEnabled) {
    return res.status(503).json({ error: 'Razorpay is not configured on server' })
  }

  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = req.body || {}

  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({ error: 'payment verification params missing' })
  }

  const payload = `${orderId}|${paymentId}`
  const expectedSignature = crypto
    .createHmac('sha256', razorpayKeySecret)
    .update(payload)
    .digest('hex')

  const verified = expectedSignature === signature
  if (!verified) {
    paymentStore.set(orderId, {
      ...(paymentStore.get(orderId) || {}),
      checkout_status: 'verification_failed',
      payment_id: paymentId,
      verified: false,
      updated_at: new Date().toISOString(),
    })
    await savePaymentToDb(orderId, paymentStore.get(orderId))
    return res.status(400).json({ verified: false, error: 'Invalid payment signature' })
  }

  try {
    const payment = await razorpay.payments.fetch(paymentId)
    paymentStore.set(orderId, {
      ...(paymentStore.get(orderId) || {}),
      checkout_status: payment.status || 'captured',
      payment_id: paymentId,
      verified: true,
      method: payment.method,
      updated_at: new Date().toISOString(),
    })
    await savePaymentToDb(orderId, paymentStore.get(orderId))

    return res.json({
      verified: true,
      paymentStatus: payment.status,
      orderId,
      paymentId,
      method: payment.method,
    })
  } catch (error) {
    console.error('Razorpay payment fetch error:', error.message)
    return res.status(500).json({ error: 'Payment verified but status fetch failed' })
  }
})

app.get('/api/payments/status/:orderId', async (req, res) => {
  const { orderId } = req.params
  if (!orderId) {
    return res.status(400).json({ error: 'orderId is required' })
  }

  const stored = paymentStore.get(orderId)
  if (stored) {
    return res.json({ orderId, ...stored })
  }

  if (dbEnabled) {
    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle()
    if (!error && data) {
      return res.json({
        orderId: data.order_id,
        checkout_status: data.checkout_status,
        amount: data.amount,
        currency: data.currency,
        consumer_id: data.consumer_id,
        payment_id: data.payment_id,
        verified: data.verified,
        method: data.method,
        items: data.items,
        webhook_received_at: data.webhook_received_at,
        source: 'supabase',
      })
    }
  }

  if (!razorpayEnabled) {
    return res.status(404).json({ error: 'No payment status found' })
  }

  try {
    const order = await razorpay.orders.fetch(orderId)
    return res.json({
      orderId,
      checkout_status: order.status || 'unknown',
      amount: (order.amount || 0) / 100,
      currency: order.currency || 'INR',
      source: 'razorpay',
    })
  } catch (error) {
    return res.status(404).json({ error: 'Payment status not found' })
  }
})

app.get('/api/payments', async (req, res) => {
  const { consumerId } = req.query
  if (!consumerId) {
    return res.status(400).json({ error: 'consumerId query param is required' })
  }

  const memoryPayments = Array.from(paymentStore.entries())
    .map(([orderId, value]) => ({ order_id: orderId, ...value }))
    .filter((p) => p.consumer_id === consumerId)
    .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))

  if (!dbEnabled) {
    return res.json({ payments: memoryPayments, source: 'memory' })
  }

  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('consumer_id', consumerId)
    .order('updated_at', { ascending: false })
    .limit(30)

  if (error) {
    console.error('Supabase payments list error:', error.message)
    return res.status(500).json({ error: 'Failed to fetch payments' })
  }

  return res.json({
    payments: data || [],
    source: 'supabase',
  })
})

app.post('/api/payments/webhook', async (req, res) => {
  if (!razorpayWebhookSecret) {
    return res.status(503).json({ error: 'Webhook secret is not configured' })
  }

  const signature = req.headers['x-razorpay-signature']
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}))
  const expected = crypto
    .createHmac('sha256', razorpayWebhookSecret)
    .update(rawBody)
    .digest('hex')

  if (signature !== expected) {
    return res.status(400).json({ error: 'Invalid webhook signature' })
  }

  const event = req.body || {}
  webhookEvents.unshift({
    id: event.id || `evt_${Date.now()}`,
    type: event.event || 'unknown',
    created_at: new Date().toISOString(),
    payload: event,
  })
  if (webhookEvents.length > 50) webhookEvents.pop()
  await saveWebhookEventToDb(webhookEvents[0])

  const orderId = event?.payload?.payment?.entity?.order_id
  const paymentId = event?.payload?.payment?.entity?.id
  if (orderId) {
    paymentStore.set(orderId, {
      ...(paymentStore.get(orderId) || {}),
      checkout_status: event.event,
      payment_id: paymentId || paymentStore.get(orderId)?.payment_id || null,
      webhook_received_at: new Date().toISOString(),
    })
    await savePaymentToDb(orderId, paymentStore.get(orderId))
  }

  return res.json({ received: true })
})

app.get('/api/payments/webhook-events', (_req, res) => {
  return res.json({ events: webhookEvents, dbEnabled })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`KrishiLink backend listening on port ${PORT}`)
})

export default app