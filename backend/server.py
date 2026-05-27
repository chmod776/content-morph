from fastapi import FastAPI, APIRouter, Depends, HTTPException, Header, Request
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, secrets, base64, hashlib, json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import jwt as pyjwt
import httpx
from urllib.parse import urlencode
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

APP_BASE_URL = os.environ.get('APP_BASE_URL', 'http://localhost:8001').rstrip('/')
FRONTEND_URL = os.environ.get('FRONTEND_URL', APP_BASE_URL).rstrip('/')

app = FastAPI()
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

scheduler = AsyncIOScheduler()

# ---------- Models ----------
class StatusCheckCreate(BaseModel):
    client_name: str

class SocialAccount(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    platform: str
    account_name: str
    account_id: Optional[str] = None
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[str] = None
    scopes: Optional[str] = None
    connected_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_demo: bool = False

class PostRequest(BaseModel):
    platform: str
    content: str

class ScheduleRequest(BaseModel):
    platform: str
    content: str
    scheduled_at: str  # ISO datetime

class DemoConnectRequest(BaseModel):
    platform: str

class BatchPreset(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    mode: str = "schedule"  # "now" | "schedule"
    schedule_type: str = "offset"  # "offset" (minutes from load time) | "fixed" (clock time HH:MM in user's local tz)
    # platform_times: { "twitter": 0, "linkedin": 30 } for offset mode (minutes)
    # platform_times: { "twitter": "09:00", "linkedin": "12:30" } for fixed mode
    platform_times: dict = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BatchPresetCreate(BaseModel):
    name: str
    mode: str = "schedule"
    schedule_type: str = "offset"
    platform_times: dict

# ---------- Auth helper ----------
def get_user_id(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(401, "Missing auth token")
    token = authorization.split(' ', 1)[1]
    try:
        # Decode without verification: Supabase JWT contains user_id in sub
        payload = pyjwt.decode(token, options={"verify_signature": False})
        sub = payload.get('sub')
        if not sub:
            raise HTTPException(401, "Invalid token")
        return sub
    except pyjwt.PyJWTError as e:
        raise HTTPException(401, f"Invalid token: {e}")

# ---------- OAuth configuration ----------
OAUTH_CONFIG = {
    'twitter': {
        'client_id': os.environ.get('TWITTER_CLIENT_ID', ''),
        'client_secret': os.environ.get('TWITTER_CLIENT_SECRET', ''),
        'auth_url': 'https://twitter.com/i/oauth2/authorize',
        'token_url': 'https://api.twitter.com/2/oauth2/token',
        'scopes': 'tweet.read tweet.write users.read offline.access',
        'use_pkce': True
    },
    'linkedin': {
        'client_id': os.environ.get('LINKEDIN_CLIENT_ID', ''),
        'client_secret': os.environ.get('LINKEDIN_CLIENT_SECRET', ''),
        'auth_url': 'https://www.linkedin.com/oauth/v2/authorization',
        'token_url': 'https://www.linkedin.com/oauth/v2/accessToken',
        'scopes': 'openid profile w_member_social email',
        'use_pkce': False
    },
    'youtube': {
        'client_id': os.environ.get('GOOGLE_CLIENT_ID', ''),
        'client_secret': os.environ.get('GOOGLE_CLIENT_SECRET', ''),
        'auth_url': 'https://accounts.google.com/o/oauth2/v2/auth',
        'token_url': 'https://oauth2.googleapis.com/token',
        'scopes': 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/userinfo.profile',
        'use_pkce': False
    },
    'instagram': {
        'client_id': os.environ.get('META_CLIENT_ID', ''),
        'client_secret': os.environ.get('META_CLIENT_SECRET', ''),
        'auth_url': 'https://www.facebook.com/v18.0/dialog/oauth',
        'token_url': 'https://graph.facebook.com/v18.0/oauth/access_token',
        'scopes': 'instagram_basic,instagram_content_publish,pages_show_list',
        'use_pkce': False
    }
}

def redirect_uri(platform: str) -> str:
    return f"{APP_BASE_URL}/api/social/oauth/{platform}/callback"

# ---------- Existing status routes ----------
@api_router.get("/")
async def root():
    return {"message": "Content Morph API"}

@api_router.post("/status")
async def create_status_check(input: StatusCheckCreate):
    doc = {"id": str(uuid.uuid4()), "client_name": input.client_name,
           "timestamp": datetime.now(timezone.utc).isoformat()}
    await db.status_checks.insert_one(doc)
    return doc

# ---------- Social: accounts ----------
@api_router.get("/social/accounts")
async def list_accounts(user_id: str = Depends(get_user_id)):
    accounts = await db.social_accounts.find({"user_id": user_id}, {"_id": 0, "access_token": 0, "refresh_token": 0}).to_list(50)
    return {"accounts": accounts}

@api_router.delete("/social/accounts/{platform}")
async def delete_account(platform: str, user_id: str = Depends(get_user_id)):
    res = await db.social_accounts.delete_many({"user_id": user_id, "platform": platform})
    return {"deleted": res.deleted_count}

@api_router.post("/social/accounts/demo-connect")
async def demo_connect(req: DemoConnectRequest, user_id: str = Depends(get_user_id)):
    """For dev/demo: create a demo account for a platform without real OAuth credentials."""
    if req.platform not in OAUTH_CONFIG:
        raise HTTPException(400, "Unknown platform")
    # remove existing for this platform first
    await db.social_accounts.delete_many({"user_id": user_id, "platform": req.platform})
    acc = SocialAccount(
        user_id=user_id, platform=req.platform,
        account_name=f"demo_{req.platform}_user",
        account_id=f"demo-{secrets.token_hex(4)}",
        access_token="demo-token", is_demo=True,
        scopes=OAUTH_CONFIG[req.platform]['scopes']
    )
    await db.social_accounts.insert_one(acc.model_dump())
    return {"connected": True, "platform": req.platform, "demo": True}

# ---------- OAuth flow ----------
@api_router.get("/social/oauth/{platform}/start")
async def oauth_start(platform: str, user_id: str = Depends(get_user_id)):
    cfg = OAUTH_CONFIG.get(platform)
    if not cfg:
        raise HTTPException(400, "Unknown platform")
    if not cfg['client_id']:
        # No OAuth credentials configured: signal demo mode
        return {"demo": True, "message": f"OAuth not configured for {platform}. Use demo connect."}

    state = secrets.token_urlsafe(24)
    state_doc = {"state": state, "user_id": user_id, "platform": platform,
                 "created_at": datetime.now(timezone.utc).isoformat()}

    params = {
        "client_id": cfg['client_id'],
        "redirect_uri": redirect_uri(platform),
        "response_type": "code",
        "scope": cfg['scopes'],
        "state": state,
    }
    if cfg['use_pkce']:
        code_verifier = secrets.token_urlsafe(64)
        code_challenge = base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode()).digest()).rstrip(b'=').decode()
        params["code_challenge"] = code_challenge
        params["code_challenge_method"] = "S256"
        state_doc["code_verifier"] = code_verifier
    if platform == 'youtube':
        params["access_type"] = "offline"
        params["prompt"] = "consent"

    await db.oauth_states.insert_one(state_doc)
    return {"auth_url": f"{cfg['auth_url']}?{urlencode(params)}"}

@api_router.get("/social/oauth/{platform}/callback")
async def oauth_callback(platform: str, code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    if error:
        return RedirectResponse(f"{FRONTEND_URL}/?social=error")
    if not code or not state:
        return RedirectResponse(f"{FRONTEND_URL}/?social=error")

    state_doc = await db.oauth_states.find_one({"state": state})
    if not state_doc or state_doc.get('platform') != platform:
        return RedirectResponse(f"{FRONTEND_URL}/?social=error")
    await db.oauth_states.delete_one({"state": state})

    cfg = OAUTH_CONFIG[platform]
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri(platform),
        "client_id": cfg['client_id'],
        "client_secret": cfg['client_secret'],
    }
    if cfg['use_pkce'] and state_doc.get('code_verifier'):
        data["code_verifier"] = state_doc['code_verifier']

    try:
        async with httpx.AsyncClient(timeout=20) as cli:
            r = await cli.post(cfg['token_url'], data=data,
                               headers={"Content-Type": "application/x-www-form-urlencoded"})
            r.raise_for_status()
            token_data = r.json()
    except Exception as e:
        logger.exception("OAuth token exchange failed")
        return RedirectResponse(f"{FRONTEND_URL}/?social=error&reason=token")

    access_token = token_data.get('access_token')
    refresh_token = token_data.get('refresh_token')
    expires_in = token_data.get('expires_in')
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))).isoformat() if expires_in else None

    # Resolve account name
    account_name = f"{platform}_user"
    account_id = None
    try:
        async with httpx.AsyncClient(timeout=10) as cli:
            if platform == 'twitter':
                r = await cli.get('https://api.twitter.com/2/users/me', headers={"Authorization": f"Bearer {access_token}"})
                if r.status_code == 200:
                    u = r.json().get('data', {})
                    account_name = u.get('username') or account_name
                    account_id = u.get('id')
            elif platform == 'linkedin':
                r = await cli.get('https://api.linkedin.com/v2/userinfo', headers={"Authorization": f"Bearer {access_token}"})
                if r.status_code == 200:
                    u = r.json()
                    account_name = u.get('name') or u.get('email') or account_name
                    account_id = u.get('sub')
            elif platform == 'youtube':
                r = await cli.get('https://www.googleapis.com/oauth2/v2/userinfo', headers={"Authorization": f"Bearer {access_token}"})
                if r.status_code == 200:
                    u = r.json()
                    account_name = u.get('name') or u.get('email') or account_name
                    account_id = u.get('id')
            elif platform == 'instagram':
                r = await cli.get(f'https://graph.facebook.com/v18.0/me?access_token={access_token}')
                if r.status_code == 200:
                    u = r.json()
                    account_name = u.get('name') or account_name
                    account_id = u.get('id')
    except Exception:
        logger.exception("Failed to resolve account name")

    await db.social_accounts.delete_many({"user_id": state_doc['user_id'], "platform": platform})
    acc = SocialAccount(
        user_id=state_doc['user_id'], platform=platform,
        account_name=account_name, account_id=account_id,
        access_token=access_token, refresh_token=refresh_token,
        expires_at=expires_at, scopes=cfg['scopes']
    )
    await db.social_accounts.insert_one(acc.model_dump())
    return RedirectResponse(f"{FRONTEND_URL}/?social=connected")

# ---------- Posting ----------
async def _post_to_platform(account: dict, content: str) -> dict:
    """Returns dict with success/error. Demo accounts always succeed (simulated)."""
    if account.get('is_demo') or account.get('access_token') == 'demo-token':
        return {"success": True, "demo": True, "message": f"Simulated post to {account['platform']}"}

    platform = account['platform']
    token = account['access_token']
    try:
        async with httpx.AsyncClient(timeout=30) as cli:
            if platform == 'twitter':
                r = await cli.post('https://api.twitter.com/2/tweets',
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json={"text": content[:280]})
                if r.status_code in (200, 201):
                    return {"success": True, "id": r.json().get('data', {}).get('id')}
                return {"success": False, "error": f"Twitter {r.status_code}: {r.text[:200]}"}
            elif platform == 'linkedin':
                author = f"urn:li:person:{account.get('account_id')}"
                r = await cli.post('https://api.linkedin.com/v2/ugcPosts',
                    headers={"Authorization": f"Bearer {token}", "X-Restli-Protocol-Version": "2.0.0",
                             "Content-Type": "application/json"},
                    json={
                        "author": author, "lifecycleState": "PUBLISHED",
                        "specificContent": {"com.linkedin.ugc.ShareContent": {
                            "shareCommentary": {"text": content},
                            "shareMediaCategory": "NONE"}},
                        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
                    })
                if r.status_code in (200, 201):
                    return {"success": True, "id": r.headers.get('x-restli-id')}
                return {"success": False, "error": f"LinkedIn {r.status_code}: {r.text[:200]}"}
            elif platform == 'instagram':
                # Instagram Graph API requires a media object then publish; for text-only return informative message
                return {"success": False, "error": "Instagram requires an image/video. Text-only posts are not supported by the platform."}
            elif platform == 'youtube':
                # YouTube requires a video file; we can only update a community post via different endpoint
                return {"success": False, "error": "YouTube posting requires a video file upload, not supported for text content."}
        return {"success": False, "error": "Unknown platform"}
    except Exception as e:
        logger.exception("Platform post failed")
        return {"success": False, "error": str(e)[:200]}

@api_router.post("/social/post")
async def post_now(req: PostRequest, user_id: str = Depends(get_user_id)):
    account = await db.social_accounts.find_one({"user_id": user_id, "platform": req.platform})
    if not account:
        raise HTTPException(400, f"No connected {req.platform} account")
    result = await _post_to_platform(account, req.content)
    # Log post
    log = {
        "id": str(uuid.uuid4()), "user_id": user_id, "platform": req.platform,
        "content": req.content, "status": "posted" if result['success'] else "failed",
        "result": json.dumps(result)[:500],
        "posted_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.post_history.insert_one(log)
    if not result['success']:
        raise HTTPException(400, result.get('error', 'Post failed'))
    return result

@api_router.post("/social/schedule")
async def schedule_post(req: ScheduleRequest, user_id: str = Depends(get_user_id)):
    try:
        scheduled_dt = datetime.fromisoformat(req.scheduled_at.replace('Z', '+00:00'))
    except Exception:
        raise HTTPException(400, "Invalid scheduled_at")
    if scheduled_dt.tzinfo is None:
        scheduled_dt = scheduled_dt.replace(tzinfo=timezone.utc)
    if scheduled_dt < datetime.now(timezone.utc) - timedelta(seconds=10):
        raise HTTPException(400, "scheduled_at must be in the future")

    account = await db.social_accounts.find_one({"user_id": user_id, "platform": req.platform})
    if not account:
        raise HTTPException(400, f"No connected {req.platform} account")

    post = {
        "id": str(uuid.uuid4()), "user_id": user_id, "platform": req.platform,
        "content": req.content, "scheduled_at": scheduled_dt.isoformat(),
        "status": "pending", "created_at": datetime.now(timezone.utc).isoformat(),
        "error": None
    }
    await db.scheduled_posts.insert_one(post)
    post.pop('_id', None)
    return post

@api_router.get("/social/scheduled")
async def list_scheduled(user_id: str = Depends(get_user_id)):
    posts = await db.scheduled_posts.find({"user_id": user_id}, {"_id": 0}).sort("scheduled_at", -1).to_list(100)
    return {"posts": posts}

@api_router.delete("/social/scheduled/{post_id}")
async def cancel_scheduled(post_id: str, user_id: str = Depends(get_user_id)):
    res = await db.scheduled_posts.update_one(
        {"id": post_id, "user_id": user_id, "status": "pending"},
        {"$set": {"status": "cancelled"}}
    )
    return {"cancelled": res.modified_count}

# ---------- Batch Presets ----------
@api_router.get("/social/presets")
async def list_presets(user_id: str = Depends(get_user_id)):
    presets = await db.batch_presets.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"presets": presets}

@api_router.post("/social/presets")
async def create_preset(req: BatchPresetCreate, user_id: str = Depends(get_user_id)):
    if not req.name.strip():
        raise HTTPException(400, "Preset name is required")
    if req.mode not in ("now", "schedule"):
        raise HTTPException(400, "mode must be 'now' or 'schedule'")
    if req.schedule_type not in ("offset", "fixed"):
        raise HTTPException(400, "schedule_type must be 'offset' or 'fixed'")
    preset = BatchPreset(
        user_id=user_id, name=req.name.strip(),
        mode=req.mode, schedule_type=req.schedule_type,
        platform_times=req.platform_times or {}
    )
    await db.batch_presets.insert_one(preset.model_dump())
    return preset.model_dump()

@api_router.delete("/social/presets/{preset_id}")
async def delete_preset(preset_id: str, user_id: str = Depends(get_user_id)):
    res = await db.batch_presets.delete_one({"id": preset_id, "user_id": user_id})
    return {"deleted": res.deleted_count}

# ---------- Scheduler worker ----------
async def process_due_posts():
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor = db.scheduled_posts.find({"status": "pending", "scheduled_at": {"$lte": now_iso}})
    due = await cursor.to_list(50)
    for post in due:
        # claim it to avoid double processing
        claim = await db.scheduled_posts.update_one(
            {"id": post['id'], "status": "pending"}, {"$set": {"status": "processing"}})
        if claim.modified_count != 1:
            continue
        account = await db.social_accounts.find_one({"user_id": post['user_id'], "platform": post['platform']})
        if not account:
            await db.scheduled_posts.update_one({"id": post['id']},
                {"$set": {"status": "failed", "error": "Account no longer connected"}})
            continue
        result = await _post_to_platform(account, post['content'])
        await db.scheduled_posts.update_one({"id": post['id']}, {
            "$set": {
                "status": "posted" if result['success'] else "failed",
                "error": None if result['success'] else result.get('error'),
                "posted_at": datetime.now(timezone.utc).isoformat() if result['success'] else None
            }
        })

@app.on_event("startup")
async def startup_event():
    scheduler.add_job(process_due_posts, 'interval', seconds=30, id='process_scheduled')
    scheduler.start()
    logger.info("Scheduler started")

@app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown(wait=False)
    client.close()

# Include router
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
