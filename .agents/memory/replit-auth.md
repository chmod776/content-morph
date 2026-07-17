---
name: Replit Auth setup
description: How Google/Replit OIDC auth is wired in server.js for Content Morph.
---

## Strategy registration
Strategies are registered lazily per-hostname using `ensureStrategy(req.hostname)`. This is needed because the callback URL must match `https://${hostname}/api/callback`, and the hostname varies between dev and prod.

## Key env vars (auto-provided by Replit)
- `SESSION_SECRET` — session signing key
- `REPL_ID` — OIDC client ID
- `ISSUER_URL` defaults to `https://replit.com/oidc`

## Session cookie
Must use `secure: true` and `sameSite: 'none'` because the Replit preview pane is an iframe on a different origin. Without `sameSite: 'none'` the session cookie is blocked.

## Routes
- `GET /api/login` — starts OIDC flow (redirects to Replit/Google)
- `GET /api/callback` — OIDC callback, redirects to `/` on success
- `GET /api/logout` — calls Replit end-session endpoint, redirects home
- `GET /api/auth/user` — returns current user row from DB (requires isAuthenticated)

**Why memoize oidcConfig:** Discovery takes ~100ms and the result is stable for an hour. Memoizing avoids adding latency to every auth check.
