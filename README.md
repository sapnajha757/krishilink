# KrishiLink

KrishiLink connects local farmers directly with consumers across India — fresh produce, no middlemen, online payments, and farmer profiles on every listing.

## Features

| Feature | Description |
|--------|-------------|
| **Languages** | UI in English, Hindi, Punjabi, Gujarati, Maithili, Bhojpuri, Tamil, Telugu (navbar dropdown) |
| **Auth** | Email login / sign up as Consumer or Farmer |
| **Profile** | Farmer name, photo, phone, location, role |
| **Marketplace** | Browse, search, cart, Buy Now, Razorpay + COD |
| **Checkout** | Mobile-friendly cart sheet and payment modals with loading states |
| **Farmer Dashboard** | Add/edit products, orders, weather advisory |
| **Chat** | Messages between consumers and farmers |
| **Admin** | User management (admin emails via env) |

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS
- **Backend:** Express (`src/server.js`) — payments, weather advisory
- **Database & Auth:** Supabase
- **Payments:** Razorpay

## Prerequisites

- Node.js 18+
- Supabase project
- Razorpay test/live keys (for online payments)

## Quick Start

```bash
cd krishilink
npm install
```

Create `.env` in the project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ADMIN_EMAILS=admin@example.com
VITE_API_BASE_URL=http://localhost:4000

# Server (src/server.js)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Run frontend and API:

```bash
# Terminal 1 — React app
npm run dev

# Terminal 2 — Express API (payments, weather)
npm run server
```

Open [http://localhost:5173](http://localhost:5173).

## Supabase Setup

### Profiles table

Ensure `profiles` includes an `avatar_url` column:

```sql
alter table profiles
  add column if not exists avatar_url text;
```

### Avatar storage (farmer photo)

1. In Supabase Dashboard → **Storage**, create a bucket named `avatars`.
2. Set it to **public** (or use signed URLs and adjust upload code).
3. Add policies so authenticated users can upload to their own folder:

```sql
-- Allow users to upload their own avatar
create policy "Users upload own avatar"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Public read avatars"
on storage.objects for select
to public
using (bucket_id = 'avatars');
```

Farmers set **name** and **photo** under **Profile** in the app; photos appear on marketplace product cards.

## Project Structure

```
krishilink/
├── src/
│   ├── App.jsx           # Home, routing between pages
│   ├── Auth.jsx          # Login / sign up
│   ├── Profile.jsx       # Name, photo, location
│   ├── Marketplace.jsx   # Shop, cart, checkout
│   ├── FarmerDashboard.jsx
│   ├── AdminPanel.jsx
│   ├── ChatPanel.jsx
│   ├── Loading.jsx       # Shared spinner component
│   ├── server.js         # Express API
│   └── supabase.js
├── package.json
└── README.md
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run server` | Start Express API on port 4000 |

## Language Support

Use the **language dropdown** (🌐) in the navbar on any page. Your choice is saved in the browser (`localStorage`).

Supported languages:

| Code | Language |
|------|----------|
| `en` | English |
| `hi` | Hindi (हिन्दी) |
| `pa` | Punjabi (ਪੰਜਾਬੀ) |
| `gu` | Gujarati (ગુજરાતી) |
| `mai` | Maithili (मैथिली) |
| `bho` | Bhojpuri (भोजपुरी) |
| `ta` | Tamil (தமிழ்) |
| `te` | Telugu (తెలుగు) |

Translation files live in `src/i18n/locales/`. Add a new language by creating a locale file and registering it in `src/i18n/translations.js` and `src/i18n/languages.js`.

## Mobile & Checkout

- Cart and order sidebars slide up as bottom sheets on small screens.
- Buy Now checkout uses a full-width bottom modal on mobile.
- Checkout buttons show a spinner while `checkoutLoading` is active.
- Payment methods stack vertically on narrow viewports.

## License

MIT — built for learning and local farm-to-table commerce.
