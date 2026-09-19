"""Iteration 4 tests: DriveHub rebrand, vehicle edit/pause/delete, notifications, admin suspend + analytics."""
import os
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://aluguel-veiculos-br.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@drivehub.com.br"
ADMIN_PW = "DriveHub@2026"
RENTER_EMAIL = "locatario@teste.com"
OWNER_EMAIL = "proprietario@teste.com"
USER_PW = "Teste@2026"

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'drivehub')


@pytest.fixture(scope="module")
def db():
    c = MongoClient(MONGO_URL)
    return c[DB_NAME]


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    return r.json()["token"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN_EMAIL, ADMIN_PW)


@pytest.fixture(scope="module")
def owner_token():
    return _login(OWNER_EMAIL, USER_PW)


@pytest.fixture(scope="module")
def renter_token():
    return _login(RENTER_EMAIL, USER_PW)


# ----------------- AUTH / REBRAND -----------------
class TestAuthRebrand:
    def test_new_admin_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"

    def test_owner_and_renter_login(self):
        for e in [OWNER_EMAIL, RENTER_EMAIL]:
            r = requests.post(f"{API}/auth/login", json={"email": e, "password": USER_PW})
            assert r.status_code == 200

    def test_old_admin_should_not_login(self):
        # Per review: "verify previous admin@locafacil.com.br returns 401"
        r = requests.post(f"{API}/auth/login",
                          json={"email": "admin@locafacil.com.br", "password": "Locafacil@2026"})
        # If the old user was never migrated/deleted, this may still return 200. Report as issue.
        assert r.status_code == 401, f"Old admin still logs in (status={r.status_code}). Old admin was not removed after rebrand."


# ----------------- VEHICLES: PATCH / TOGGLE / DELETE -----------------
class TestVehicleOwnerActions:
    def _create_vehicle(self, tok):
        payload = {
            "brand": "TEST", "model": "PatchCar", "year": 2023, "plate": "TST0X99",
            "category": "sedan", "transmission": "automatic", "fuel": "flex",
            "seats": 5, "doors": 4, "luggage": 2, "color": "prata", "km": 10000,
            "daily_price": 199, "city": "Florianópolis", "state": "SC",
            "neighborhood": "Centro", "lat": -27.6, "lng": -48.5,
            "photos": [], "features": [],
        }
        r = requests.post(f"{API}/vehicles", json=payload, headers=_h(tok))
        assert r.status_code == 200, r.text
        return r.json()["id"]

    def test_patch_updates_price(self, owner_token):
        vid = self._create_vehicle(owner_token)
        r = requests.patch(f"{API}/vehicles/{vid}", json={"daily_price": 299},
                           headers=_h(owner_token))
        assert r.status_code == 200
        assert r.json()["daily_price"] == 299
        # Persistence
        g = requests.get(f"{API}/vehicles/{vid}")
        assert g.json()["daily_price"] == 299
        # cleanup
        requests.delete(f"{API}/vehicles/{vid}", headers=_h(owner_token))

    def test_patch_forbidden_for_non_owner(self, owner_token, renter_token):
        vid = self._create_vehicle(owner_token)
        r = requests.patch(f"{API}/vehicles/{vid}", json={"daily_price": 99},
                           headers=_h(renter_token))
        assert r.status_code == 403
        requests.delete(f"{API}/vehicles/{vid}", headers=_h(owner_token))

    def test_toggle_status_and_public_hidden(self, owner_token):
        vid = self._create_vehicle(owner_token)
        r = requests.post(f"{API}/vehicles/{vid}/toggle-status", headers=_h(owner_token))
        assert r.status_code == 200
        assert r.json()["status"] == "paused"
        # Not in public list
        pub = requests.get(f"{API}/vehicles").json()
        assert not any(v["id"] == vid for v in pub)
        # Toggle back
        r2 = requests.post(f"{API}/vehicles/{vid}/toggle-status", headers=_h(owner_token))
        assert r2.json()["status"] == "active"
        # Cleanup
        requests.delete(f"{API}/vehicles/{vid}", headers=_h(owner_token))

    def test_soft_delete(self, owner_token):
        vid = self._create_vehicle(owner_token)
        r = requests.delete(f"{API}/vehicles/{vid}", headers=_h(owner_token))
        assert r.status_code == 200
        pub = requests.get(f"{API}/vehicles").json()
        assert not any(v["id"] == vid for v in pub)
        mine = requests.get(f"{API}/vehicles/mine/list", headers=_h(owner_token)).json()
        veh = next((v for v in mine if v["id"] == vid), None)
        assert veh is None or veh.get("status") == "deleted"


# ----------------- OWNER CANNOT BOOK -----------------
class TestOwnerCannotBook:
    def test_owner_booking_forbidden(self, owner_token):
        # Grab any vehicle
        pub = requests.get(f"{API}/vehicles").json()
        vid = pub[0]["id"]
        r = requests.post(f"{API}/bookings",
                          json={"vehicle_id": vid, "start_date": "2026-06-01T10:00:00Z",
                                "end_date": "2026-06-03T10:00:00Z"},
                          headers=_h(owner_token))
        # role=owner not in ("renter","admin") -> 403
        assert r.status_code == 403


# ----------------- NOTIFICATIONS -----------------
class TestNotifications:
    def test_notifications_require_auth(self):
        r = requests.get(f"{API}/notifications/mine")
        assert r.status_code == 401

    def test_notifications_mine_shape(self, renter_token):
        r = requests.get(f"{API}/notifications/mine", headers=_h(renter_token))
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and "unread" in data
        assert isinstance(data["items"], list)
        assert isinstance(data["unread"], int)

    def test_read_all(self, renter_token):
        r = requests.post(f"{API}/notifications/read-all", headers=_h(renter_token))
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_notification_on_booking_and_payment(self, renter_token, owner_token, db):
        # Get owner-owned active vehicle
        mine = requests.get(f"{API}/vehicles/mine/list", headers=_h(owner_token)).json()
        active_v = next((v for v in mine if v.get("status") == "active"), None)
        assert active_v is not None
        vid = active_v["id"]

        # Baseline owner unread
        base = requests.get(f"{API}/notifications/mine", headers=_h(owner_token)).json()["unread"]

        # Create booking as renter
        rb = requests.post(f"{API}/bookings",
                           json={"vehicle_id": vid, "start_date": "2026-08-01T10:00:00Z",
                                 "end_date": "2026-08-03T10:00:00Z"},
                           headers=_h(renter_token))
        assert rb.status_code == 200, rb.text
        bid = rb.json()["id"]

        # Owner has +1 unread of kind booking_requested
        own = requests.get(f"{API}/notifications/mine", headers=_h(owner_token)).json()
        assert own["unread"] >= base + 1
        kinds = [n["kind"] for n in own["items"][:5]]
        assert "booking_requested" in kinds
        req = next(n for n in own["items"] if n["kind"] == "booking_requested")
        assert "Nova reserva pendente" in req["title"]

        # Renter reads all
        requests.post(f"{API}/notifications/read-all", headers=_h(renter_token))
        # Pay
        pay = requests.post(f"{API}/bookings/{bid}/pay", headers=_h(renter_token))
        assert pay.status_code == 200, pay.text

        own2 = requests.get(f"{API}/notifications/mine", headers=_h(owner_token)).json()
        assert any(n["kind"] == "booking_paid" and "Pagamento recebido" in n["title"]
                   for n in own2["items"])

        rnt = requests.get(f"{API}/notifications/mine", headers=_h(renter_token)).json()
        assert any(n["kind"] == "booking_confirmed" and "Reserva confirmada" in n["title"]
                   for n in rnt["items"])

        # cleanup
        db.bookings.delete_one({"id": bid})


# ----------------- ADMIN SUSPEND / UNSUSPEND -----------------
class TestAdminSuspend:
    @pytest.fixture
    def temp_owner(self, db):
        email = "TEST_suspendowner@teste.com"
        # Register
        r = requests.post(f"{API}/auth/register",
                          json={"name": "TEST SusOwner", "email": email,
                                "password": "TestSusp@2026", "role": "owner"})
        assert r.status_code == 200, r.text
        tok = r.json()["token"]
        uid = r.json()["user"]["id"]
        # Create vehicle owned by them
        payload = {
            "brand": "TESTX", "model": "SusCar", "year": 2022, "plate": "SUS0X99",
            "category": "sedan", "transmission": "automatic", "fuel": "flex",
            "seats": 5, "doors": 4, "luggage": 2, "color": "prata", "km": 10000,
            "daily_price": 100, "city": "Florianópolis", "state": "SC",
            "neighborhood": "Centro", "lat": -27.6, "lng": -48.5,
            "photos": [], "features": [],
        }
        v = requests.post(f"{API}/vehicles", json=payload, headers=_h(tok)).json()
        yield {"uid": uid, "email": email, "token": tok, "vid": v["id"]}
        # cleanup
        db.vehicles.delete_many({"owner_id": uid})
        db.users.delete_one({"id": uid})
        db.notifications.delete_many({"user_id": uid})
        db.sessions.delete_many({"user_id": uid})

    def test_suspend_pauses_vehicles_and_blocks_login(self, admin_token, temp_owner, db):
        r = requests.post(f"{API}/admin/users/{temp_owner['uid']}/suspend",
                          headers=_h(admin_token))
        assert r.status_code == 200
        # Vehicle paused
        v = db.vehicles.find_one({"id": temp_owner["vid"]})
        assert v["status"] == "paused"
        # User suspended flag
        u = db.users.find_one({"id": temp_owner["uid"]})
        assert u.get("suspended") is True
        # Login blocked
        lr = requests.post(f"{API}/auth/login",
                           json={"email": temp_owner["email"], "password": "TestSusp@2026"})
        assert lr.status_code == 403
        assert "suspensa" in lr.json().get("detail", "").lower()

    def test_unsuspend_restores_login(self, admin_token, temp_owner, db):
        requests.post(f"{API}/admin/users/{temp_owner['uid']}/suspend", headers=_h(admin_token))
        r = requests.post(f"{API}/admin/users/{temp_owner['uid']}/unsuspend",
                          headers=_h(admin_token))
        assert r.status_code == 200
        lr = requests.post(f"{API}/auth/login",
                           json={"email": temp_owner["email"], "password": "TestSusp@2026"})
        assert lr.status_code == 200

    def test_cannot_suspend_admin(self, admin_token, db):
        admin = db.users.find_one({"email": ADMIN_EMAIL})
        r = requests.post(f"{API}/admin/users/{admin['id']}/suspend",
                          headers=_h(admin_token))
        assert r.status_code == 400
        assert "admin" in r.json()["detail"].lower()


# ----------------- ADMIN ANALYTICS -----------------
class TestAdminAnalytics:
    def test_analytics_shape(self, admin_token):
        r = requests.get(f"{API}/admin/analytics", headers=_h(admin_token))
        assert r.status_code == 200
        d = r.json()
        for k in ("top_vehicles", "top_owners", "underperforming_owners",
                  "categories", "bookings_by_status"):
            assert k in d
        # categories sorted desc
        cats = d["categories"]
        if len(cats) > 1:
            counts = [c["count"] for c in cats]
            assert counts == sorted(counts, reverse=True)
        # top_owners sorted by gmv desc
        tos = d["top_owners"]
        if len(tos) > 1:
            gmvs = [t["gmv"] for t in tos]
            assert gmvs == sorted(gmvs, reverse=True)

    def test_analytics_requires_admin(self, renter_token):
        r = requests.get(f"{API}/admin/analytics", headers=_h(renter_token))
        assert r.status_code == 403


# ----------------- GOOGLE AUTH CONTRACT -----------------
class TestGoogleAuthContract:
    def test_missing_header(self):
        r = requests.post(f"{API}/auth/google/session")
        assert r.status_code == 400

    def test_invalid_session(self):
        r = requests.post(f"{API}/auth/google/session",
                          headers={"X-Session-ID": "invalid_fake_xyz_zzz"})
        assert r.status_code == 401
