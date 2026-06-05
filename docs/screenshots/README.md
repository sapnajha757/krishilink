# README Screenshots

Save PNG files here with these exact names:

| File | Page to capture |
|------|-----------------|
| `marketplace.png` | Home / shop |
| `farmer-dashboard.png` | Farmer dashboard (log in as farmer) |
| `checkout.png` | Cart or checkout modal |
| `auth.png` | Login / sign up |
| `chat.png` | Chat panel |
| `admin.png` | Admin panel |

## Add screenshots manually

1. Open [krishilink-delta.vercel.app](https://krishilink-delta.vercel.app) in your browser.
2. Press **Win + Shift + S** (Windows) and capture the screen.
3. Paste into Paint or Snipping Tool and **Save As → PNG**.
4. Save into this folder using the names above (overwrite the existing file).

## Regenerate automatically

From the project root:

```bash
npm run screenshots
```

This uses Playwright to capture pages from the live demo.

## VS Code shows "error loading image"?

That usually means the file is missing, empty, or not a real PNG. Delete the broken file, save a new `.png` from your browser screenshot, and open it again.
