# Razorpay setup for KrishiLink

Online checkout uses Razorpay on the **backend** (`src/server.js`). COD orders do not need Razorpay.

## 1. Create Razorpay account

1. [dashboard.razorpay.com](https://dashboard.razorpay.com) → sign up
2. Stay in **Test mode** until you finish testing

## 2. API keys

Dashboard → **Account & Settings** → **API Keys** → Generate test keys

Add to `.env` and your API host (Render, etc.):

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxx
```

Never commit secrets. Do not use `VITE_` prefix (keys must stay server-side).

## 3. Webhook (recommended for production)

1. Dashboard → **Webhooks** → **Add New Webhook**
2. URL: `https://YOUR-API-HOST.onrender.com/api/payments/webhook`
3. Events: `payment.captured`, `order.paid` (or all payment events for testing)
4. Copy **Webhook Secret** → `RAZORPAY_WEBHOOK_SECRET` on the server

## 4. Test checkout

1. Start API: `npm run server`
2. Start app: `npm run dev`
3. Login → Marketplace → add to cart → **Online Payment**
4. Razorpay test card: `4111 1111 1111 1111`, any future expiry, any CVV

## 5. Go live

1. Complete KYC in Razorpay
2. Switch to **Live mode** keys on the server
3. Update webhook URL to production API domain
4. Use HTTPS only

## Health check

`GET https://your-api/api/payments/config` returns `{ keyId, dbEnabled }` when Razorpay and Supabase service role are configured.
