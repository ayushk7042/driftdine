# Driftdine web (public site + admin)

React 19 · TypeScript · Tailwind CSS 4 · Vite · TanStack Query · React Router

    cp .env.example .env.local   # VITE_API_URL=http://localhost:4000/api
    npm run dev                  # http://localhost:5173
    npm run build                # typecheck + production build -> dist/

Public site: `/`. Admin: `/admin` (login at `/admin/login` — there is no public sign-up; create admins on the server with `node create-admin.js <email> <password> [name]`).
Serve `dist/` with an SPA fallback (all paths -> index.html).
