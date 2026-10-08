# Driftdine

Tech & SaaS news platform.

| Folder | What it is |
|---|---|
| `admin.driftdine.com/` | Node.js + Express + MongoDB API (auth, news, categories, tags, media, ads, homepage, newsletter, import/export) |
| `frontend/` | React + TypeScript + Tailwind CSS public site and admin panel (`/admin`) |

## Run locally

```bash
# API  (copy .env.example to .env and fill it in first)
cd admin.driftdine.com && npm install && npm run dev      # http://localhost:4000

# Web
cd frontend && npm install && cp .env.example .env.local && npm run dev   # http://localhost:5173
```

Create an admin user on the server (there is no public sign-up):

```bash
cd admin.driftdine.com && node create-admin.js <email> <password> [name]
```

Never commit real `.env` files — they are git-ignored.
