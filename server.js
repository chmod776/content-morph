import express from 'express';
import session from 'express-session';
import passport from 'passport';
import * as client from 'openid-client';
import { Strategy } from 'openid-client/passport';
import connectPg from 'connect-pg-simple';
import pg from 'pg';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import memoize from 'memoizee';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// ── Database ──────────────────────────────────────────────────────────────────
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid  TEXT PRIMARY KEY,
      sess JSONB NOT NULL,
      expire TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

    CREATE TABLE IF NOT EXISTS users (
      id                TEXT PRIMARY KEY,
      email             TEXT UNIQUE,
      first_name        TEXT,
      last_name         TEXT,
      profile_image_url TEXT,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS profiles (
      user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      brand_voice     TEXT    DEFAULT '',
      writing_samples JSONB   DEFAULT '[]',
      onboarded       BOOLEAN DEFAULT FALSE,
      created_at      TIMESTAMP DEFAULT NOW(),
      updated_at      TIMESTAMP DEFAULT NOW()
    );
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

// ── Start ─────────────────────────────────────────────────────────────────────
initDb()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to init DB:', err);
    process.exit(1);
  });
