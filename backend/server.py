from fastapi import FastAPI, APIRouter, Depends, HTTPException, Header, Request, UploadFile, File, Response
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, secrets, base64, hashlib, json, mimetypes
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import jwt as pyjwt
import httpx
import requests
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
APP_NAME = os.environ.get('APP_NAME', 'content-morph')

# ---------- Object Storage (Emergent) ----------
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
_storage_key: Optional[str] = None

def init_storage() -> Optional[str]:
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_KEY:
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        return _storage_key
    except Exception as e:
        logging.exception("Storage init failed")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(500, "Object storage not initialized")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    key = init_storage()
    if not key:
        raise HTTPException(500, "Object storage not initialized")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

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
    media_url: Optional[str] = None
    media_type: Optional[str] = None  # 'image' | 'video'

class ScheduleRequest(BaseModel):
    platform: str
    content: str
    scheduled_at: str  # ISO datetime
    media_url: Optional[str] = None
    media_type: Optional[str] = None

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

# ---------- File uploads ----------
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024   # 10 MB
MAX_VIDEO_BYTES = 200 * 1024 * 1024  # 200 MB

@api_router.post("/uploads")
async def upload_file(file: UploadFile = File(...), user_id: str = Depends(get_user_id)):
    ctype = (file.content_type or "").lower()
    is_image = ctype in ALLOWED_IMAGE_TYPES
    is_video = ctype in ALLOWED_VIDEO_TYPES
    if not (is_image or is_video):
        raise HTTPException(400, f"Unsupported file type: {ctype}. Allowed: jpg, png, webp, gif, mp4, mov.")
    data = await file.read()
    if is_image and len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(400, f"Image too large (max {MAX_IMAGE_BYTES // 1024 // 1024} MB)")
    if is_video and len(data) > MAX_VIDEO_BYTES:
        raise HTTPException(400, f"Video too large (max {MAX_VIDEO_BYTES // 1024 // 1024} MB)")

    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "bin"
    file_id = str(uuid.uuid4())
    storage_path = f"{APP_NAME}/uploads/{user_id}/{file_id}.{ext}"
    result = put_object(storage_path, data, ctype)

    record = {
        "id": file_id,
        "user_id": user_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": ctype,
        "size": len(data),
        "media_type": "image" if is_image else "video",
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.files.insert_one(record)
    public_url = f"{APP_BASE_URL}/api/files/{file_id}"
    return {
        "file_id": file_id,
        "url": public_url,
        "media_type": record["media_type"],
        "content_type": ctype,
        "size": len(data),
    }

@api_router.get("/files/{file_id}")
async def serve_file(file_id: str):
    """Public file serving — file_ids are unguessable UUIDs. Used by social platforms to fetch media."""
    record = await db.files.find_one({"id": file_id, "is_deleted": False})
    if not record:
        raise HTTPException(404, "File not found")
    data, content_type = get_object(record["storage_path"])
    return Response(content=data, media_type=record.get("content_type") or content_type)

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
async def _twitter_upload_media(token: str, media_bytes: bytes, content_type: str) -> Optional[str]:
    """Upload media to Twitter v1.1, return media_id_string. Works with OAuth 2.0 user tokens."""
    try:
        async with httpx.AsyncClient(timeout=60) as cli:
            files = {"media": ("upload", media_bytes, content_type)}
            r = await cli.post(
                "https://upload.twitter.com/1.1/media/upload.json",
                headers={"Authorization": f"Bearer {token}"},
                files=files,
            )
            if r.status_code in (200, 201):
                return r.json().get("media_id_string")
            logger.warning(f"Twitter media upload failed {r.status_code}: {r.text[:200]}")
            return None
    except Exception:
        logger.exception("Twitter media upload exception")
        return None

async def _fetch_media_bytes(media_url: str) -> tuple:
    """Fetch bytes + content_type for a media url that we own (i.e., served by /api/files/{id})."""
    async with httpx.AsyncClient(timeout=60) as cli:
        r = await cli.get(media_url)
        r.raise_for_status()
        return r.content, r.headers.get("Content-Type", "application/octet-stream")

async def _post_to_platform(account: dict, content: str, media_url: Optional[str] = None, media_type: Optional[str] = None) -> dict:
    """Returns dict with success/error. Demo accounts always succeed (simulated)."""
    if account.get('is_demo') or account.get('access_token') == 'demo-token':
        return {"success": True, "demo": True, "message": f"Simulated post to {account['platform']}{' with media' if media_url else ''}"}

    platform = account['platform']
    token = account['access_token']
    try:
        async with httpx.AsyncClient(timeout=60) as cli:
            if platform == 'twitter':
                tweet_body = {"text": content[:280]}
                if media_url:
                    media_bytes, ctype = await _fetch_media_bytes(media_url)
                    media_id = await _twitter_upload_media(token, media_bytes, ctype)
                    if not media_id:
                        return {"success": False, "error": "Twitter media upload failed"}
                    tweet_body["media"] = {"media_ids": [media_id]}
                r = await cli.post('https://api.twitter.com/2/tweets',
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json=tweet_body)
                if r.status_code in (200, 201):
                    return {"success": True, "id": r.json().get('data', {}).get('id')}
                return {"success": False, "error": f"Twitter {r.status_code}: {r.text[:200]}"}
            elif platform == 'linkedin':
                author = f"urn:li:person:{account.get('account_id')}"
                share_content = {
                    "shareCommentary": {"text": content},
                    "shareMediaCategory": "NONE"
                }
                if media_url and media_type == 'image':
                    # Register upload
                    reg = await cli.post(
                        'https://api.linkedin.com/v2/assets?action=registerUpload',
                        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                        json={"registerUploadRequest": {
                            "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
                            "owner": author,
                            "serviceRelationships": [{"relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent"}]
                        }}
                    )
                    if reg.status_code in (200, 201):
                        reg_data = reg.json().get('value', {})
                        upload_url = reg_data.get('uploadMechanism', {}).get('com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest', {}).get('uploadUrl')
                        asset_urn = reg_data.get('asset')
                        if upload_url and asset_urn:
                            media_bytes, _ = await _fetch_media_bytes(media_url)
                            up = await cli.put(upload_url, headers={"Authorization": f"Bearer {token}"}, content=media_bytes)
                            if up.status_code in (200, 201):
                                share_content["shareMediaCategory"] = "IMAGE"
                                share_content["media"] = [{
                                    "status": "READY",
                                    "description": {"text": content[:200]},
                                    "media": asset_urn,
                                    "title": {"text": "Post"}
                                }]
                r = await cli.post('https://api.linkedin.com/v2/ugcPosts',
                    headers={"Authorization": f"Bearer {token}", "X-Restli-Protocol-Version": "2.0.0",
                             "Content-Type": "application/json"},
                    json={
                        "author": author, "lifecycleState": "PUBLISHED",
                        "specificContent": {"com.linkedin.ugc.ShareContent": share_content},
                        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
                    })
                if r.status_code in (200, 201):
                    return {"success": True, "id": r.headers.get('x-restli-id')}
                return {"success": False, "error": f"LinkedIn {r.status_code}: {r.text[:200]}"}
            elif platform == 'instagram':
                if not media_url:
                    return {"success": False, "error": "Instagram requires an image or video. Attach media before posting."}
                ig_user_id = account.get('account_id')
                if not ig_user_id:
                    return {"success": False, "error": "Instagram Business account ID missing — reconnect the account."}
                params = {"caption": content, "access_token": token}
                if media_type == 'video':
                    params["media_type"] = "REELS"
                    params["video_url"] = media_url
                else:
                    params["image_url"] = media_url
                # Create container
                cr = await cli.post(f"https://graph.facebook.com/v18.0/{ig_user_id}/media", data=params)
                if cr.status_code not in (200, 201):
                    return {"success": False, "error": f"Instagram container {cr.status_code}: {cr.text[:200]}"}
                container_id = cr.json().get('id')
                # Publish container
                pb = await cli.post(f"https://graph.facebook.com/v18.0/{ig_user_id}/media_publish",
                                    data={"creation_id": container_id, "access_token": token})
                if pb.status_code in (200, 201):
                    return {"success": True, "id": pb.json().get('id')}
                return {"success": False, "error": f"Instagram publish {pb.status_code}: {pb.text[:200]}"}
            elif platform == 'youtube':
                return {"success": False, "error": "YouTube posting requires a video file upload — not yet supported in this version."}
        return {"success": False, "error": "Unknown platform"}
    except Exception as e:
        logger.exception("Platform post failed")
        return {"success": False, "error": str(e)[:200]}

@api_router.post("/social/post")
async def post_now(req: PostRequest, user_id: str = Depends(get_user_id)):
    account = await db.social_accounts.find_one({"user_id": user_id, "platform": req.platform})
    if not account:
        raise HTTPException(400, f"No connected {req.platform} account")
    result = await _post_to_platform(account, req.content, req.media_url, req.media_type)
    # Log post
    log = {
        "id": str(uuid.uuid4()), "user_id": user_id, "platform": req.platform,
        "content": req.content, "status": "posted" if result['success'] else "failed",
        "media_url": req.media_url, "media_type": req.media_type,
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
        "content": req.content,
        "media_url": req.media_url, "media_type": req.media_type,
        "scheduled_at": scheduled_dt.isoformat(),
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
        result = await _post_to_platform(account, post['content'], post.get('media_url'), post.get('media_type'))
        await db.scheduled_posts.update_one({"id": post['id']}, {
            "$set": {
                "status": "posted" if result['success'] else "failed",
                "error": None if result['success'] else result.get('error'),
                "posted_at": datetime.now(timezone.utc).isoformat() if result['success'] else None
            }
        })

@app.on_event("startup")
async def startup_event():
    init_storage()
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
