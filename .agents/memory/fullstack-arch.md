---
name: Full-stack architecture
description: How the Content Morph app is structured after the backend was added — two processes, proxy, deployment.
---

## Dev setup
- `npm run dev:all` runs both `node server.js` (port 3001) and `vite` (port 5000) via `concurrently`
- Vite config proxies `/api/*` → `http://localhost:3001`
- Workflow "Start application" runs `npm run dev:all`, waitForPort 5000

## Production
- `npm run start` runs `NODE_ENV=production node server.js` on port 5000
- Express serves Vite `dist/` as static files + handles all /api routes

**Why:** Replit iframe preview always opens port 5000, so Vite dev server must own 5000 in dev. Express on 3001 is invisible to the user but handles all auth + API.

## Provider nesting in main.jsx
```
SettingsProvider → AuthProvider → Root
  (if authenticated) → ProfileProvider → App
```
ProfileProvider is only mounted when authenticated — avoids API calls for logged-out users.
