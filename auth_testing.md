# LOCAFACIL — Auth Testing Playbook (Emergent Google Auth)

## Test Identities
- **Real admin/owner account** (from Emergent Google login): `tailansantos06@gmail.com` — role auto-set to `admin` on first Google sign-in.
- Any other Google account signing in for the first time gets `role="renter"` (they can convert to owner later via profile).

## Backend Endpoints
- `POST /api/auth/google/session` — reads `X-Session-ID` header (from Emergent), exchanges it at `https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data`, creates/updates user, sets `session_token` httpOnly cookie (7 days).
- `GET /api/auth/me` — resolves user from `session_token` cookie first, then falls back to legacy JWT `access_token` cookie.
- `POST /api/auth/logout` — deletes both cookies and removes session from `sessions` collection.

## Flow
1. Frontend button: `window.location.href = 'https://auth.emergentagent.com/?redirect=' + encodeURIComponent(window.location.origin + '/auth-callback')`
2. Emergent redirects to `/auth-callback#session_id=xxx`
3. AuthCallback component reads `useLocation().hash` synchronously, exchanges once (useRef guard), then navigates to `/`.

## Testing (Mongo)
```
mongosh --eval "
use('locafacil');
var uid='test_'+Date.now();
var st='test_session_'+Date.now();
db.users.insertOne({id: uid, email:'tester@example.com', name:'Test', role:'renter', kyc_level:'basic', created_at: new Date().toISOString()});
db.sessions.insertOne({session_token: st, user_id: uid, expires_at: new Date(Date.now()+7*86400*1000)});
print(st);
"
```

Then curl with cookie:
```
curl -b "session_token=<TOKEN>" https://<host>/api/auth/me
```

## Checklist
- [x] Existing JWT auth still works (`admin@locafacil.com.br` login)
- [x] Google flow sets `session_token` cookie and returns user via `/auth/me`
- [x] tailansantos06@gmail.com becomes admin on first Google login
- [x] AuthProvider skips `/auth/me` check when URL contains `#session_id=`
- [x] Callback uses `useLocation().hash` (reactive), `useRef` guard against double-exchange
