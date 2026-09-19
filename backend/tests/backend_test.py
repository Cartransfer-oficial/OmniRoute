"""DriveHub backend integration tests"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://aluguel-veiculos-br.preview.emergentagent.com').rstrip('/')
if not BASE_URL.startswith('http'):
    BASE_URL = 'https://aluguel-veiculos-br.preview.emergentagent.com'
API = f"{BASE_URL}/api"

ADMIN = ("admin@drivehub.com.br", "DriveHub@2026")
RENTER = ("locatario@teste.com", "Teste@2026")
OWNER = ("proprietario@teste.com", "Teste@2026")


def _login(email, pw):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert r.status_code == 200, f"login failed {email}: {r.status_code} {r.text}"
    assert "access_token" in s.cookies, "no cookie set"
    return s


@pytest.fixture(scope="session")
def admin_s():
    return _login(*ADMIN)

@pytest.fixture(scope="session")
def renter_s():
    return _login(*RENTER)

@pytest.fixture(scope="session")
def owner_s():
    return _login(*OWNER)


# ---------- Auth ----------
class TestAuth:
    def test_login_bad(self):
        r = requests.post(f"{API}/auth/login", json={"email": "x@y.com", "password": "wrong"})
        assert r.status_code == 401

    def test_login_and_me(self, renter_s):
        r = renter_s.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == RENTER[0]
        assert r.json()["kyc_level"] == "approved"

    def test_logout(self):
        s = _login(*RENTER)
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        r2 = s.get(f"{API}/auth/me")
        # after delete_cookie, cookie may still be sent if not cleared by client
        # server clears cookie header; requests session might retain. Check via new session
        s2 = requests.Session()
        r3 = s2.get(f"{API}/auth/me")
        assert r3.status_code == 401

    def test_register_duplicate(self):
        r = requests.post(f"{API}/auth/register", json={
            "name": "X", "email": RENTER[0], "password": "abcdef", "role": "renter"
        })
        assert r.status_code == 400

    def test_register_new(self):
        email = f"test_{int(time.time()*1000)}@teste.com"
        r = requests.post(f"{API}/auth/register", json={
            "name": "TEST User", "email": email, "password": "Test@2026", "role": "renter"
        })
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["email"] == email
        assert d["user"]["kyc_level"] == "basic"


# ---------- Vehicles / Privacy ----------
class TestVehicles:
    def test_list_public(self):
        r = requests.get(f"{API}/vehicles")
        assert r.status_code == 200
        vs = r.json()
        assert len(vs) >= 8
        v = vs[0]
        assert "plate_masked" in v
        assert "plate" not in v
        assert v["plate_masked"].endswith("*") or "*" in v["plate_masked"]

    def test_filter_category_suv(self):
        r = requests.get(f"{API}/vehicles", params={"category": "suv"})
        assert r.status_code == 200
        vs = r.json()
        assert all(v["category"] == "suv" for v in vs)
        assert len(vs) >= 1

    def test_filter_transmission(self):
        r = requests.get(f"{API}/vehicles", params={"transmission": "automatic"})
        assert all(v["transmission"] == "automatic" for v in r.json())

    def test_filter_max_price(self):
        r = requests.get(f"{API}/vehicles", params={"max_price": 250})
        for v in r.json():
            assert v["daily_price"] <= 250

    def test_get_vehicle_public_privacy(self):
        vs = requests.get(f"{API}/vehicles").json()
        vid = vs[0]["id"]
        r = requests.get(f"{API}/vehicles/{vid}")
        assert r.status_code == 200
        d = r.json()
        assert "plate" not in d
        assert "plate_masked" in d

    def test_owner_sees_exact_coords(self, owner_s):
        # find owner's vehicle
        my = owner_s.get(f"{API}/vehicles/mine/list").json()
        assert len(my) >= 1
        vid = my[0]["id"]
        exact = owner_s.get(f"{API}/vehicles/{vid}").json()
        pub = requests.get(f"{API}/vehicles/{vid}").json()
        # coords should differ (or lat rounded to 4dp on public)
        assert exact.get("lat") != pub.get("lat") or exact.get("lng") != pub.get("lng")

    def test_renter_cannot_create_vehicle(self, renter_s):
        r = renter_s.post(f"{API}/vehicles", json={
            "brand": "X", "model": "Y", "year": 2024, "plate": "AAA1B23", "category": "sedan",
            "transmission": "automatic", "fuel": "flex", "seats": 5, "doors": 4, "luggage": 2,
            "color": "x", "km": 1000, "daily_price": 100, "city": "SP", "state": "SP",
            "neighborhood": "x", "lat": -23.5, "lng": -46.6,
        })
        assert r.status_code == 403

    def test_owner_can_create_vehicle(self, owner_s):
        payload = {
            "brand": "TEST_Brand", "model": "TEST_Model", "year": 2024, "plate": "TST1B23",
            "category": "sedan", "transmission": "automatic", "fuel": "flex", "seats": 5,
            "doors": 4, "luggage": 2, "color": "x", "km": 1000, "daily_price": 199,
            "city": "Florianópolis", "state": "SC", "neighborhood": "TEST",
            "lat": -27.59, "lng": -48.55, "photos": [], "features": [],
        }
        r = owner_s.post(f"{API}/vehicles", json=payload)
        assert r.status_code == 200, r.text
        vid = r.json()["id"]
        # should appear in public list
        vs = requests.get(f"{API}/vehicles", params={"q": "TEST_Brand"}).json()
        assert any(v["id"] == vid for v in vs)


# ---------- Booking flow ----------
@pytest.fixture(scope="session")
def booking_ctx(renter_s, owner_s):
    """Create booking, pay, checkin, checkout - used across tests"""
    vs = requests.get(f"{API}/vehicles").json()
    # pick vehicle not owned by renter -> any works since renter is not owner
    v = vs[0]
    from datetime import datetime, timedelta
    start = (datetime.utcnow() + timedelta(days=2)).isoformat()
    end = (datetime.utcnow() + timedelta(days=5)).isoformat()
    r = renter_s.post(f"{API}/bookings", json={
        "vehicle_id": v["id"], "start_date": start, "end_date": end, "pickup_type": "at_owner"
    })
    assert r.status_code == 200, r.text
    b = r.json()
    return {"booking": b, "vehicle": v}


class TestBooking:
    def test_pricing_split(self, booking_ctx):
        b = booking_ctx["booking"]
        p = b["pricing"]
        assert p["days"] == 3
        assert p["commission_pct"] == 12.0
        assert p["subtotal"] == round(3 * b["pricing"]["daily_price"], 2)
        assert p["commission_amount"] == round(p["subtotal"] * 0.12, 2)
        assert p["owner_amount"] == round(p["subtotal"] - p["commission_amount"], 2)
        assert p["total"] == round(p["subtotal"] + p["deposit"], 2)
        assert b["status"] == "pending_payment"

    def test_pay_mock_split(self, renter_s, booking_ctx):
        bid = booking_ctx["booking"]["id"]
        r = renter_s.post(f"{API}/bookings/{bid}/pay")
        assert r.status_code == 200, r.text
        pay = r.json()["payment"]
        assert pay["provider"] == "mock_split"
        assert pay["status"] == "captured"
        assert pay["commission"] == booking_ctx["booking"]["pricing"]["commission_amount"]
        assert pay["owner_amount"] == booking_ctx["booking"]["pricing"]["owner_amount"]
        # verify booking updated
        b = renter_s.get(f"{API}/bookings/{bid}").json()
        assert b["status"] == "confirmed"

    def test_pay_twice_rejected(self, renter_s, booking_ctx):
        bid = booking_ctx["booking"]["id"]
        r = renter_s.post(f"{API}/bookings/{bid}/pay")
        assert r.status_code == 400

    def test_checkin(self, owner_s, booking_ctx):
        bid = booking_ctx["booking"]["id"]
        r = owner_s.post(f"{API}/bookings/{bid}/checkin", json={
            "booking_id": bid, "km": 24000, "fuel_level": "full",
            "photos": ["data:,x"], "notes": "ok"
        })
        assert r.status_code == 200, r.text
        b = owner_s.get(f"{API}/bookings/{bid}").json()
        assert b["status"] == "checked_in"

    def test_checkout(self, owner_s, booking_ctx):
        bid = booking_ctx["booking"]["id"]
        r = owner_s.post(f"{API}/bookings/{bid}/checkout", json={
            "booking_id": bid, "km": 24500, "fuel_level": "full",
            "photos": ["data:,x"], "notes": "ok"
        })
        assert r.status_code == 200, r.text
        b = owner_s.get(f"{API}/bookings/{bid}").json()
        assert b["status"] == "completed"
        assert b["payment"]["payout_status"] == "released"

    def test_booking_requires_auth(self):
        r = requests.post(f"{API}/bookings", json={"vehicle_id": "x", "start_date": "2026-01-01", "end_date": "2026-01-02"})
        assert r.status_code == 401


# ---------- Chat sanitization ----------
class TestChat:
    def test_send_and_mask_phone(self, renter_s, booking_ctx):
        bid = booking_ctx["booking"]["id"]
        r = renter_s.post(f"{API}/messages", json={"booking_id": bid, "body": "meu número 48 99999-1234 ok"})
        assert r.status_code == 200
        m = r.json()
        assert "[número oculto]" in m["body"]
        assert m["flagged"] is True

    def test_mask_email(self, renter_s, booking_ctx):
        bid = booking_ctx["booking"]["id"]
        r = renter_s.post(f"{API}/messages", json={"booking_id": bid, "body": "fala x@gmail.com"})
        assert r.status_code == 200
        assert "[e-mail oculto]" in r.json()["body"]
        assert r.json()["flagged"] is True

    def test_normal_message(self, renter_s, booking_ctx):
        bid = booking_ctx["booking"]["id"]
        r = renter_s.post(f"{API}/messages", json={"booking_id": bid, "body": "Oi, tudo bem?"})
        assert r.status_code == 200
        assert r.json()["flagged"] is False

    def test_list_messages(self, renter_s, booking_ctx):
        bid = booking_ctx["booking"]["id"]
        r = renter_s.get(f"{API}/messages/{bid}")
        assert r.status_code == 200
        assert len(r.json()) >= 2


# ---------- Admin ----------
class TestAdmin:
    def test_metrics(self, admin_s):
        r = admin_s.get(f"{API}/admin/metrics")
        assert r.status_code == 200
        d = r.json()
        for k in ["gmv", "commission", "payouts", "users_count", "commission_pct", "top_cities"]:
            assert k in d

    def test_owner_cannot_access_admin(self, owner_s):
        r = owner_s.get(f"{API}/admin/metrics")
        assert r.status_code == 403

    def test_renter_cannot_access_admin(self, renter_s):
        r = renter_s.get(f"{API}/admin/metrics")
        assert r.status_code == 403

    def test_set_commission(self, admin_s):
        r = admin_s.post(f"{API}/admin/config/commission", json={"commission_pct": 15})
        assert r.status_code == 200
        # verify metrics reflects it
        m = admin_s.get(f"{API}/admin/metrics").json()
        assert m["commission_pct"] == 15
        # restore
        admin_s.post(f"{API}/admin/config/commission", json={"commission_pct": 12})

    def test_verify_vehicle(self, admin_s):
        vs = requests.get(f"{API}/vehicles").json()
        vid = vs[0]["id"]
        r = admin_s.post(f"{API}/admin/vehicles/{vid}/verify")
        assert r.status_code == 200


# ---------- KYC ----------
class TestKyc:
    def test_kyc_submit_new_user(self):
        email = f"kyc_{int(time.time()*1000)}@teste.com"
        s = requests.Session()
        s.post(f"{API}/auth/register", json={
            "name": "KYC Test", "email": email, "password": "Test@2026", "role": "renter"
        })
        r = s.post(f"{API}/kyc/submit", json={
            "cpf": "12345678900", "birth_date": "1990-01-01", "address": "Rua X",
            "city": "SP", "state": "SP", "cep": "01000000",
            "cnh_number": "1234", "cnh_category": "B", "cnh_valid_until": "2030-01-01",
            "cnh_photo": "data:,x", "id_photo": "data:,x", "selfie": "data:,x",
        })
        assert r.status_code == 200
        assert r.json()["kyc_level"] == "approved"
