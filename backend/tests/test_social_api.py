"""Backend tests for Content-Morph social API."""
import os
import time
import pytest
import requests
import jwt as pyjwt
from datetime import datetime, timezone, timedelta

BASE_URL = "https://cross-post-hub-5.preview.emergentagent.com"
USER_SUB = "test-uid-social-1"


@pytest.fixture(scope="module")
def token():
    return pyjwt.encode({"sub": USER_SUB, "aud": "authenticated"}, "any-secret", algorithm="HS256")


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module", autouse=True)
def cleanup(auth_headers):
    # cleanup any prior state for this user
    for plat in ["twitter", "linkedin", "youtube", "instagram"]:
        requests.delete(f"{BASE_URL}/api/social/accounts/{plat}", headers=auth_headers)
    # cancel/clear scheduled posts via API list+delete
    r = requests.get(f"{BASE_URL}/api/social/scheduled", headers=auth_headers)
    if r.status_code == 200:
        for p in r.json().get("posts", []):
            requests.delete(f"{BASE_URL}/api/social/scheduled/{p['id']}", headers=auth_headers)
    yield


# ----- Basic & Auth gating -----
class TestBasics:
    def test_root(self):
        r = requests.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert r.json().get("message") == "Content Morph API"

    def test_accounts_requires_auth(self):
        assert requests.get(f"{BASE_URL}/api/social/accounts").status_code == 401

    def test_post_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/social/post", json={"platform": "twitter", "content": "x"})
        assert r.status_code == 401

    def test_schedule_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/social/schedule",
                          json={"platform": "twitter", "content": "x", "scheduled_at": "2099-01-01T00:00:00Z"})
        assert r.status_code == 401


# ----- Accounts + demo connect -----
class TestAccounts:
    def test_accounts_empty_initially(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/social/accounts", headers=auth_headers)
        assert r.status_code == 200
        assert r.json() == {"accounts": []}

    def test_demo_connect_twitter(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/social/accounts/demo-connect",
                          headers=auth_headers, json={"platform": "twitter"})
        assert r.status_code == 200
        data = r.json()
        assert data["connected"] is True
        assert data["platform"] == "twitter"
        assert data["demo"] is True

    def test_accounts_lists_demo(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/social/accounts", headers=auth_headers)
        assert r.status_code == 200
        accs = r.json()["accounts"]
        assert len(accs) == 1
        assert accs[0]["platform"] == "twitter"
        assert accs[0]["is_demo"] is True

    def test_oauth_start_demo_mode(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/social/oauth/twitter/start", headers=auth_headers)
        assert r.status_code == 200
        assert r.json().get("demo") is True


# ----- Post-now -----
class TestPostNow:
    def test_post_now_demo(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/social/post",
                          headers=auth_headers, json={"platform": "twitter", "content": "hello"})
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True
        assert data.get("demo") is True

    def test_post_no_account(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/social/post",
                          headers=auth_headers, json={"platform": "linkedin", "content": "hello"})
        assert r.status_code == 400


# ----- Scheduling -----
class TestSchedule:
    def test_schedule_past_400(self, auth_headers):
        past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        r = requests.post(f"{BASE_URL}/api/social/schedule",
                          headers=auth_headers,
                          json={"platform": "twitter", "content": "x", "scheduled_at": past})
        assert r.status_code == 400

    def test_schedule_future_ok(self, auth_headers):
        future = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        r = requests.post(f"{BASE_URL}/api/social/schedule",
                          headers=auth_headers,
                          json={"platform": "twitter", "content": "future post", "scheduled_at": future})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "pending"
        assert data["platform"] == "twitter"
        assert "id" in data
        pytest.scheduled_id = data["id"]

    def test_list_scheduled(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/social/scheduled", headers=auth_headers)
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()["posts"]]
        assert pytest.scheduled_id in ids

    def test_cancel_scheduled(self, auth_headers):
        r = requests.delete(f"{BASE_URL}/api/social/scheduled/{pytest.scheduled_id}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["cancelled"] == 1
        # verify status changed
        r2 = requests.get(f"{BASE_URL}/api/social/scheduled", headers=auth_headers)
        target = [p for p in r2.json()["posts"] if p["id"] == pytest.scheduled_id][0]
        assert target["status"] == "cancelled"


# ----- Delete account -----
class TestDeleteAccount:
    def test_delete_demo_account(self, auth_headers):
        # ensure exists
        requests.post(f"{BASE_URL}/api/social/accounts/demo-connect",
                      headers=auth_headers, json={"platform": "twitter"})
        r = requests.delete(f"{BASE_URL}/api/social/accounts/twitter", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["deleted"] >= 1
        r2 = requests.get(f"{BASE_URL}/api/social/accounts", headers=auth_headers)
        plats = [a["platform"] for a in r2.json()["accounts"]]
        assert "twitter" not in plats


# ----- Scheduler worker end-to-end -----
class TestSchedulerWorker:
    def test_scheduled_post_gets_processed(self, auth_headers):
        # reconnect demo account
        requests.post(f"{BASE_URL}/api/social/accounts/demo-connect",
                      headers=auth_headers, json={"platform": "twitter"})
        future = (datetime.now(timezone.utc) + timedelta(seconds=35)).isoformat()
        r = requests.post(f"{BASE_URL}/api/social/schedule",
                          headers=auth_headers,
                          json={"platform": "twitter", "content": "auto-fired", "scheduled_at": future})
        assert r.status_code == 200
        post_id = r.json()["id"]

        # wait up to ~75s for scheduler (interval 30s) to fire
        deadline = time.time() + 75
        status = None
        while time.time() < deadline:
            time.sleep(10)
            r2 = requests.get(f"{BASE_URL}/api/social/scheduled", headers=auth_headers)
            posts = [p for p in r2.json()["posts"] if p["id"] == post_id]
            if posts:
                status = posts[0]["status"]
                if status == "posted":
                    break
        assert status == "posted", f"Final status: {status}"
