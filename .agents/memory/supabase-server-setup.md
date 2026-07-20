---
name: Supabase server-side setup quirks
description: Gotchas for the Express backend's Supabase admin client on Node.js 20
---

## WebSocket polyfill required

Node.js 20 has no native `WebSocket`. `@supabase/supabase-js` initializes a Realtime client at `createClient()` time and throws if WebSocket is absent. Must polyfill before importing:

```js
import { WebSocket } from 'ws';
if (!globalThis.WebSocket) globalThis.WebSocket = WebSocket;
```

`ws` is already in `node_modules` (transitive dep). Add this at the very top of `server.js` before `createClient` is called.

**Why:** Without it, `createClient` throws at module load, crashing the server. Previously, each request called `getSupabaseAdmin()` inside a try/catch which silently caught the error and returned 401 on every authenticated route.

## Singleton admin client

`getSupabaseAdmin()` must return a cached singleton, not create a new client per request. Creating per-request causes the WebSocket error to fire on every call (even with the polyfill, it's wasteful).

## Required env vars

- `SUPABASE_URL` — must be set as a non-secret env var (shared). Value: `https://tgeqxuukgwykzugevlbl.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — secret, already set
- `VITE_SUPABASE_URL` — also set (for frontend)
- `VITE_SUPABASE_ANON_KEY` — also set (for frontend)
