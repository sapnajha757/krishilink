# Supabase setup for KrishiLink

## 1. Create project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Save **Project URL** and **anon public** key (Settings → API)
3. Save **service_role** key (server only — never put in `VITE_*` vars)

## 2. Run database schema

1. Dashboard → **SQL Editor** → **New query**
2. Paste and run the full contents of [`schema.sql`](./schema.sql)

## 3. Auth URLs (required for login in production)

Dashboard → **Authentication** → **URL configuration**

| Field | Example |
|-------|---------|
| Site URL | `https://your-app.vercel.app` |
| Redirect URLs | `https://your-app.vercel.app/**`, `http://localhost:5173/**`, `http://localhost:5174/**` |

For local dev, keep localhost URLs. Add your Vercel URL before going live.

**Email auth:** Authentication → Providers → Email → enable.  
If **Confirm email** is on, users must verify before login (the app shows a message).

## 4. Storage (profile photos)

1. Dashboard → **Storage** → **New bucket**
2. Name: `avatars`
3. **Public bucket**: ON
4. Storage policies are created by `schema.sql` (section at bottom). Re-run that section if the bucket was created after the first SQL run.

## 5. Verify tables

Table Editor should show: `profiles`, `products`, `orders`, `messages`, `payments`, `payment_webhook_events`.

## 6. Env vars (copy to `.env` and hosting dashboards)

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server only
```

## Admin panel

Set `VITE_ADMIN_EMAILS` to your login email (comma-separated). Admin UI checks email client-side; tighten with Supabase custom claims for production hardening.
