# Teelite Club Store

A modern apparel storefront built with **React + Vite + TypeScript**, styled with **Tailwind CSS** and **shadcn‑ui**, and backed by **Supabase** for data/auth (WIP).

> Production‑ready SPA with Vercel config, maintenance‑mode utilities, and Supabase SQL assets for a straightforward deploy path.

---

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript\&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react\&logoColor=061A23)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite\&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss\&logoColor=white)
![shadcn-ui](https://img.shields.io/badge/shadcn--ui-Components-000000)
![Supabase](https://img.shields.io/badge/Supabase-SQL%20%26%20Auth-3ECF8E?logo=supabase\&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel)

## ✨ Highlights

* Vite + React SPA with TypeScript and Tailwind.
* UI kit with **shadcn‑ui** components.
* **Supabase** folder contains SQL/migrations and related utilities.
* Deployment presets for **Vercel** (and Render via `render.yaml`).
* **Maintenance Mode** helpers to quickly enable/disable a locked landing state.
* Edge‑function/webhook utilities for payment/notification flows (WIP).

## 🔗 Live

* **Site**: [https://teeliteclub.vercel.app](https://teeliteclub.vercel.app)

## 🗂️ Project Structure

```
.
├─ public/                 # Static assets
├─ src/                    # React app (routes/components/hooks/lib)
├─ supabase/               # SQL, migrations, policies (WIP)
├─ index.html              # Vite entry
├─ server.js               # Node helper / local server utilities
├─ vercel.json             # Vercel SPA rewrites / headers
├─ render.yaml             # (Optional) Render deployment config
├─ tailwind.config.ts      # Tailwind setup
├─ vite.config.ts          # Vite config
└─ package.json            # scripts & deps
```

> Tip: keep screenshots in `/docs` and reference them in this README.

## 🧰 Requirements

* **Node.js** ≥ 18
* **npm** (or pnpm/bun — repo includes `bun.lockb`, but npm works fine)
* Optional: **Supabase** project if you plan to run backend features locally

## 🔐 Environment Variables

Create a `.env` file in the repo root. Example (match your current variable names):

```
# Supabase (frontend exposure must start with VITE_)
VITE_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# App
VITE_APP_NAME=Teelite Club Store
# Example API base if you have serverless endpoints
VITE_API_URL=/api
```

> **Never** commit real keys. Add a sanitized `.env.example` and keep secrets in Vercel Project Settings.

## 🚀 Run Locally

```bash
# 1) Install deps
npm install

# 2) Start dev server (Vite)
npm run dev

# 3) Build & preview
npm run build
npm run preview
```

Common `package.json` scripts (add if missing):

```jsonc
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview --open",
    "lint": "eslint .",
    "format": "prettier -w ."
  }
}
```

## 🧱 UI & Components

* **Tailwind** utilities + **shadcn‑ui** primitives (Button, Card, Dialog, Form, Input, Sheet, etc.).
* Keep components under `src/components` and extract logic into `src/lib`/`src/hooks`.
* Prefer **controlled** form components and **Zod** (optional) for validation.

## 🛠️ Maintenance Mode

Utilities exist to toggle a “locked/coming‑soon” experience.

Add scripts (if not already present):

```jsonc
{
  "scripts": {
    "maintenance:on": "node enable-maintenance.js",
    "maintenance:off": "node disable-maintenance.js"
  }
}
```

> Use these during pre‑launch to mirror the ginsengstrip‑style lock page with Teelite branding.

## 🧪 Edge Functions / Webhooks (WIP)

* This repo includes helpers/docs for deploying an **edge function** and for **webhook debugging**.
* See: `deploy_edge_function.md`, `debug-webhook.js`, and payment‑flow notes.

## ☁️ Deploy

### Vercel (recommended)

1. **Import** this repo in Vercel.
2. Add env vars (from `.env`).
3. Deploy. Ensure SPA rewrites via `vercel.json` are respected.

### Render (optional)

* `render.yaml` is provided for alternative hosting setups. Validate the build/start commands first.

## 📸 Screenshots (optional)

Place PNGs/JPGs under `/docs` and include here:

```md
![Home](/docs/screenshot-home.png)
![Product](/docs/screenshot-product.png)
![Checkout](/docs/screenshot-checkout.png)
```

## 🗺️ Roadmap

* [ ] Product catalog & variants
* [ ] Cart & checkout flow
* [ ] Auth (Supabase) — email/OTP
* [ ] Payment callback + order status (Edge/webhook)
* [ ] Admin surface for stock & orders

## 🛡️ Notes

* Keep secrets server‑side only; expose frontend keys with `VITE_` prefix.
* Consider **CSP** and service worker updates before production.
* Add CI checks for lint/build if you start collaborating.

## 🤝 Contributing

PRs and issues welcome. Please describe the context and attach screenshots for UI work.

## 📝 License

Choose a license (MIT recommended for open source). Add a `LICENSE` file and update this section accordingly.

---

**Maintainer**: Sultan — IG: @teeliteclub · Web: [https://teeliteclub.com](https://teeliteclub.com)
