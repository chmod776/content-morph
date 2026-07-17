---
name: Profile DB schema
description: PostgreSQL tables created by server.js initDb() for user profiles in Content Morph.
---

## Tables

### sessions
Required by connect-pg-simple for session persistence.
```sql
sid TEXT PRIMARY KEY, sess JSONB NOT NULL, expire TIMESTAMP
```

### users
Populated by Replit Auth OIDC claims on every login (upsert).
```sql
id TEXT PRIMARY KEY  -- = OIDC sub claim
email TEXT UNIQUE, first_name TEXT, last_name TEXT, profile_image_url TEXT
created_at, updated_at TIMESTAMP
```

### profiles
One row per user. Created with defaults on first login.
```sql
user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
brand_voice TEXT DEFAULT ''
writing_samples JSONB DEFAULT '[]'   -- array of strings, max 3
onboarded BOOLEAN DEFAULT FALSE
created_at, updated_at TIMESTAMP
```

## API
- `GET /api/profile` — returns { brand_voice, writing_samples, onboarded }
- `PUT /api/profile` — partial update; writing_samples is filtered (non-empty, max 3) server-side
- `POST /api/profile/extract-text` — multer single file upload, returns { text }; supports .txt .md .pdf .docx, max 5MB

**Why JSONB for writing_samples:** Simpler than a separate samples table; max 3 items, so no indexing needed.
