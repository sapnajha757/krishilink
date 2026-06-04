# Deploy KrishiLink (production checklist)

KrishiLink needs **two deployments**: static **frontend** + Node **API**.

| Part | Host (recommended) | URL example |
|------|-------------------|-------------|
| Frontend | [Vercel](https://vercel.com) | `https://krishilink.vercel.app` |
| API | [Render](https://render.com) | `https://krishilink-api.onrender.com` |
| Database | [Supabase](https://supabase.com) | (no public URL) |
| Payments | [Razorpay](https://razorpay.com) | webhook → API URL |

---

## Step 1 — Supabase

Follow [`supabase/SETUP.md`](../supabase/SETUP.md):

1. Create project
2. Run [`supabase/schema.sql`](../supabase/schema.sql)
3. Create public `avatars` bucket
4. Set **Auth → URL configuration** (add Vercel URL after Step 3)

---

## Step 2 — Deploy API (Render)

1. Push repo to GitHub
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**
3. Connect repo, root directory: `krishilink` (if monorepo) or repo root
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js`
   - **Health Check Path:** `/api/health`
5. **Environment** (from [`.env.example`](../.env.example)):

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `FRONTEND_URL` | `https://your-app.vercel.app` (add after Step 3) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
| `RAZORPAY_KEY_ID` | test or live key |
| `RAZORPAY_KEY_SECRET` | secret |
| `RAZORPAY_WEBHOOK_SECRET` | from Razorpay webhook |
| `GROQ_API_KEY` | optional |
| `OPENWEATHER_API_KEY` | optional |

6. Deploy → copy URL, e.g. `https://krishilink-api.onrender.com`
7. Test: open `https://krishilink-api.onrender.com/api/health`

Or use [`render.yaml`](../render.yaml) as a Blueprint.

---

## Step 3 — Deploy frontend (Vercel)

1. [vercel.com](https://vercel.com) → **Add New Project** → import repo
2. **Root Directory:** `krishilink` (if needed)
3. Framework: **Vite** (uses root [`vercel.json`](../vercel.json))
4. **Environment Variables:**

| Key | Value |
|-----|--------|
| `VITE_SUPABASE_URL` | Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | anon key only |
| `VITE_API_URL` | Render API URL (no trailing slash), e.g. `https://krishilink-api.onrender.com` |
| `VITE_ADMIN_EMAILS` | your admin email |

5. Deploy → copy URL, e.g. `https://krishilink.vercel.app`

---

## Step 4 — Link services

1. **Supabase** → Auth → URL configuration:
   - Site URL: your Vercel URL
   - Redirect URLs: `https://your-app.vercel.app/**`
2. **Render** → update `FRONTEND_URL` to your Vercel URL → redeploy API
3. **Razorpay** → Webhook URL: `https://your-api.onrender.com/api/payments/webhook`  
   See [`docs/RAZORPAY_SETUP.md`](./RAZORPAY_SETUP.md)

---

## Step 5 — Smoke test

- [ ] Open Vercel URL — home loads
- [ ] Sign up / login
- [ ] Profile — upload photo
- [ ] Farmer — add product
- [ ] Marketplace — COD order
- [ ] Online payment (Razorpay test mode)
- [ ] Language switcher works

---

## Local development

```bash
cp .env.example .env
# fill .env
npm install
npm run server   # terminal 1
npm run dev      # terminal 2
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login fails after deploy | Supabase redirect URLs + Site URL |
| Payments 503 | Set Razorpay keys on Render |
| CORS error in browser | `FRONTEND_URL` on API must match exact Vercel URL |
| Photo upload fails | `avatars` bucket + storage policies in schema.sql |
| API sleeps (Render free) | First request may take ~30s; upgrade or use cron ping |
