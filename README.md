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

Copy the template and fill in your keys:

```bash
cp .env.example .env
```

See [`.env.example`](.env.example) for all variables (frontend `VITE_*` + server-only secrets).

Run frontend and API:

```bash
# Terminal 1 — React app
npm run dev

# Terminal 2 — Express API (payments, weather)
npm run server
```

Open [http://localhost:5173](http://localhost:5173).

## Supabase setup

Full guide: [`supabase/SETUP.md`](supabase/SETUP.md)

1. Create a Supabase project
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor
3. Create a public Storage bucket named `avatars`
4. Configure Auth redirect URLs for your deployed frontend URL

## Razorpay setup

Guide: [`docs/RAZORPAY_SETUP.md`](docs/RAZORPAY_SETUP.md)

## Production deployment

Step-by-step: [`docs/DEPLOY.md`](docs/DEPLOY.md)

| File | Purpose |
|------|---------|
| [`vercel.json`](vercel.json) | Frontend on Vercel |
| [`render.yaml`](render.yaml) | API on Render (optional Blueprint) |
| [`.env.example`](.env.example) | All environment variables |

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

## Deployment files

```
krishilink/
├── .env.example          # Copy to .env locally; mirror vars on Vercel + Render
├── vercel.json           # Frontend (Vite → dist)
├── render.yaml           # Backend API blueprint
├── supabase/
│   ├── schema.sql        # Tables, RLS, storage policies
│   └── SETUP.md
└── docs/
    ├── DEPLOY.md         # Full hosting checklist
    └── RAZORPAY_SETUP.md
```

## License

MIT — built for learning and local farm-to-table commerce.
