# LOCAFACIL — Product Requirements Document

## Concept
Brazilian P2P/B2B vehicle rental marketplace. Transactional platform (not a car company), commission-based (10-15%). "Encontre o carro que você realmente precisa."

## User Personas
1. Renter (individual) — needs a car with specific features (7 seats, automatic, baby seat, etc.)
2. Owner (individual) — lists a personal car with rules and price
3. Company owner — fleet management
4. Company renter — books for employees
5. Admin — approves, monitors, configures commission

## MVP Scope (Feb 2026)
- Auth: JWT httpOnly cookies, roles (renter/owner/admin)
- KYC progressive levels: basic → identity → CNH → payment → approved
- Vehicle listings with rich metadata + filters (category, transmission, seats, family features, tech, price, rules)
- Interactive map (Leaflet + OSM) with approximate location pins
- Vehicle details page with photos, price breakdown, availability, rules
- Booking flow: dates → contract → mock split payment (commission 12% default)
- Chat between renter/owner (in-app only, no PII leaks)
- Check-in/Check-out digital with photos + notes
- Reviews (bidirectional)
- Incident reporting
- Renter dashboard, Owner dashboard, Admin dashboard (GMV, commission, users, vehicles)
- In-app notifications (bell)
- Portuguese language, R$ currency, PWA-like mobile-first

## Backlog (Phase 2)
- Real payment gateway (Mercado Pago / Pagar.me) with real split
- AI conversational search (Gemini/GPT)
- SMS/WhatsApp/Email notifications (Resend, Twilio)
- Insurance integration
- Dynamic pricing
- Business accounts (CNPJ, cost centers)
- Native mobile app
- Real background check integrations (LGPD compliance review needed first)
- 2FA/MFA

## Architecture
- FastAPI backend + MongoDB
- React 19 + Tailwind + Shadcn + Leaflet + Framer Motion + Phosphor Icons
- Fonts: Cabinet Grotesk (headings) + Satoshi (body) via Fontshare
- Design: "Asphalt & Guaraná" — orange #FF5A00 primary, deep dark surfaces, sharp corners

## Implemented (Feb 2026 — v1)
- Complete auth flow with JWT cookies + admin seed
- Vehicle CRUD + rich filter search
- Booking workflow with mock split payment logic (bruto / comissão / líquido do proprietário)
- Chat, reviews, incidents, KYC
- All 3 dashboards
- Seeded demo data (10+ vehicles across BR cities)
