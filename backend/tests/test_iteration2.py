"""DriveHub iteration 2 tests: profile edit, admin detail modals, WhatsApp reveal, social fields."""
import os
import time
from datetime import datetime, timedelta
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
assert BASE_URL.startswith('http'), "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

ADMIN = ("admin@drivehub.com.br", "DriveHub@2026")
RENTER = ("locatario@teste.com", "Teste@2026")
OWNER = ("proprietario@teste.com", "Teste@2026")


def _login(email, pw):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert r.status_code == 200, f"login failed {email}: {r.text}"
    return s


@pytest.fixture(scope="module")
def admin_s():
    return _login(*ADMIN)


@pytest.fixture(scope="module")
def renter_s():
    return _login(*RENTER)


@pytest.fixture(scope="module")
def owner_s():
    return _login(*OWNER)


# ---------- 1. Registration with social fields ----------
class TestRegisterSocial:
    def test_register_with_socials(self):
        email = f"test_soc_{int(time.time()*1000)}@teste.com"
        r = requests.post(f"{API}/auth/register", json={
            "name": "Social User", "email": email, "password": "Test@2026",
            "role": "renter", "phone": "+5548911112222",
            "whatsapp": "+5548911112222", "instagram": "@socialuser",
            "facebook": "social.user",
        })
        assert r.status_code == 200, r.text
        u = r.json()["user"]
        assert u["email"] == email
        # login and verify /auth/me has fields
        s = _login(email, "Test@2026")
        me = s.get(f"{API}/auth/me").json()
        assert me.get("whatsapp") == "+5548911112222"
        assert me.get("instagram") == "@socialuser"
        assert me.get("facebook") == "social.user"


# ---------- 2. Profile PATCH ----------
class TestProfileEdit:
    def test_patch_profile_updates_fields(self, renter_s):
        payload = {
            "whatsapp": "+5548988887777",
            "instagram": "@locatariotest",
            "facebook": "locatario.test",
            "bio": "Testing bio update",
            "phone": "+55 48 98888-7777",
        }
        r = renter_s.patch(f"{API}/auth/profile", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        for k, v in payload.items():
            assert d.get(k) == v, f"{k} mismatch"
        # verify via /me
        me = renter_s.get(f"{API}/auth/me").json()
        assert me["whatsapp"] == payload["whatsapp"]
        assert me["instagram"] == payload["instagram"]
        assert me["bio"] == payload["bio"]

    def test_patch_profile_requires_auth(self):
        r = requests.patch(f"{API}/auth/profile", json={"bio": "x"})
        assert r.status_code == 401


# ---------- 3. Admin user detail modal ----------
class TestAdminUserDetail:
    def test_admin_user_detail_shape(self, admin_s):
        users = admin_s.get(f"{API}/admin/users").json()
        # find owner
        owner_u = next(u for u in users if u["email"] == OWNER[0])
        r = admin_s.get(f"{API}/admin/users/{owner_u['id']}")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("user", "vehicles", "bookings_as_renter", "bookings_as_owner"):
            assert k in d
        # owner should have >=8 vehicles
        assert len(d["vehicles"]) >= 8, f"owner has {len(d['vehicles'])} vehicles"
        # user has social fields
        u = d["user"]
        assert u.get("whatsapp"), "seed migration missing whatsapp"
        assert u.get("instagram"), "seed migration missing instagram"
        assert u.get("facebook"), "seed migration missing facebook"
        # password not leaked
        assert "password_hash" not in u

    def test_admin_user_detail_renter(self, admin_s):
        users = admin_s.get(f"{API}/admin/users").json()
        renter_u = next(u for u in users if u["email"] == RENTER[0])
        r = admin_s.get(f"{API}/admin/users/{renter_u['id']}")
        assert r.status_code == 200
        d = r.json()
        # KYC should be populated
        assert d["user"].get("kyc_level") == "approved"

    def test_admin_user_detail_forbidden_for_renter(self, renter_s, admin_s):
        users = admin_s.get(f"{API}/admin/users").json()
        uid = users[0]["id"]
        r = renter_s.get(f"{API}/admin/users/{uid}")
        assert r.status_code == 403


# ---------- 4. Admin vehicle detail modal ----------
class TestAdminVehicleDetail:
    def test_admin_vehicle_detail_shape(self, admin_s):
        vs = requests.get(f"{API}/vehicles").json()
        vid = vs[0]["id"]
        r = admin_s.get(f"{API}/admin/vehicles/{vid}")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("vehicle", "owner", "bookings"):
            assert k in d
        v = d["vehicle"]
        assert "photos" in v
        assert "plate_full" in v, "admin should get unmasked plate"
        assert v["plate_full"] and "*" not in v["plate_full"]
        assert d["owner"] and d["owner"].get("email")
        assert "password_hash" not in d["owner"]

    def test_admin_vehicle_detail_forbidden_for_owner(self, owner_s):
        vs = requests.get(f"{API}/vehicles").json()
        r = owner_s.get(f"{API}/admin/vehicles/{vs[0]['id']}")
        assert r.status_code == 403


# ---------- 5. Multi-vehicle owner ----------
class TestOwnerMultiVehicle:
    def test_owner_has_multiple(self, owner_s):
        r = owner_s.get(f"{API}/vehicles/mine/list")
        assert r.status_code == 200
        vs = r.json()
        assert len(vs) >= 8, f"expected >=8, got {len(vs)}"


# ---------- 6. Contact reveal post-payment ----------
@pytest.fixture(scope="module")
def paid_booking(renter_s):
    vs = requests.get(f"{API}/vehicles").json()
    v = vs[0]
    start = (datetime.utcnow() + timedelta(days=10)).isoformat()
    end = (datetime.utcnow() + timedelta(days=12)).isoformat()
    r = renter_s.post(f"{API}/bookings", json={
        "vehicle_id": v["id"], "start_date": start, "end_date": end, "pickup_type": "at_owner"
    })
    assert r.status_code == 200, r.text
    b = r.json()
    return b


class TestContactReveal:
    def test_before_payment_no_contact(self, renter_s, paid_booking):
        bid = paid_booking["id"]
        r = renter_s.get(f"{API}/bookings/{bid}")
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "pending_payment"
        assert not d.get("owner_contact"), "owner_contact leaked before payment"
        assert not d.get("pickup_address"), "pickup_address leaked before payment"

    def test_after_payment_reveals_contact(self, renter_s, paid_booking):
        bid = paid_booking["id"]
        # pay
        r = renter_s.post(f"{API}/bookings/{bid}/pay")
        assert r.status_code == 200, r.text
        # fetch booking
        b = renter_s.get(f"{API}/bookings/{bid}").json()
        assert b["status"] == "confirmed"
        oc = b.get("owner_contact")
        assert oc, "owner_contact missing after payment"
        assert oc.get("name")
        assert oc.get("phone")
        assert oc.get("whatsapp")
        assert oc.get("instagram")
        rc = b.get("renter_contact")
        assert rc and rc.get("whatsapp")
        pa = b.get("pickup_address")
        assert pa, "pickup_address missing"
        # for the seeded first vehicle (Corolla): Trindade, Florianópolis/SC
        assert "Florianópolis" in pa or "Florian" in pa or "/" in pa


# ---------- 7. Privacy preserved on public endpoints ----------
class TestPublicPrivacy:
    def test_public_vehicles_no_owner_contact(self):
        vs = requests.get(f"{API}/vehicles").json()
        for v in vs[:3]:
            assert "owner_contact" not in v
            assert "plate" not in v
            assert "plate_masked" in v

    def test_public_vehicle_detail_no_contact(self):
        vs = requests.get(f"{API}/vehicles").json()
        r = requests.get(f"{API}/vehicles/{vs[0]['id']}")
        d = r.json()
        assert "owner_contact" not in d
        assert "plate" not in d


# ---------- 8. Seed migration socials on existing users ----------
class TestSeedMigration:
    def test_seeded_users_have_socials(self, admin_s):
        users = admin_s.get(f"{API}/admin/users").json()
        for email in (RENTER[0], OWNER[0]):
            u = next((x for x in users if x["email"] == email), None)
            assert u, f"{email} not found"
            assert u.get("whatsapp"), f"{email} missing whatsapp"
            assert u.get("instagram"), f"{email} missing instagram"
            assert u.get("facebook"), f"{email} missing facebook"
