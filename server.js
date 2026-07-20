import express from 'express';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync, getUncachableStripeClient } from './stripeClient.js';
import { WebhookHandlers } from './webhookHandlers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// ── Database ──────────────────────────────────────────────────────────────────
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                     TEXT PRIMARY KEY,
      email                  TEXT UNIQUE,
      first_name             TEXT,
      last_name              TEXT,
      profile_image_url      TEXT,
      stripe_customer_id     TEXT,
      stripe_subscription_id TEXT,
      created_at             TIMESTAMP DEFAULT NOW(),
      updated_at             TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

    CREATE TABLE IF NOT EXISTS profiles (
      user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      brand_voice     TEXT    DEFAULT '',
      writing_samples JSONB   DEFAULT '[]',
      onboarded       BOOLEAN DEFAULT FALSE,
      created_at      TIMESTAMP DEFAULT NOW(),
      updated_at      TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS history (
      id                SERIAL PRIMARY KEY,
      user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      input             TEXT NOT NULL,
      selected_platforms JSONB NOT NULL DEFAULT '[]',
      outputs           JSONB NOT NULL DEFAULT '{}',
      created_at        TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_history_user_id ON history(user_id);
  `);
}

// ── OIDC config (memoised, re-fetched every hour) ────────────────────────────
const getOidcConfig = memoize(
  () => client.discovery(
    new URL(process.env.ISSUER_URL ?? 'https://replit.com/oidc'),
    process.env.REPL_ID
  ),
  { maxAge: 3600 * 1000, promise: true }
);

function updateUserSession(user, tokens) {
  user.claims       = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at   = user.claims?.exp;
}

async function upsertUser(claims) {
  await pool.query(
    `INSERT INTO users (id, email, first_name, last_name, profile_image_url)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (id) DO UPDATE SET
       email=$2, first_name=$3, last_name=$4, profile_image_url=$5, updated_at=NOW()`,
    [claims.sub, claims.email, claims.first_name, claims.last_name, claims.profile_image_url]
  );
  // Ensure a profile row exists
  await pool.query(
    `INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [claims.sub]
  );
}

// ── Session ───────────────────────────────────────────────────────────────────
const PgSession = connectPg(session);
app.set('trust proxy', 1);
app.use(session({
  store: new PgSession({
    pool,
    tableName: 'sessions',
    createTableIfMissing: false,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'none',
  },
}));

app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((user, cb) => cb(null, user));
passport.deserializeUser((user, cb) => cb(null, user));

// ── Auth Routes ───────────────────────────────────────────────────────────────
// Use the Replit-provided public domain; fall back to x-forwarded-host then req.hostname.
function getPublicHostname(req) {
  return process.env.REPLIT_DEV_DOMAIN
    || req.get('x-forwarded-host')
    || req.hostname;
}

const STRATEGY_NAME = 'replitauth';
let strategyReady = false;

async function ensureStrategy(hostname) {
  if (strategyReady) return;
  const config = await getOidcConfig();
  const strategy = new Strategy(
    {
      name: STRATEGY_NAME,
      config,
      scope: 'openid email profile offline_access',
      callbackURL: `https://${hostname}/api/callback`,
    },
    async (tokens, verified) => {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    }
  );
  passport.use(strategy);
  strategyReady = true;
}

app.get('/api/login', async (req, res, next) => {
  const hostname = getPublicHostname(req);
  await ensureStrategy(hostname);
  passport.authenticate(STRATEGY_NAME, {
    prompt: 'login consent',
    scope: ['openid', 'email', 'profile', 'offline_access'],
  })(req, res, next);
});

app.get('/api/callback', async (req, res, next) => {
  const hostname = getPublicHostname(req);
  await ensureStrategy(hostname);
  passport.authenticate(STRATEGY_NAME, {
    successRedirect: '/',
    failureRedirect: '/api/login',
  })(req, res, next);
});

app.get('/api/logout', async (req, res) => {
  const config = await getOidcConfig();
  req.logout(() => {
    const endUrl = client.buildEndSessionUrl(config, {
      client_id: process.env.REPL_ID,
      post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
    }).href;
    res.redirect(endUrl);
  });
});

// ── Auth middleware ───────────────────────────────────────────────────────────
const isAuthenticated = async (req, res, next) => {
  const user = req.user;
  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) return next();

  if (!user.refresh_token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, user.refresh_token);
    updateUserSession(user, tokenResponse);
    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

// ── Stripe webhook (MUST be before express.json) ─────────────────────────────
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) return res.status(400).json({ error: 'Missing stripe-signature' });
  try {
    const sig = Array.isArray(signature) ? signature[0] : signature;
    await WebhookHandlers.processWebhook(req.body, sig);
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(400).json({ error: 'Webhook processing error' });
  }
});

// ── JSON body parser ──────────────────────────────────────────────────────────
app.use(express.json());

// ── GET /api/auth/user ────────────────────────────────────────────────────────
app.get('/api/auth/user', isAuthenticated, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.claims.sub]);
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/profile ──────────────────────────────────────────────────────────
app.get('/api/profile', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const { rows } = await pool.query('SELECT * FROM profiles WHERE user_id=$1', [userId]);
    if (rows.length === 0) {
      // Create default profile if missing
      await pool.query('INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
      return res.json({ brand_voice: '', writing_samples: [], onboarded: false });
    }
    const p = rows[0];
    res.json({
      brand_voice: p.brand_voice || '',
      writing_samples: p.writing_samples || [],
      onboarded: p.onboarded || false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── PUT /api/profile ──────────────────────────────────────────────────────────
app.put('/api/profile', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const { brand_voice, writing_samples, onboarded } = req.body;

    const updates = {};
    if (brand_voice !== undefined) updates.brand_voice = brand_voice;
    if (writing_samples !== undefined) {
      updates.writing_samples = JSON.stringify(
        (writing_samples || []).filter(s => typeof s === 'string' && s.trim().length > 0).slice(0, 3)
      );
    }
    if (onboarded !== undefined) updates.onboarded = onboarded;

    const keys = Object.keys(updates);
    if (keys.length === 0) return res.json({ ok: true });

    const setClauses = keys.map((k, i) => `${k}=$${i + 1}`).join(', ');
    const values = keys.map(k => updates[k]);
    values.push(userId);

    await pool.query(
      `UPDATE profiles SET ${setClauses}, updated_at=NOW() WHERE user_id=$${values.length}`,
      values
    );

    const { rows } = await pool.query('SELECT * FROM profiles WHERE user_id=$1', [userId]);
    const p = rows[0];
    res.json({
      brand_voice: p.brand_voice || '',
      writing_samples: p.writing_samples || [],
      onboarded: p.onboarded || false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/history ──────────────────────────────────────────────────────────
app.get('/api/history', isAuthenticated, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM history WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.claims.sub]
    );
    res.json(rows.map(r => ({
      id: r.id,
      input: r.input,
      selectedPlatforms: r.selected_platforms,
      outputs: r.outputs,
      createdAt: r.created_at,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/history ─────────────────────────────────────────────────────────
app.post('/api/history', isAuthenticated, async (req, res) => {
  try {
    const { input, selectedPlatforms, outputs } = req.body;
    if (!input || !selectedPlatforms || !outputs) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    const { rows } = await pool.query(
      `INSERT INTO history (user_id, input, selected_platforms, outputs)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.claims.sub, input, JSON.stringify(selectedPlatforms), JSON.stringify(outputs)]
    );
    const r = rows[0];
    res.json({ id: r.id, input: r.input, selectedPlatforms: r.selected_platforms, outputs: r.outputs, createdAt: r.created_at });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE /api/history/:id ───────────────────────────────────────────────────
app.delete('/api/history/:id', isAuthenticated, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM history WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.claims.sub]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE /api/history ───────────────────────────────────────────────────────
app.delete('/api/history', isAuthenticated, async (req, res) => {
  try {
    await pool.query('DELETE FROM history WHERE user_id=$1', [req.user.claims.sub]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/stripe/subscription ─────────────────────────────────────────────
app.get('/api/stripe/subscription', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const { rows } = await pool.query('SELECT stripe_customer_id FROM users WHERE id=$1', [userId]);
    const customerId = rows[0]?.stripe_customer_id;
    if (!customerId) return res.json({ active: false });

    const result = await pool.query(`
      SELECT status FROM stripe.subscriptions
      WHERE customer = $1
      ORDER BY created DESC LIMIT 1
    `, [customerId]);

    const status = result.rows[0]?.status;
    res.json({ active: status === 'active' || status === 'trialing', status: status || null });
  } catch (err) {
    console.error('Subscription check error:', err.message);
    res.json({ active: false });
  }
});

// ── POST /api/stripe/checkout ─────────────────────────────────────────────────
app.post('/api/stripe/checkout', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const { interval } = req.body;
    const stripe = await getUncachableStripeClient();

    const { rows } = await pool.query('SELECT email, stripe_customer_id FROM users WHERE id=$1', [userId]);
    const user = rows[0];
    let customerId = user?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email: user?.email, metadata: { userId } });
      customerId = customer.id;
      await pool.query('UPDATE users SET stripe_customer_id=$1 WHERE id=$2', [customerId, userId]);
    }

    const prices = await stripe.prices.list({ active: true, type: 'recurring', expand: ['data.product'] });
    const match = prices.data.find(p => p.recurring?.interval === (interval === 'year' ? 'year' : 'month'));
    if (!match) return res.status(404).json({ message: 'No matching price found. Please run the seed script.' });

    const baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN || req.get('host')}`;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: match.id, quantity: 1 }],
      mode: 'subscription',
      success_url: `${baseUrl}/?checkout=success`,
      cancel_url: `${baseUrl}/?checkout=cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/stripe/portal ───────────────────────────────────────────────────
app.post('/api/stripe/portal', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const { rows } = await pool.query('SELECT stripe_customer_id FROM users WHERE id=$1', [userId]);
    const customerId = rows[0]?.stripe_customer_id;
    if (!customerId) return res.status(400).json({ message: 'No billing account found' });

    const stripe = await getUncachableStripeClient();
    const baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN || req.get('host')}`;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: baseUrl,
    });

    res.json({ url: portalSession.url });
  } catch (err) {
    console.error('Portal error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/profile/extract-text ────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = ['.txt', '.md', '.pdf', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Unsupported file type "${ext}". Please upload .txt, .md, .pdf, or .docx`));
  },
});

app.post('/api/profile/extract-text', isAuthenticated, (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    try {
      let text = '';
      if (ext === '.txt' || ext === '.md') {
        text = req.file.buffer.toString('utf-8');
      } else if (ext === '.pdf') {
        const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
        const data = await pdfParse(req.file.buffer);
        text = data.text;
      } else if (ext === '.docx') {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        text = result.value;
      }
      res.json({ text: text.trim() });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Failed to extract text from file' });
    }
  });
});

// ── Serve Vite build in production ────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// ── Stripe init ───────────────────────────────────────────────────────────────
async function initStripe() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL required');

    console.log('Running Stripe migrations...');
    await runMigrations({ databaseUrl });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();
    const webhookBaseUrl = `https://${process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
    console.log('Stripe webhook configured');

    stripeSync.syncBackfill()
      .then(() => console.log('Stripe data synced'))
      .catch(err => console.error('Stripe backfill error:', err.message));
  } catch (err) {
    console.error('Stripe init error (non-fatal):', err.message);
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────
initDb()
  .then(() => initStripe())
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to init:', err);
    process.exit(1);
  });
