from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query, Header
from fastapi.responses import Response as FastAPIResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ------------- Setup -------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

app = FastAPI(title="LOCAFACIL API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("locafacil")


# ------------- Helpers -------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access(user_id: str, email: str, role: str) -> str:
    return jwt.encode(
        {"sub": user_id, "email": email, "role": role,
         "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"},
        JWT_SECRET, algorithm=JWT_ALGORITHM,
    )


def set_auth_cookie(resp: Response, token: str):
    resp.set_cookie(
        key="access_token", value=token, httponly=True,
        secure=True, samesite="none", max_age=604800, path="/",
    )


def set_session_cookie(resp: Response, token: str):
    """Emergent Google Auth session cookie."""
    resp.set_cookie(
        key="session_token", value=token, httponly=True,
        secure=True, samesite="none", max_age=604800, path="/",
    )


ADMIN_GOOGLE_EMAILS = {"tailansantos06@gmail.com"}


def sanitize_user(u: dict) -> dict:
    return {k: v for k, v in u.items() if k not in ("password_hash", "_id")}


async def get_current_user(request: Request) -> dict:
    # 1) Emergent Google session (session_token cookie)
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            # Prefer session lookup for bearer if it matches a stored session
            candidate = auth[7:]
            found = await db.sessions.find_one({"session_token": candidate})
            if found:
                session_token = candidate
    if session_token:
        session = await db.sessions.find_one({"session_token": session_token})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at and expires_at >= datetime.now(timezone.utc):
                user = await db.users.find_one({"id": session["user_id"]})
                if user:
                    return sanitize_user(user)

    # 2) Legacy JWT (access_token cookie or Authorization: Bearer <jwt>)
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        return sanitize_user(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


def require_role(*roles: str):
    async def dep(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Acesso negado")
        return user
    return dep


# ------------- Models -------------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: Literal["renter", "owner"] = "renter"
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None


class ProfileUpdateIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class KycIn(BaseModel):
    cpf: str
    birth_date: str
    address: str
    city: str
    state: str
    cep: str
    cnh_number: str
    cnh_category: str
    cnh_valid_until: str
    cnh_photo: str  # base64 data URL
    id_photo: str
    selfie: str


class VehicleIn(BaseModel):
    brand: str
    model: str
    version: Optional[str] = ""
    year: int
    plate: str  # will be masked on public output
    category: str  # economico, suv, sedan, premium, minivan, hatch, pickup, ev, hybrid
    transmission: Literal["automatic", "manual"]
    fuel: str  # gasoline, ethanol, flex, diesel, electric, hybrid
    seats: int
    doors: int
    luggage: int
    color: str
    km: int
    daily_price: float
    weekly_price: Optional[float] = None
    monthly_price: Optional[float] = None
    included_km_per_day: int = 200
    extra_km_price: float = 1.5
    deposit: float = 0
    city: str
    state: str
    neighborhood: str
    lat: float
    lng: float
    photos: List[str] = []
    features: List[str] = []  # e.g. ["carplay","gps","child_seat","isofix","4x4","sunroof"]
    rules: List[str] = []
    fuel_policy: str = "same_level"
    cleaning_policy: str = "reasonable"
    cancel_policy: str = "flex_48h"
    allow_pets: bool = False
    allow_interstate: bool = True
    delivery_available: bool = False
    delivery_fee: float = 0
    airport_pickup: bool = False


class BookingIn(BaseModel):
    vehicle_id: str
    start_date: str
    end_date: str
    pickup_type: Literal["at_owner", "delivery", "airport"] = "at_owner"


class MessageIn(BaseModel):
    booking_id: str
    body: str


class ReviewIn(BaseModel):
    booking_id: str
    rating: int = Field(ge=1, le=5)
    communication: int = Field(ge=1, le=5)
    punctuality: int = Field(ge=1, le=5)
    condition: int = Field(ge=1, le=5)
    comment: str = ""


class IncidentIn(BaseModel):
    booking_id: str
    category: str
    description: str
    photos: List[str] = []


class CheckIn(BaseModel):
    booking_id: str
    km: int
    fuel_level: str
    photos: List[str]
    notes: str = ""


class AdminConfigIn(BaseModel):
    commission_pct: float = Field(ge=0, le=50)


# ------------- Config / Commission -------------
async def get_commission_pct() -> float:
    cfg = await db.config.find_one({"key": "commission_pct"})
    return float(cfg["value"]) if cfg else 12.0


# ------------- Auth Routes -------------
@api.post("/auth/register")
async def register(data: RegisterIn, response: Response):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    user = {
        "id": new_id(),
        "email": email,
        "name": data.name,
        "phone": data.phone or "",
        "whatsapp": data.whatsapp or data.phone or "",
        "instagram": data.instagram or "",
        "facebook": data.facebook or "",
        "bio": "",
        "role": data.role,
        "password_hash": hash_pw(data.password),
        "kyc_level": "basic",  # basic, identity, cnh, payment, approved
        "kyc_data": None,
        "avatar": "",
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_access(user["id"], email, data.role)
    set_auth_cookie(response, token)
    return {"user": sanitize_user(user), "token": token}


@api.post("/auth/login")
async def login(data: LoginIn, response: Response):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    token = create_access(user["id"], email, user["role"])
    set_auth_cookie(response, token)
    return {"user": sanitize_user(user), "token": token}


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    # remove any Emergent session from DB
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.sessions.delete_one({"session_token": session_token})
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


@api.post("/auth/google/session")
async def google_session_exchange(
    response: Response,
    x_session_id: Optional[str] = Header(default=None, alias="X-Session-ID"),
):
    """Exchange the Emergent one-time session_id (URL fragment) for a persistent session cookie.

    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH.
    """
    if not x_session_id:
        raise HTTPException(status_code=400, detail="X-Session-ID header ausente")

    async with httpx.AsyncClient(timeout=15) as client_http:
        r = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": x_session_id},
        )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="session_id inválido ou expirado")
        data = r.json()

    email = (data.get("email") or "").lower()
    name = data.get("name") or ""
    picture = data.get("picture") or ""
    session_token = data.get("session_token")
    if not email or not session_token:
        raise HTTPException(status_code=502, detail="Resposta inválida do provedor de autenticação")

    # Find or create user
    user = await db.users.find_one({"email": email})
    if not user:
        role = "admin" if email in ADMIN_GOOGLE_EMAILS else "renter"
        user = {
            "id": new_id(),
            "email": email,
            "name": name or email.split("@")[0],
            "phone": "", "whatsapp": "", "instagram": "", "facebook": "", "bio": "",
            "role": role,
            "password_hash": "",  # Google-only account
            "auth_provider": "google",
            "avatar": picture,
            "kyc_level": "approved" if role == "admin" else "basic",
            "kyc_data": None,
            "created_at": now_iso(),
        }
        await db.users.insert_one(user)
    else:
        # Update avatar and elevate to admin if this is the platform owner
        updates = {"avatar": picture} if picture and not user.get("avatar") else {}
        if email in ADMIN_GOOGLE_EMAILS and user.get("role") != "admin":
            updates["role"] = "admin"
            updates["kyc_level"] = "approved"
        if updates:
            await db.users.update_one({"id": user["id"]}, {"$set": updates})
            user = await db.users.find_one({"id": user["id"]})

    # Store session (7 days)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.sessions.update_one(
        {"session_token": session_token},
        {"$set": {"session_token": session_token, "user_id": user["id"], "expires_at": expires_at}},
        upsert=True,
    )
    set_session_cookie(response, session_token)
    return {"user": sanitize_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.patch("/auth/profile")
async def update_profile(data: ProfileUpdateIn, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    fresh = await db.users.find_one({"id": user["id"]})
    return sanitize_user(fresh)


# ------------- KYC -------------
@api.post("/kyc/submit")
async def kyc_submit(data: KycIn, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "kyc_data": data.model_dump(),
            "kyc_level": "approved",  # auto-approve for MVP; production: manual review
            "kyc_reviewed_at": now_iso(),
        }},
    )
    return {"ok": True, "kyc_level": "approved"}


# ------------- Vehicles -------------
def mask_plate(p: str) -> str:
    p = (p or "").upper().replace("-", "")
    if len(p) < 4:
        return "***"
    return p[:3] + "*" * (len(p) - 3)


def public_vehicle(v: dict, include_exact_location: bool = False) -> dict:
    out = {k: v.get(k) for k in v if k not in ("_id", "plate", "lat", "lng")}
    out["plate_masked"] = mask_plate(v.get("plate", ""))
    # public: coarsen coordinates ~1km radius
    if include_exact_location:
        out["lat"] = v.get("lat")
        out["lng"] = v.get("lng")
    else:
        # add small deterministic offset so pin isn't exact address
        import hashlib
        h = int(hashlib.md5(v.get("id", "").encode()).hexdigest(), 16)
        lat = v.get("lat", 0) + ((h % 200) - 100) / 20000.0
        lng = v.get("lng", 0) + (((h >> 8) % 200) - 100) / 20000.0
        out["lat"] = round(lat, 4)
        out["lng"] = round(lng, 4)
    return out


@api.post("/vehicles")
async def create_vehicle(data: VehicleIn, user: dict = Depends(require_role("owner", "admin"))):
    v = data.model_dump()
    v["id"] = new_id()
    v["owner_id"] = user["id"]
    v["owner_name"] = user["name"]
    v["status"] = "active"
    v["verified"] = False
    v["rating_avg"] = 0
    v["rating_count"] = 0
    v["created_at"] = now_iso()
    await db.vehicles.insert_one(v)
    return public_vehicle(v, include_exact_location=True)


@api.get("/vehicles")
async def list_vehicles(
    q: Optional[str] = None,
    city: Optional[str] = None,
    category: Optional[str] = None,
    transmission: Optional[str] = None,
    min_seats: Optional[int] = None,
    max_price: Optional[float] = None,
    min_price: Optional[float] = None,
    features: Optional[str] = None,  # comma-separated
    pets: Optional[bool] = None,
    airport: Optional[bool] = None,
    delivery: Optional[bool] = None,
):
    query = {"status": "active"}
    if city:
        query["city"] = {"$regex": f"^{city}$", "$options": "i"}
    if category:
        query["category"] = category
    if transmission:
        query["transmission"] = transmission
    if min_seats:
        query["seats"] = {"$gte": min_seats}
    if min_price or max_price:
        pr = {}
        if min_price:
            pr["$gte"] = min_price
        if max_price:
            pr["$lte"] = max_price
        query["daily_price"] = pr
    if features:
        feats = [f.strip() for f in features.split(",") if f.strip()]
        if feats:
            query["features"] = {"$all": feats}
    if pets is True:
        query["allow_pets"] = True
    if airport is True:
        query["airport_pickup"] = True
    if delivery is True:
        query["delivery_available"] = True
    if q:
        query["$or"] = [
            {"brand": {"$regex": q, "$options": "i"}},
            {"model": {"$regex": q, "$options": "i"}},
            {"city": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.vehicles.find(query).limit(200).to_list(200)
    return [public_vehicle(d) for d in docs]


@api.get("/vehicles/{vid}")
async def get_vehicle(vid: str, request: Request):
    v = await db.vehicles.find_one({"id": vid})
    if not v:
        raise HTTPException(404, "Veículo não encontrado")
    # if requester is the owner or admin, include full location
    include_exact = False
    token = request.cookies.get("access_token")
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get("sub") == v.get("owner_id") or payload.get("role") == "admin":
                include_exact = True
        except Exception:
            pass
    return public_vehicle(v, include_exact_location=include_exact)


@api.get("/vehicles/mine/list")
async def my_vehicles(user: dict = Depends(require_role("owner", "admin"))):
    docs = await db.vehicles.find({"owner_id": user["id"]}).to_list(200)
    return [public_vehicle(d, include_exact_location=True) for d in docs]


# ------------- Bookings -------------
def parse_date(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


async def compute_pricing(vehicle: dict, start: str, end: str) -> dict:
    d1 = parse_date(start)
    d2 = parse_date(end)
    days = max(1, (d2 - d1).days)
    subtotal = round(days * vehicle["daily_price"], 2)
    commission_pct = await get_commission_pct()
    commission = round(subtotal * commission_pct / 100, 2)
    owner_amount = round(subtotal - commission, 2)
    deposit = float(vehicle.get("deposit", 0))
    total = round(subtotal + deposit, 2)
    return {
        "days": days,
        "daily_price": vehicle["daily_price"],
        "subtotal": subtotal,
        "commission_pct": commission_pct,
        "commission_amount": commission,
        "owner_amount": owner_amount,
        "deposit": deposit,
        "total": total,
    }


@api.post("/bookings")
async def create_booking(data: BookingIn, user: dict = Depends(require_role("renter", "admin"))):
    if user.get("kyc_level") != "approved":
        raise HTTPException(400, "Complete a verificação de identidade e CNH antes de reservar")
    v = await db.vehicles.find_one({"id": data.vehicle_id})
    if not v:
        raise HTTPException(404, "Veículo não encontrado")
    if v["owner_id"] == user["id"]:
        raise HTTPException(400, "Você não pode reservar seu próprio veículo")
    pricing = await compute_pricing(v, data.start_date, data.end_date)
    b = {
        "id": new_id(),
        "vehicle_id": v["id"],
        "vehicle_snapshot": {"brand": v["brand"], "model": v["model"], "year": v["year"],
                              "photo": (v.get("photos") or [""])[0], "city": v["city"]},
        "owner_id": v["owner_id"],
        "owner_name": v.get("owner_name", ""),
        "renter_id": user["id"],
        "renter_name": user["name"],
        "start_date": data.start_date,
        "end_date": data.end_date,
        "pickup_type": data.pickup_type,
        "pricing": pricing,
        "status": "pending_payment",  # pending_payment, confirmed, checked_in, checked_out, completed, cancelled
        "payment": None,
        "checkin": None,
        "checkout": None,
        "contract_accepted_at": now_iso(),
        "created_at": now_iso(),
    }
    await db.bookings.insert_one(b)
    b.pop("_id", None)
    return b


@api.get("/bookings/mine")
async def my_bookings(user: dict = Depends(get_current_user)):
    if user["role"] == "owner":
        q = {"owner_id": user["id"]}
    elif user["role"] == "admin":
        q = {}
    else:
        q = {"renter_id": user["id"]}
    docs = await db.bookings.find(q).sort("created_at", -1).to_list(200)
    for d in docs:
        d.pop("_id", None)
    return docs


@api.get("/bookings/{bid}")
async def get_booking(bid: str, user: dict = Depends(get_current_user)):
    b = await db.bookings.find_one({"id": bid})
    if not b:
        raise HTTPException(404, "Reserva não encontrada")
    if user["role"] != "admin" and user["id"] not in (b["renter_id"], b["owner_id"]):
        raise HTTPException(403, "Acesso negado")
    b.pop("_id", None)
    # Reveal owner and renter contact ONLY after payment is captured
    paid = b.get("status") in ("confirmed", "checked_in", "completed")
    if paid or user["role"] == "admin":
        owner = await db.users.find_one({"id": b["owner_id"]}, {"password_hash": 0, "_id": 0})
        renter = await db.users.find_one({"id": b["renter_id"]}, {"password_hash": 0, "_id": 0})
        b["owner_contact"] = {
            "name": owner.get("name"),
            "phone": owner.get("phone", ""),
            "whatsapp": owner.get("whatsapp", ""),
            "instagram": owner.get("instagram", ""),
        } if owner else None
        b["renter_contact"] = {
            "name": renter.get("name"),
            "phone": renter.get("phone", ""),
            "whatsapp": renter.get("whatsapp", ""),
        } if renter else None
    # Include pickup address after payment
    if paid:
        v = await db.vehicles.find_one({"id": b["vehicle_id"]})
        if v:
            b["pickup_address"] = f"{v.get('neighborhood', '')}, {v.get('city')}/{v.get('state')}"
            b["pickup_coords"] = {"lat": v.get("lat"), "lng": v.get("lng")}
    return b


@api.post("/bookings/{bid}/pay")
async def pay_booking(bid: str, user: dict = Depends(get_current_user)):
    """Mock split payment - production: replace with Mercado Pago Split or Pagar.me Marketplace."""
    b = await db.bookings.find_one({"id": bid})
    if not b:
        raise HTTPException(404, "Reserva não encontrada")
    if b["renter_id"] != user["id"]:
        raise HTTPException(403, "Apenas o locatário pode pagar esta reserva")
    if b["status"] != "pending_payment":
        raise HTTPException(400, "Reserva já processada")
    payment = {
        "id": new_id(),
        "provider": "mock_split",
        "gross": b["pricing"]["total"],
        "commission": b["pricing"]["commission_amount"],
        "owner_amount": b["pricing"]["owner_amount"],
        "deposit_hold": b["pricing"]["deposit"],
        "status": "captured",
        "payout_status": "scheduled",  # after checkout it becomes released
        "paid_at": now_iso(),
    }
    await db.bookings.update_one(
        {"id": bid}, {"$set": {"payment": payment, "status": "confirmed"}}
    )
    await db.transactions.insert_one({
        "id": new_id(), "booking_id": bid, **payment, "renter_id": b["renter_id"],
        "owner_id": b["owner_id"], "created_at": now_iso(),
    })
    return {"ok": True, "payment": payment}


@api.post("/bookings/{bid}/checkin")
async def checkin(bid: str, data: CheckIn, user: dict = Depends(get_current_user)):
    b = await db.bookings.find_one({"id": bid})
    if not b:
        raise HTTPException(404, "Reserva não encontrada")
    if user["id"] not in (b["owner_id"], b["renter_id"]):
        raise HTTPException(403, "Acesso negado")
    if b["status"] != "confirmed":
        raise HTTPException(400, "Pagamento pendente ou reserva já iniciada")
    payload = data.model_dump()
    payload["at"] = now_iso()
    payload["by"] = user["id"]
    await db.bookings.update_one({"id": bid}, {"$set": {"checkin": payload, "status": "checked_in"}})
    return {"ok": True}


@api.post("/bookings/{bid}/checkout")
async def checkout(bid: str, data: CheckIn, user: dict = Depends(get_current_user)):
    b = await db.bookings.find_one({"id": bid})
    if not b:
        raise HTTPException(404)
    if user["id"] not in (b["owner_id"], b["renter_id"]):
        raise HTTPException(403, "Acesso negado")
    if b["status"] != "checked_in":
        raise HTTPException(400, "Reserva ainda não iniciada")
    payload = data.model_dump()
    payload["at"] = now_iso()
    payload["by"] = user["id"]
    # release owner payout
    upd = {"checkout": payload, "status": "completed"}
    if b.get("payment"):
        upd["payment.payout_status"] = "released"
    await db.bookings.update_one({"id": bid}, {"$set": upd})
    return {"ok": True}


@api.post("/bookings/{bid}/cancel")
async def cancel_booking(bid: str, user: dict = Depends(get_current_user)):
    b = await db.bookings.find_one({"id": bid})
    if not b:
        raise HTTPException(404)
    if user["id"] not in (b["owner_id"], b["renter_id"]) and user["role"] != "admin":
        raise HTTPException(403, "Acesso negado")
    if b["status"] in ("completed", "cancelled"):
        raise HTTPException(400, "Reserva não pode ser cancelada")
    await db.bookings.update_one({"id": bid}, {"$set": {"status": "cancelled", "cancelled_at": now_iso(), "cancelled_by": user["id"]}})
    return {"ok": True}


# ------------- Messages -------------
BLOCKED_PATTERNS = ["whatsapp", "zap", "wpp", "telegram", "insta", "@gmail", "@hotmail", "@yahoo"]

def sanitize_message(text: str) -> tuple[str, bool]:
    lower = text.lower()
    flagged = False
    import re
    # mask phone-like numbers and emails
    original = text
    text = re.sub(r"\b\d{2}\s?9?\d{4}[- ]?\d{4}\b", "[número oculto]", text)
    text = re.sub(r"[\w.+-]+@[\w-]+\.[\w.-]+", "[e-mail oculto]", text)
    if any(w in lower for w in BLOCKED_PATTERNS) or text != original:
        flagged = True
    return text, flagged


@api.post("/messages")
async def send_message(data: MessageIn, user: dict = Depends(get_current_user)):
    b = await db.bookings.find_one({"id": data.booking_id})
    if not b:
        raise HTTPException(404, "Reserva não encontrada")
    if user["id"] not in (b["owner_id"], b["renter_id"]):
        raise HTTPException(403)
    text, flagged = sanitize_message(data.body)
    msg = {
        "id": new_id(), "booking_id": data.booking_id, "from_id": user["id"],
        "from_name": user["name"], "body": text, "flagged": flagged, "created_at": now_iso(),
    }
    await db.messages.insert_one(msg)
    msg.pop("_id", None)
    return msg


@api.get("/messages/{booking_id}")
async def get_messages(booking_id: str, user: dict = Depends(get_current_user)):
    b = await db.bookings.find_one({"id": booking_id})
    if not b:
        raise HTTPException(404)
    if user["id"] not in (b["owner_id"], b["renter_id"]) and user["role"] != "admin":
        raise HTTPException(403)
    docs = await db.messages.find({"booking_id": booking_id}).sort("created_at", 1).to_list(500)
    for d in docs:
        d.pop("_id", None)
    return docs


# ------------- Reviews -------------
@api.post("/reviews")
async def create_review(data: ReviewIn, user: dict = Depends(get_current_user)):
    b = await db.bookings.find_one({"id": data.booking_id})
    if not b:
        raise HTTPException(404)
    if b["status"] != "completed":
        raise HTTPException(400, "Só é possível avaliar após a devolução")
    if user["id"] not in (b["owner_id"], b["renter_id"]):
        raise HTTPException(403)
    r = data.model_dump()
    r["id"] = new_id()
    r["from_id"] = user["id"]
    r["from_name"] = user["name"]
    r["vehicle_id"] = b["vehicle_id"]
    r["target_id"] = b["owner_id"] if user["id"] == b["renter_id"] else b["renter_id"]
    r["created_at"] = now_iso()
    await db.reviews.insert_one(r)
    # update vehicle rating
    if user["id"] == b["renter_id"]:
        agg = await db.reviews.aggregate([
            {"$match": {"vehicle_id": b["vehicle_id"]}},
            {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
        ]).to_list(1)
        if agg:
            await db.vehicles.update_one({"id": b["vehicle_id"]},
                                          {"$set": {"rating_avg": round(agg[0]["avg"], 2),
                                                    "rating_count": agg[0]["count"]}})
    r.pop("_id", None)
    return r


@api.get("/reviews/vehicle/{vid}")
async def vehicle_reviews(vid: str):
    docs = await db.reviews.find({"vehicle_id": vid}).sort("created_at", -1).to_list(100)
    for d in docs:
        d.pop("_id", None)
    return docs


# ------------- Incidents -------------
@api.post("/incidents")
async def create_incident(data: IncidentIn, user: dict = Depends(get_current_user)):
    b = await db.bookings.find_one({"id": data.booking_id})
    if not b:
        raise HTTPException(404)
    inc = data.model_dump()
    inc["id"] = new_id()
    inc["from_id"] = user["id"]
    inc["from_name"] = user["name"]
    inc["status"] = "open"
    inc["created_at"] = now_iso()
    await db.incidents.insert_one(inc)
    inc.pop("_id", None)
    return inc


@api.get("/incidents/mine")
async def my_incidents(user: dict = Depends(get_current_user)):
    docs = await db.incidents.find({"from_id": user["id"]}).sort("created_at", -1).to_list(200)
    for d in docs:
        d.pop("_id", None)
    return docs


# ------------- Admin -------------
@api.get("/admin/metrics")
async def admin_metrics(user: dict = Depends(require_role("admin"))):
    total_bookings = await db.bookings.count_documents({})
    completed = await db.bookings.count_documents({"status": "completed"})
    active_vehicles = await db.vehicles.count_documents({"status": "active"})
    users_count = await db.users.count_documents({})
    owners = await db.users.count_documents({"role": "owner"})
    incidents_open = await db.incidents.count_documents({"status": "open"})

    agg = await db.bookings.aggregate([
        {"$match": {"status": {"$in": ["confirmed", "checked_in", "completed"]}}},
        {"$group": {"_id": None,
                    "gmv": {"$sum": "$pricing.subtotal"},
                    "commission": {"$sum": "$pricing.commission_amount"},
                    "payouts": {"$sum": "$pricing.owner_amount"}}},
    ]).to_list(1)
    fin = agg[0] if agg else {"gmv": 0, "commission": 0, "payouts": 0}
    fin.pop("_id", None)
    commission_pct = await get_commission_pct()

    # top cities
    cities = await db.vehicles.aggregate([
        {"$group": {"_id": "$city", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}, {"$limit": 5},
    ]).to_list(5)

    return {
        "gmv": round(fin.get("gmv", 0), 2),
        "commission": round(fin.get("commission", 0), 2),
        "payouts": round(fin.get("payouts", 0), 2),
        "total_bookings": total_bookings,
        "completed_bookings": completed,
        "active_vehicles": active_vehicles,
        "users_count": users_count,
        "owners_count": owners,
        "incidents_open": incidents_open,
        "commission_pct": commission_pct,
        "top_cities": [{"city": c["_id"], "count": c["count"]} for c in cities if c["_id"]],
    }


@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_role("admin"))):
    docs = await db.users.find({}, {"password_hash": 0, "_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.get("/admin/users/{uid}")
async def admin_user_detail(uid: str, user: dict = Depends(require_role("admin"))):
    u = await db.users.find_one({"id": uid}, {"password_hash": 0, "_id": 0})
    if not u:
        raise HTTPException(404, "Usuário não encontrado")
    vehicles = await db.vehicles.find({"owner_id": uid}).to_list(200)
    vehicles = [public_vehicle(v, include_exact_location=True) for v in vehicles]
    bookings_as_renter = await db.bookings.find({"renter_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(200)
    bookings_as_owner = await db.bookings.find({"owner_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {
        "user": u,
        "vehicles": vehicles,
        "bookings_as_renter": bookings_as_renter,
        "bookings_as_owner": bookings_as_owner,
    }


@api.get("/admin/vehicles/{vid}")
async def admin_vehicle_detail(vid: str, user: dict = Depends(require_role("admin"))):
    v = await db.vehicles.find_one({"id": vid})
    if not v:
        raise HTTPException(404, "Veículo não encontrado")
    owner = await db.users.find_one({"id": v["owner_id"]}, {"password_hash": 0, "_id": 0})
    bookings = await db.bookings.find({"vehicle_id": vid}, {"_id": 0}).sort("created_at", -1).to_list(100)
    out = public_vehicle(v, include_exact_location=True)
    out["plate_full"] = v.get("plate")
    return {"vehicle": out, "owner": owner, "bookings": bookings}


@api.get("/admin/vehicles")
async def admin_all_vehicles(user: dict = Depends(require_role("admin"))):
    docs = await db.vehicles.find().to_list(500)
    return [public_vehicle(d, include_exact_location=True) for d in docs]


@api.post("/admin/config/commission")
async def set_commission(data: AdminConfigIn, user: dict = Depends(require_role("admin"))):
    await db.config.update_one(
        {"key": "commission_pct"},
        {"$set": {"value": data.commission_pct}},
        upsert=True,
    )
    return {"ok": True, "commission_pct": data.commission_pct}


@api.post("/admin/vehicles/{vid}/verify")
async def verify_vehicle(vid: str, user: dict = Depends(require_role("admin"))):
    await db.vehicles.update_one({"id": vid}, {"$set": {"verified": True}})
    return {"ok": True}


# ------------- Seed -------------
@api.get("/sitemap.xml")
async def sitemap(request: Request):
    """Dynamic sitemap listing all active vehicles for search engine indexing."""
    # Prefer forwarded proto/host (behind proxy/ingress); force https for crawlers
    host = request.headers.get("x-forwarded-host") or request.url.hostname
    base = f"https://{host}"
    vehicles = await db.vehicles.find({"status": "active"}, {"id": 1, "created_at": 1}).to_list(2000)
    urls = [
        {"loc": f"{base}/", "priority": "1.0", "changefreq": "daily"},
        {"loc": f"{base}/buscar", "priority": "0.9", "changefreq": "daily"},
        {"loc": f"{base}/como-funciona", "priority": "0.6", "changefreq": "monthly"},
        {"loc": f"{base}/login", "priority": "0.3", "changefreq": "yearly"},
        {"loc": f"{base}/cadastro", "priority": "0.5", "changefreq": "yearly"},
    ]
    for v in vehicles:
        urls.append({
            "loc": f"{base}/veiculo/{v['id']}",
            "priority": "0.8",
            "changefreq": "weekly",
            "lastmod": (v.get("created_at") or "")[:10],
        })
    xml_urls = "\n".join(
        f'  <url><loc>{u["loc"]}</loc>'
        + (f'<lastmod>{u["lastmod"]}</lastmod>' if u.get("lastmod") else "")
        + f'<changefreq>{u["changefreq"]}</changefreq><priority>{u["priority"]}</priority></url>'
        for u in urls
    )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f'{xml_urls}\n'
        '</urlset>'
    )
    return FastAPIResponse(content=xml, media_type="application/xml")


async def seed():
    # commission
    if not await db.config.find_one({"key": "commission_pct"}):
        await db.config.insert_one({"key": "commission_pct", "value": 12.0})

    # migrate existing test users to include social fields
    await db.users.update_one(
        {"email": "locatario@teste.com"},
        {"$set": {"whatsapp": "+5548999990001", "instagram": "@mariasilva",
                   "facebook": "maria.silva", "bio": "Viajo pelo Brasil com a família."}},
    )
    await db.users.update_one(
        {"email": "proprietario@teste.com"},
        {"$set": {"whatsapp": "+5548999990002", "instagram": "@joaoferreira",
                   "facebook": "joao.ferreira",
                   "bio": "Alugo carros bem cuidados na região de Florianópolis."}},
    )

    # admin
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_pw = os.environ["ADMIN_PASSWORD"]
    if not await db.users.find_one({"email": admin_email}):
        await db.users.insert_one({
            "id": new_id(), "email": admin_email, "name": "Admin LOCAFACIL",
            "phone": "", "whatsapp": "", "instagram": "", "facebook": "", "bio": "",
            "role": "admin", "password_hash": hash_pw(admin_pw),
            "kyc_level": "approved", "kyc_data": None, "avatar": "", "created_at": now_iso(),
        })

    # test renter
    if not await db.users.find_one({"email": "locatario@teste.com"}):
        await db.users.insert_one({
            "id": new_id(), "email": "locatario@teste.com", "name": "Maria Silva",
            "phone": "+55 48 99999-0001", "whatsapp": "+5548999990001",
            "instagram": "@mariasilva", "facebook": "maria.silva",
            "bio": "Viajo pelo Brasil com a família.",
            "role": "renter",
            "password_hash": hash_pw("Teste@2026"),
            "kyc_level": "approved",
            "kyc_data": {"cpf": "***.***.***-**", "cnh_number": "***", "cnh_category": "B"},
            "avatar": "", "created_at": now_iso(),
        })

    # test owner
    owner = await db.users.find_one({"email": "proprietario@teste.com"})
    if not owner:
        owner_id = new_id()
        await db.users.insert_one({
            "id": owner_id, "email": "proprietario@teste.com", "name": "João Ferreira",
            "phone": "+55 48 99999-0002", "whatsapp": "+5548999990002",
            "instagram": "@joaoferreira", "facebook": "joao.ferreira",
            "bio": "Alugo carros bem cuidados na região de Florianópolis.",
            "role": "owner",
            "password_hash": hash_pw("Teste@2026"),
            "kyc_level": "approved", "kyc_data": None, "avatar": "", "created_at": now_iso(),
        })
    else:
        owner_id = owner["id"]

    # seed vehicles if none
    if await db.vehicles.count_documents({}) == 0:
        photos = {
            "economico": ["https://images.pexels.com/photos/12579276/pexels-photo-12579276.jpeg",
                          "https://images.unsplash.com/photo-1493238792000-8113da705763"],
            "suv": ["https://images.pexels.com/photos/7154537/pexels-photo-7154537.jpeg",
                    "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b"],
            "ev": ["https://images.pexels.com/photos/24376862/pexels-photo-24376862.jpeg",
                   "https://images.unsplash.com/photo-1560958089-b8a1929cea89"],
            "pickup": ["https://images.pexels.com/photos/11532838/pexels-photo-11532838.jpeg"],
            "sedan": ["https://images.unsplash.com/photo-1552519507-da3b142c6e3d"],
            "minivan": ["https://images.unsplash.com/photo-1609521263047-f8f205293f24"],
            "hatch": ["https://images.unsplash.com/photo-1541899481282-d53bffe3c35d"],
        }
        seeds = [
            {"brand": "Toyota", "model": "Corolla", "version": "XEi", "year": 2023, "plate": "ABC1D23",
             "category": "sedan", "transmission": "automatic", "fuel": "flex", "seats": 5, "doors": 4,
             "luggage": 3, "color": "prata", "km": 24000, "daily_price": 279, "deposit": 500,
             "city": "Florianópolis", "state": "SC", "neighborhood": "Trindade",
             "lat": -27.5954, "lng": -48.5480, "photos": photos["sedan"],
             "features": ["carplay", "android_auto", "gps", "air_conditioning", "leather"],
             "rules": ["Não fumar", "Devolver limpo"], "airport_pickup": True, "delivery_available": True,
             "delivery_fee": 40, "allow_pets": False},
            {"brand": "Chevrolet", "model": "Spin", "version": "LTZ 7 lugares", "year": 2022,
             "plate": "DEF2E34", "category": "minivan", "transmission": "automatic", "fuel": "flex",
             "seats": 7, "doors": 4, "luggage": 4, "color": "branco", "km": 38000, "daily_price": 349,
             "deposit": 700, "city": "Florianópolis", "state": "SC", "neighborhood": "Ingleses",
             "lat": -27.4370, "lng": -48.3960, "photos": photos["minivan"],
             "features": ["gps", "child_seat", "isofix", "usb", "air_conditioning"],
             "rules": ["Devolver com mesmo nível de combustível"], "airport_pickup": True,
             "delivery_available": True, "delivery_fee": 60, "allow_pets": True},
            {"brand": "Jeep", "model": "Compass", "version": "Limited", "year": 2024, "plate": "GHI3F45",
             "category": "suv", "transmission": "automatic", "fuel": "flex", "seats": 5, "doors": 4,
             "luggage": 4, "color": "cinza", "km": 12000, "daily_price": 429, "deposit": 1000,
             "city": "São Paulo", "state": "SP", "neighborhood": "Pinheiros",
             "lat": -23.5680, "lng": -46.6820, "photos": photos["suv"],
             "features": ["carplay", "android_auto", "sunroof", "leather", "4x4", "cruise_control"],
             "rules": ["Não permitido viagem off-road extrema"], "airport_pickup": True,
             "delivery_available": False, "allow_pets": False},
            {"brand": "BYD", "model": "Dolphin", "version": "Plus", "year": 2024, "plate": "JKL4G56",
             "category": "ev", "transmission": "automatic", "fuel": "electric", "seats": 5, "doors": 4,
             "luggage": 2, "color": "azul", "km": 6000, "daily_price": 319, "deposit": 800,
             "city": "Rio de Janeiro", "state": "RJ", "neighborhood": "Barra da Tijuca",
             "lat": -23.0000, "lng": -43.3650, "photos": photos["ev"],
             "features": ["carplay", "wireless_charging", "gps", "air_conditioning"],
             "rules": ["Devolver com bateria acima de 20%"], "airport_pickup": True,
             "delivery_available": True, "delivery_fee": 80, "allow_pets": False},
            {"brand": "Volkswagen", "model": "Polo", "version": "Highline", "year": 2023,
             "plate": "MNO5H67", "category": "hatch", "transmission": "automatic", "fuel": "flex",
             "seats": 5, "doors": 4, "luggage": 2, "color": "preto", "km": 28000, "daily_price": 219,
             "deposit": 400, "city": "Curitiba", "state": "PR", "neighborhood": "Batel",
             "lat": -25.4370, "lng": -49.2830, "photos": photos["hatch"],
             "features": ["carplay", "gps", "usb", "cruise_control"],
             "rules": ["Não permitido animais"], "airport_pickup": True, "delivery_available": False},
            {"brand": "Toyota", "model": "Hilux", "version": "SRX", "year": 2023, "plate": "PQR6I78",
             "category": "pickup", "transmission": "automatic", "fuel": "diesel", "seats": 5, "doors": 4,
             "luggage": 5, "color": "branco", "km": 42000, "daily_price": 549, "deposit": 1500,
             "city": "Balneário Camboriú", "state": "SC", "neighborhood": "Centro",
             "lat": -26.9910, "lng": -48.6350, "photos": photos["pickup"],
             "features": ["4x4", "gps", "carplay", "air_conditioning"],
             "rules": ["Off-road autorizado"], "airport_pickup": False, "delivery_available": True,
             "delivery_fee": 100, "allow_pets": True},
            {"brand": "Fiat", "model": "Mobi", "version": "Like", "year": 2022, "plate": "STU7J89",
             "category": "economico", "transmission": "manual", "fuel": "flex", "seats": 5, "doors": 4,
             "luggage": 1, "color": "vermelho", "km": 51000, "daily_price": 129, "deposit": 200,
             "city": "Florianópolis", "state": "SC", "neighborhood": "Centro",
             "lat": -27.5980, "lng": -48.5490, "photos": photos["economico"],
             "features": ["air_conditioning", "usb"], "rules": ["Não fumar"],
             "airport_pickup": False, "delivery_available": False},
            {"brand": "Honda", "model": "HR-V", "version": "EXL", "year": 2024, "plate": "VWX8K90",
             "category": "suv", "transmission": "automatic", "fuel": "flex", "seats": 5, "doors": 4,
             "luggage": 3, "color": "prata", "km": 8000, "daily_price": 379, "deposit": 800,
             "city": "São Paulo", "state": "SP", "neighborhood": "Vila Olímpia",
             "lat": -23.5960, "lng": -46.6870, "photos": photos["suv"],
             "features": ["carplay", "android_auto", "sunroof", "cruise_control", "isofix"],
             "rules": ["Não fumar"], "airport_pickup": True, "delivery_available": True,
             "delivery_fee": 70, "allow_pets": False},
        ]
        for s in seeds:
            v = {
                "id": new_id(), "owner_id": owner_id, "owner_name": "João Ferreira",
                "status": "active", "verified": True, "rating_avg": 4.8, "rating_count": 12,
                "weekly_price": None, "monthly_price": None, "included_km_per_day": 200,
                "extra_km_price": 1.5, "fuel_policy": "same_level", "cleaning_policy": "reasonable",
                "cancel_policy": "flex_48h", "allow_interstate": True, "created_at": now_iso(),
                **s,
            }
            await db.vehicles.insert_one(v)

    await db.users.create_index("email", unique=True)
    await db.vehicles.create_index("city")
    await db.bookings.create_index("renter_id")
    await db.bookings.create_index("owner_id")


@app.on_event("startup")
async def startup():
    await seed()
    logger.info("LOCAFACIL API ready")


# mount router + CORS
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
