import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { WebSocket } from 'ws';
if (!globalThis.WebSocket) globalThis.WebSocket = WebSocket;
import pg from 'pg';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawn } from 'child_process';
import crypto from 'crypto';
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

    CREATE TABLE IF NOT EXISTS video_usage (
      user_id     TEXT     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year_month  CHAR(7)  NOT NULL,
      minutes_used NUMERIC DEFAULT 0,
      grace_used  BOOLEAN  DEFAULT FALSE,
      PRIMARY KEY (user_id, year_month)
    );
  `);
}

// ── Tmp file cleanup sweep ────────────────────────────────────────────────────
// Deletes any /tmp/cm-* files older than 10 minutes. Runs at startup and hourly
// as a safety net in case a request-level cleanup ever fails silently.
function cleanupTmpFiles() {
  const tenMinAgo = Date.now() - 10 * 60 * 1000;
  try {
    const files = fs.readdirSync('/tmp').filter(f => f.startsWith('cm-'));
    for (const file of files) {
      const full = path.join('/tmp', file);
      try {
        if (fs.statSync(full).mtimeMs < tenMinAgo) {
          fs.unlinkSync(full);
          console.log('[cleanup] removed orphaned tmp file:', file);
        }
      } catch {}
    }
  } catch (err) {
    console.warn('[cleanup] scan failed:', err.message);
  }
}
cleanupTmpFiles();
setInterval(cleanupTmpFiles, 60 * 60 * 1000);

// ── ffprobe / ffmpeg helpers ──────────────────────────────────────────────────
function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', filePath]);
    let out = '';
    proc.stdout.on('data', d => { out += d; });
    proc.on('close', code => {
      if (code !== 0) return reject(new Error('ffprobe failed'));
      try { resolve(parseFloat(JSON.parse(out).format?.duration || '0')); }
      catch (e) { reject(e); }
    });
  });
}

function extractAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', [
      '-i', videoPath, '-vn',
      '-acodec', 'libmp3lame', '-q:a', '5', '-ac', '1', '-ar', '16000',
      '-y', audioPath,
    ]);
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d; });
    proc.on('close', code => {
      if (code !== 0) return reject(new Error('Audio extraction failed: ' + stderr.slice(-300)));
      resolve();
    });
  });
}

function safeDelete(...paths) {
  for (const p of paths) { try { if (p) fs.unlinkSync(p); } catch {} }
}

function formatTimestamp(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Supabase admin client (server-side only, uses service role key) ───────────
// Singleton — created once at startup so the Realtime WebSocket warning never
// fires inside the auth middleware's try/catch (which would incorrectly 401).
const _supabaseAdminUrl        = process.env.SUPABASE_URL;
const _supabaseAdminServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!_supabaseAdminUrl || !_supabaseAdminServiceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}
const supabaseAdmin = createClient(_supabaseAdminUrl, _supabaseAdminServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
function getSupabaseAdmin() { return supabaseAdmin; }

// ── Auth middleware — verifies Supabase JWT ───────────────────────────────────
const isAuthenticated = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  try {
    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ message: 'Unauthorized' });

    // If Supabase has issued a different UUID for a returning user (e.g. after
    // re-auth), look up the canonical ID we already have in the DB by email.
    // This keeps all FK references (stripe_customer_id, profiles, history) intact
    // without needing to migrate PKs.
    if (user.email) {
      const { rows } = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [user.email]
      );
      if (rows.length > 0 && rows[0].id !== user.id) {
        user.id = rows[0].id; // use the stable DB id for all downstream queries
      }
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

// ── POST /api/auth/sync ───────────────────────────────────────────────────────
// Called by the frontend after every sign-in to upsert the user row.


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
// 10 MB limit to accommodate full video transcripts sent to /api/youtube/generate.
// All routes require authentication, so the larger limit is safe.
app.use(express.json({ limit: '10mb' }));

// ── POST /api/auth/sync ───────────────────────────────────────────────────────
app.post('/api/auth/sync', isAuthenticated, async (req, res) => {
  try {
    // By the time we reach here, isAuthenticated has already resolved req.user.id
    // to the canonical DB id (by email lookup), so a simple upsert-by-id is safe.
    const { id, email, user_metadata } = req.user;
    const fullName  = user_metadata?.full_name || user_metadata?.name || '';
    const parts     = fullName.trim().split(' ');
    const firstName = parts[0] || '';
    const lastName  = parts.slice(1).join(' ') || '';
    const avatarUrl = user_metadata?.avatar_url || user_metadata?.picture || '';

    await pool.query(
      `INSERT INTO users (id, email, first_name, last_name, profile_image_url)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET
         email=$2, first_name=$3, last_name=$4,
         profile_image_url=$5, updated_at=NOW()`,
      [id, email, firstName, lastName, avatarUrl]
    );
    await pool.query(
      'INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [id]
    );

    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/profile ──────────────────────────────────────────────────────────
app.get('/api/profile', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
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
    const userId = req.user.id;
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
      [req.user.id]
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
      [req.user.id, input, JSON.stringify(selectedPlatforms), JSON.stringify(outputs)]
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
      [req.params.id, req.user.id]
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
    await pool.query('DELETE FROM history WHERE user_id=$1', [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/stripe/subscription ─────────────────────────────────────────────
app.get('/api/stripe/subscription', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query('SELECT stripe_customer_id FROM users WHERE id=$1', [userId]);
    const customerId = rows[0]?.stripe_customer_id;
    if (!customerId) return res.json({ active: false, status: null });

    // Primary: query local synced table (fast)
    const result = await pool.query(`
      SELECT status, current_period_end FROM stripe.subscriptions
      WHERE customer = $1
      ORDER BY created DESC LIMIT 1
    `, [customerId]);

    let status = result.rows[0]?.status ?? null;
    let periodEnd = result.rows[0]?.current_period_end ?? null;

    // Fallback: if local table has nothing active, ask Stripe directly.
    // This handles webhook lag and dev-domain changes between sessions.
    const isActive = status === 'active' || status === 'trialing';
    if (!isActive) {
      try {
        const stripe = await getUncachableStripeClient();
        const { data } = await stripe.subscriptions.list({
          customer: customerId,
          limit: 1,
          status: 'all',
          expand: [],
        });
        if (data.length > 0) {
          const live = data[0];
          status = live.status;
          periodEnd = live.current_period_end ?? null;
        }
      } catch (stripeErr) {
        console.warn('Stripe API fallback failed:', stripeErr.message);
        // Continue with whatever the DB had
      }
    }

    res.json({
      active: status === 'active' || status === 'trialing',
      status: status || null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    });
  } catch (err) {
    console.error('Subscription check error:', err.message);
    res.json({ active: false, status: null });
  }
});

// ── POST /api/stripe/checkout ─────────────────────────────────────────────────
app.post('/api/stripe/checkout', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
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
    const userId = req.user.id;
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

// ── YouTube video upload multer (disk storage — videos can be large) ──────────
const videoUpload = multer({
  storage: multer.diskStorage({
    destination: '/tmp',
    filename: (_, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
      cb(null, `cm-${crypto.randomUUID()}-video${ext}`);
    },
  }),
  limits: { fileSize: 4 * 1024 * 1024 * 1024 }, // 4 GB
  fileFilter: (_, file, cb) => {
    const allowed = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.wmv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Unsupported video type "${ext}". Use .mp4, .mov, .mkv, .webm, or .m4v`));
  },
});

// ── GET /api/youtube/usage ────────────────────────────────────────────────────
app.get('/api/youtube/usage', isAuthenticated, async (req, res) => {
  try {
    const yearMonth = new Date().toISOString().slice(0, 7);
    const { rows } = await pool.query(
      'SELECT minutes_used, grace_used FROM video_usage WHERE user_id=$1 AND year_month=$2',
      [req.user.id, yearMonth]
    );
    const now = new Date();
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    res.json({
      minutesUsed: parseFloat(rows[0]?.minutes_used || 0),
      monthlyLimit: 360,
      graceUsed: rows[0]?.grace_used || false,
      resetDate,
    });
  } catch (err) {
    console.error('YouTube usage error:', err.message);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

// ── POST /api/youtube/upload ──────────────────────────────────────────────────
// Accepts a video file, extracts audio with ffmpeg, transcribes with Whisper.
// Video and audio files are deleted immediately at each step (including on error).
app.post('/api/youtube/upload', isAuthenticated, (req, res, next) => {
  videoUpload.single('video')(req, res, async (multerErr) => {
    if (multerErr) return res.status(400).json({ error: multerErr.message });
    if (!req.file) return res.status(400).json({ error: 'No video file uploaded' });

    const videoPath = req.file.path;
    const audioPath = `/tmp/cm-${crypto.randomUUID()}-audio.mp3`;

    try {
      // ── Duration check ──
      const durationSec = await getVideoDuration(videoPath);
      const durationMin = durationSec / 60;
      if (durationMin > 90) {
        safeDelete(videoPath);
        return res.status(400).json({
          error: `Video is ${Math.round(durationMin)} minutes — the limit is 90 minutes per upload.`,
        });
      }

      // ── Monthly cap check ──
      const yearMonth = new Date().toISOString().slice(0, 7);
      const { rows } = await pool.query(
        'SELECT minutes_used, grace_used FROM video_usage WHERE user_id=$1 AND year_month=$2',
        [req.user.id, yearMonth]
      );
      const currentMin = parseFloat(rows[0]?.minutes_used || 0);
      const graceUsed  = rows[0]?.grace_used || false;
      const MONTHLY_CAP = 360;
      const wouldExceed = (currentMin + durationMin) > MONTHLY_CAP;

      if (wouldExceed && graceUsed) {
        safeDelete(videoPath);
        const resetDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
        const formatted = resetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        return res.status(429).json({
          error: 'monthly_cap_exceeded',
          message: `You've used your video processing for this month. New uploads will be available again on ${formatted}. Everything else in Content Morph, including unlimited text generation, is still available.`,
          resetDate: resetDate.toISOString(),
        });
      }
      const warnGrace = wouldExceed && !graceUsed;

      // ── Extract audio, delete video immediately ──
      await extractAudio(videoPath, audioPath);
      safeDelete(videoPath);

      // ── File size guard (Whisper limit: 25 MB) ──
      const audioSize = fs.statSync(audioPath).size;
      if (audioSize > 24 * 1024 * 1024) {
        safeDelete(audioPath);
        return res.status(400).json({ error: 'Extracted audio exceeds 24 MB. Please trim the video.' });
      }

      // ── Whisper transcription ──
      const openaiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
      const audioBuffer = fs.readFileSync(audioPath);
      const audioBlob   = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const formData    = new FormData();
      formData.append('file', audioBlob, 'audio.mp3');
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'segment');

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiKey}` },
        body: formData,
      });

      // Delete audio regardless of Whisper outcome
      safeDelete(audioPath);

      if (!whisperRes.ok) {
        const errText = await whisperRes.text();
        return res.status(502).json({ error: `Transcription failed: ${errText}` });
      }

      const whisperData = await whisperRes.json();
      const transcript  = whisperData.text || '';
      const segments    = (whisperData.segments || []).map(s => ({
        start: s.start, end: s.end, text: s.text,
      }));

      // ── Update usage ──
      await pool.query(
        `INSERT INTO video_usage (user_id, year_month, minutes_used, grace_used)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, year_month) DO UPDATE SET
           minutes_used = video_usage.minutes_used + EXCLUDED.minutes_used,
           grace_used   = video_usage.grace_used OR EXCLUDED.grace_used`,
        [req.user.id, yearMonth, durationMin, warnGrace]
      );

      res.json({
        transcript, segments,
        durationMin: Math.round(durationMin * 10) / 10,
        warnGrace,
        warnMessage: warnGrace
          ? `You've used your 6 hours of video processing this month — this upload will still go through, but you're now over your monthly allotment. Everything else in Content Morph is still available.`
          : null,
      });
    } catch (err) {
      // Final safety net: delete any remaining tmp files
      safeDelete(videoPath, audioPath);
      console.error('YouTube upload error:', err.message);
      res.status(500).json({ error: err.message || 'Processing failed' });
    }
  });
});

// ── POST /api/youtube/generate ────────────────────────────────────────────────
// A 90-min transcript can be ~200 KB of JSON (text + segment objects).
// Apply a route-specific 10 MB limit instead of the global 100 KB default.
app.post('/api/youtube/generate', isAuthenticated, express.json({ limit: '10mb' }), async (req, res) => {
  const { transcript, isVideoTranscript, segments } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });

  const openaiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  if (!openaiKey) return res.status(500).json({ error: 'OpenAI API key not configured' });

  const profileResult = await pool.query(
    'SELECT brand_voice, writing_samples FROM profiles WHERE user_id=$1',
    [req.user.id]
  );
  const profile = profileResult.rows[0] || {};
  const brandVoice    = profile.brand_voice || '';
  const writingSamples = profile.writing_samples || [];

  // Attach timestamp segments so the model can anchor chapters accurately
  let segmentsContext = '';
  if (isVideoTranscript && segments?.length > 0) {
    segmentsContext = '\n\nTimestamp segments:\n' +
      segments.map(s => `[${formatTimestamp(s.start)}] ${s.text.trim()}`).join('\n');
  }

  const chaptersBlock = isVideoTranscript
    ? `###CHAPTERS###\n3–20 chapters based on natural topic breaks. MUST start with 0:00. Each chapter ≥10 seconds apart.\nFormat: 0:00 Chapter Title (one per line, nothing else)`
    : `###CHAPTERS###\nDraft structure (no real video yet). Use this exact header on line 1: "DRAFT STRUCTURE — add real timestamps after editing"\nThen list 4–8 logical sections like:\n0:00 Introduction\n2:00 [Section Name]`;

  let systemPrompt =
    `You are an expert YouTube content strategist. Generate a complete YouTube pre-publish package.\n` +
    (brandVoice.trim() ? `\nBRAND VOICE — apply to title and description: "${brandVoice.trim()}"` : '') +
    (writingSamples.length > 0
      ? `\n\nWRITING SAMPLES — mirror this style:\n${writingSamples.map((s,i)=>`Sample ${i+1}:\n${s.trim()}`).join('\n\n---\n\n')}`
      : '') +
    `\n\nRespond in EXACTLY this format — no text before or after the markers:\n\n` +
    `###TITLE###\n[Compelling title, max 70 chars, no clickbait]\n\n` +
    `###DESCRIPTION###\n[Hook in first 2 lines. Body with key points. CTA at end. Human voice, no AI clichés. Under 5000 chars.]\n\n` +
    chaptersBlock;

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Content:\n${transcript}${segmentsContext}` },
        ],
        stream: true,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return res.status(502).json({ error: `OpenAI error: ${errText}` });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    openaiRes.body.pipe(res);
  } catch (err) {
    console.error('YouTube generate error:', err.message);
    res.status(500).json({ error: 'Generation failed' });
  }
});

// ── Serve Vite build in production ────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// ── POST /api/generate ────────────────────────────────────────────────────────
// Proxies generation requests to OpenAI server-side so the API key never
// reaches the browser. Fetches the user's profile from DB to build the full
// system prompt without trusting client-supplied brand voice data.
app.post('/api/generate', isAuthenticated, async (req, res) => {
  const { platformPrompt, content, settings } = req.body;
  if (!platformPrompt || !content) {
    return res.status(400).json({ error: 'platformPrompt and content are required' });
  }

  const openaiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  if (!openaiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured on server' });
  }

  // Fetch profile from DB — never trust client-supplied brand voice
  const profileResult = await pool.query(
    'SELECT brand_voice, writing_samples FROM profiles WHERE user_id = $1',
    [req.user.id]
  );
  const profile = profileResult.rows[0] || {};

  // Build system prompt (mirrors client-side logic, now authoritative on server)
  let prompt = platformPrompt;
  const brandVoice = profile.brand_voice || '';
  const writingSamples = profile.writing_samples || [];

  if (brandVoice.trim()) {
    prompt = `BRAND VOICE OVERRIDE — Apply this brand voice to all output, overriding any default tone guidance: "${brandVoice.trim()}"\n\n${prompt}`;
  }
  if (writingSamples.length > 0) {
    const samplesText = writingSamples
      .map((s, i) => `Sample ${i + 1}:\n${s.trim()}`)
      .join('\n\n---\n\n');
    prompt += `\n\nWRITING SAMPLES — The user has provided examples of their own writing. Study their voice, rhythm, vocabulary, sentence structure, and tone. Mimic these qualities in your output — do NOT copy the content, only the style:\n\n${samplesText}`;
  }
  if (settings?.outputLanguage && settings.outputLanguage !== 'English') {
    prompt += `\n\nIMPORTANT: Write ALL output in ${settings.outputLanguage}. Do not use English.`;
  }
  if (settings?.contentLength === 'concise') {
    prompt += "\n\nLength instruction: Keep the output shorter and more concise than usual. Cut anything that isn't essential.";
  } else if (settings?.contentLength === 'detailed') {
    prompt += '\n\nLength instruction: Write a longer, more detailed and expansive version than you normally would.';
  }
  prompt += '\n\nQUALITY RULE: Your output must have perfect spelling and grammar. Never invent or merge words. Every sentence must be grammatically complete — never start a sentence with a comma, conjunction fragment, or mid-thought. Proofread before outputting.';

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content },
        ],
        stream: true,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return res.status(502).json({ error: `OpenAI error: ${errText}` });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    openaiRes.body.pipe(res);
  } catch (err) {
    console.error('Generate error:', err.message);
    res.status(500).json({ error: 'Generation failed' });
  }
});

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
