"""LOCAFACIL iteration 3: Emergent Google Auth integration tests.

Covers:
- POST /api/auth/google/session contract (400 missing header, 401 invalid session_id)
- Legacy JWT still works
- Cookie precedence: session_token > access_token
- Session expiry: expired session falls back to JWT/401
- Logout deletes session doc and clears cookies
- Admin elevation for tailansantos06@gmail.com (simulated via direct DB)
- Session upsert semantics
- Google user model shape (simulated)
"""
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL.startswith("http"), "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "locafacil")

ADMIN = ("admin@locafacil.com.br", "Locafacil@2026")
ADMIN_GOOGLE_EMAIL = "tailansantos06@gmail.com"


@pytest.fixture(scope="module")
def mongo():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture(scope="module")
def cleanup(mongo):
    yield
    # cleanup test sessions and test users
    mongo.sessions.delete_many({"session_token": {"$regex": "^TEST_"}})
    mongo.users.delete_many({"email": {"$regex": "^test_google_"}})


# ---------- 1. /api/auth/google/session contract ----------
class TestGoogleSessionContract:
    def test_missing_header_returns_400(self):
        r = requests.post(f"{API}/auth/google/session")
        assert r.status_code == 400, r.text
        assert r.json().get("detail") == "X-Session-ID header ausente"

    def test_invalid_session_id_returns_401(self):
        r = requests.post(
            f"{API}/auth/google/session",
            headers={"X-Session-ID": "invalid_fake_session_id_xyz_12345"},
        )
        assert r.status_code == 401, r.text
        assert r.json().get("detail") == "session_id inválido ou expirado"


# ---------- 2. Legacy JWT still works ----------
class TestLegacyJwt:
    def test_login_and_me(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN[0], "password": ADMIN[1]})
        assert r.status_code == 200, r.text
        assert "access_token" in s.cookies
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["email"] == ADMIN[0]


# ---------- 3. Cookie precedence: session_token > access_token ----------
class TestCookiePrecedence:
    def test_session_token_takes_priority(self, mongo, cleanup):
        # Create a temp user + session pointing at it
        uid = f"test_google_user_{uuid.uuid4().hex[:8]}"
        email = f"test_google_{uid}@example.com"
        mongo.users.insert_one({
            "id": uid, "email": email, "name": "Google Tester",
            "role": "renter", "kyc_level": "basic",
            "auth_provider": "google", "password_hash": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        stoken = f"TEST_stok_{uuid.uuid4().hex}"
        mongo.sessions.insert_one({
            "session_token": stoken, "user_id": uid,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=1),
        })

        # Log in as admin (gets access_token cookie) then also attach session_token
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN[0], "password": ADMIN[1]})
        assert r.status_code == 200
        # Add fake session_token cookie via manual header (Session cookie jar)
        # cookies must be set on domain of BASE_URL
        from urllib.parse import urlparse
        host = urlparse(BASE_URL).hostname
        s.cookies.set("session_token", stoken, domain=host, path="/")

        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        # Should resolve to the Google user (via session_token), NOT admin
        assert me.json()["email"] == email, f"expected {email}, got {me.json()}"


# ---------- 4. Session expiry falls back / 401 ----------
class TestSessionExpiry:
    def test_expired_session_not_authenticated(self, mongo, cleanup):
        uid = f"test_google_user_{uuid.uuid4().hex[:8]}"
        email = f"test_google_{uid}@example.com"
        mongo.users.insert_one({
            "id": uid, "email": email, "name": "Expired",
            "role": "renter", "kyc_level": "basic",
            "auth_provider": "google", "password_hash": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        stoken = f"TEST_expired_{uuid.uuid4().hex}"
        mongo.sessions.insert_one({
            "session_token": stoken, "user_id": uid,
            "expires_at": datetime.now(timezone.utc) - timedelta(hours=1),
        })
        s = requests.Session()
        from urllib.parse import urlparse
        host = urlparse(BASE_URL).hostname
        s.cookies.set("session_token", stoken, domain=host, path="/")
        me = s.get(f"{API}/auth/me")
        # No JWT set → must be 401
        assert me.status_code == 401


# ---------- 5. Logout deletes session and clears cookies ----------
class TestLogout:
    def test_logout_deletes_session_and_cookies(self, mongo, cleanup):
        uid = f"test_google_user_{uuid.uuid4().hex[:8]}"
        email = f"test_google_{uid}@example.com"
        mongo.users.insert_one({
            "id": uid, "email": email, "name": "Logout Test",
            "role": "renter", "kyc_level": "basic",
            "auth_provider": "google", "password_hash": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        stoken = f"TEST_logout_{uuid.uuid4().hex}"
        mongo.sessions.insert_one({
            "session_token": stoken, "user_id": uid,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=1),
        })

        s = requests.Session()
        from urllib.parse import urlparse
        host = urlparse(BASE_URL).hostname
        s.cookies.set("session_token", stoken, domain=host, path="/")

        # verify authenticated
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["email"] == email

        # logout
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200

        # Verify session document removed
        assert mongo.sessions.find_one({"session_token": stoken}) is None

        # Subsequent /me should be 401 (cookies cleared server-side; client jar may still have it
        # but even if it does, session doc is gone so no auth)
        s2 = requests.Session()
        s2.cookies.set("session_token", stoken, domain=host, path="/")
        me2 = s2.get(f"{API}/auth/me")
        assert me2.status_code == 401


# ---------- 6. Admin elevation for tailansantos06@gmail.com ----------
class TestAdminElevation:
    def test_admin_email_in_allowlist_and_elevation_logic(self, mongo):
        """Simulate: existing user with tailansantos06@gmail.com gets elevated on Google login.

        We can't fire the real endpoint (no valid session_id), but we can:
        - Insert a non-admin user with the admin email
        - Directly apply the same update the endpoint applies
        - Verify role becomes admin & kyc_level=approved
        Also verify a first-login user would be created as admin.
        """
        # Cleanup any prior test state for the real admin email
        pre_existing = mongo.users.find_one({"email": ADMIN_GOOGLE_EMAIL})
        # snapshot then remove so we simulate fresh
        mongo.users.delete_many({"email": ADMIN_GOOGLE_EMAIL})
        try:
            # Case A: existing renter with this email → elevate
            mongo.users.insert_one({
                "id": f"tst_{uuid.uuid4().hex[:8]}",
                "email": ADMIN_GOOGLE_EMAIL,
                "name": "Tailan",
                "role": "renter",
                "kyc_level": "basic",
                "auth_provider": "google",
                "password_hash": "",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            # Simulate the endpoint's elevation block
            u = mongo.users.find_one({"email": ADMIN_GOOGLE_EMAIL})
            ADMIN_GOOGLE_EMAILS = {"tailansantos06@gmail.com"}
            updates = {}
            if u["email"] in ADMIN_GOOGLE_EMAILS and u.get("role") != "admin":
                updates["role"] = "admin"
                updates["kyc_level"] = "approved"
            assert updates == {"role": "admin", "kyc_level": "approved"}
            mongo.users.update_one({"id": u["id"]}, {"$set": updates})
            u2 = mongo.users.find_one({"email": ADMIN_GOOGLE_EMAIL})
            assert u2["role"] == "admin"
            assert u2["kyc_level"] == "approved"

            # Case B: user does not exist → creation sets role admin
            mongo.users.delete_many({"email": ADMIN_GOOGLE_EMAIL})
            role = "admin" if ADMIN_GOOGLE_EMAIL in ADMIN_GOOGLE_EMAILS else "renter"
            assert role == "admin"
            new_u = {
                "id": f"tst_{uuid.uuid4().hex[:8]}",
                "email": ADMIN_GOOGLE_EMAIL,
                "name": "Tailan",
                "phone": "", "whatsapp": "", "instagram": "", "facebook": "", "bio": "",
                "role": role,
                "password_hash": "",
                "auth_provider": "google",
                "avatar": "https://example.com/pic.jpg",
                "kyc_level": "approved" if role == "admin" else "basic",
                "kyc_data": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            mongo.users.insert_one(new_u)
            u3 = mongo.users.find_one({"email": ADMIN_GOOGLE_EMAIL})
            assert u3["role"] == "admin"
            assert u3["kyc_level"] == "approved"
            assert u3["auth_provider"] == "google"
            assert u3["password_hash"] == ""
            assert u3["avatar"] == "https://example.com/pic.jpg"
            for f in ("phone", "whatsapp", "instagram", "facebook", "bio"):
                assert u3[f] == ""
        finally:
            mongo.users.delete_many({"email": ADMIN_GOOGLE_EMAIL})
            if pre_existing:
                pre_existing.pop("_id", None)
                mongo.users.insert_one(pre_existing)


# ---------- 7. Session upsert semantics (no duplicates) ----------
class TestSessionUpsert:
    def test_upsert_does_not_duplicate(self, mongo, cleanup):
        stoken = f"TEST_upsert_{uuid.uuid4().hex}"
        uid = f"test_google_user_{uuid.uuid4().hex[:8]}"
        # Two consecutive upserts with same key
        for _ in range(2):
            mongo.sessions.update_one(
                {"session_token": stoken},
                {"$set": {"session_token": stoken, "user_id": uid,
                          "expires_at": datetime.now(timezone.utc) + timedelta(days=7)}},
                upsert=True,
            )
        cnt = mongo.sessions.count_documents({"session_token": stoken})
        assert cnt == 1


# ---------- 8. sessions collection exists / accessible ----------
class TestSessionsCollection:
    def test_can_read_sessions(self, mongo):
        # Just ensure collection is queryable
        _ = mongo.sessions.count_documents({})
