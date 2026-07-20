---
name: Post-payment subscription loop
description: After Stripe checkout, user is sent back to PricingPage instead of the main app
---

## Symptom
After completing Stripe checkout and finishing onboarding, the user is redirected back to the pricing/subscribe page as if they have no subscription. The app only shows the main UI when `subscription.active === true`.

## Likely causes

1. **Webhook lag** — `stripe-replit-sync` processes the `checkout.session.completed` event to populate `stripe.subscriptions`. The app retries the subscription fetch up to 5 times with 1.5s delays on `?checkout=success`, but the webhook may not have fired yet if the Replit dev URL changed (webhook endpoint is tied to a specific URL).

2. **Stale webhook endpoint** — The webhook URL registered in Stripe is tied to the Replit dev domain. If the domain changes between sessions, the webhook stops firing and subscriptions never get written to the DB. Server logs on startup show it cleaning up orphaned webhooks and registering a new one — confirm the new URL is correct in Stripe dashboard.

3. **Test mode** — User suspects it may be a test-mode-specific issue. Worth testing with Stripe test card `4242 4242 4242 4242` and checking `stripe.subscriptions` table directly after checkout.

## What to check next session
- Query `stripe.subscriptions` in the DB after a test checkout to confirm the row is being written.
- Check the Stripe dashboard webhook logs to see if the `checkout.session.completed` event was delivered successfully.
- If the webhook isn't firing, the new webhook URL registered on startup may not be reachable (e.g. Replit dev domain changed).
- The retry logic in `App.jsx` (`fetchSub` with up to 5 retries) may need a longer delay or more retries.

## Relevant files
- `App.jsx` — `fetchSub` function, subscription retry logic on `?checkout=success`
- `server.js` — `initStripe()` registers the webhook; `stripe-replit-sync` handles events
- `webhookHandlers.js` — delegates Stripe events to stripe-replit-sync
