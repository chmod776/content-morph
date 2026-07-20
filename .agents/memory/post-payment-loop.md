---
name: Post-payment subscription loop — RESOLVED
description: Root cause and fix for users being sent back to PricingPage after successful Stripe checkout
---

## Root cause
Supabase was issuing a different UUID for the same Google account across sessions. Every DB lookup (subscription, profile, history) used `req.user.id` from the JWT. When the UUID changed, lookups returned nothing and the app showed the paywall.

Secondary symptom: `/api/auth/sync` was failing with `duplicate key on users_email_key` because it tried to INSERT a new user row with the new UUID but the same email — crashing before any data could be linked.

## Fix (in isAuthenticated middleware)
After verifying the JWT, look up the canonical DB user ID by email. If the email already exists in `users` with a different ID, override `req.user.id` with the stable DB ID before any route handler runs:

```js
if (user.email) {
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [user.email]);
  if (rows.length > 0 && rows[0].id !== user.id) {
    user.id = rows[0].id;
  }
}
```

This keeps all FKs (stripe_customer_id, profiles, history) intact without any PK migration.

**Why:** Changing PKs to match auth IDs is dangerous — FK constraints fire in the wrong order and require DEFERRABLE constraints or complex migration. Resolving at the middleware layer is safe, cheap, and transparent to all routes.

**How to apply:** Any future auth change (new provider, Supabase user re-creation) is handled automatically by this lookup. No migration needed.

## Also added: Stripe API fallback in subscription check
`/api/stripe/subscription` now falls back to the live Stripe API when the local `stripe.subscriptions` table has nothing active for the customer. Handles webhook lag and stale webhook URLs after Replit dev domain changes.
