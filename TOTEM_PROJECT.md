# Totem — Festival Group Coordination App
### Project Planning Document

---

## Overview

A mobile-first Progressive Web App (PWA) that solves the core problem of festival group coordination: finding your people, knowing where they'll be, and staying loosely connected when cell service is unreliable. Initially scoped to Electric Forest, built to expand.

**Core design philosophy:**
- Sync when you can, display last-known info when you can't
- No promises of real-time GPS tracking — honest design
- Schedule planning happens at home; app surfaces it at the festival
- Private friend groups are the social unit, not strangers

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js (PWA) | Familiar framework, installable on iOS/Android, no new language to learn |
| Backend | FastAPI (Python) | Developer's strongest language, clean async API design |
| Database | PostgreSQL | Industry standard, Railway-native, ~90% SQL Server syntax overlap |
| Auth | Supabase Auth | Production-grade JWT/OAuth, free tier, handles security complexity |
| File Storage | Supabase Storage | Festival maps, artist images |
| Frontend Hosting | Vercel | Native Next.js hosting, GitHub deploy integration |
| Backend Hosting | Railway | Already familiar, FastAPI deploys easily |
| DB Hosting | Railway PostgreSQL | Co-located with backend, simple connection string |
| Push Notifications | Web Push API | Built into PWAs, no extra service needed |
| SMS Invitations | Twilio | Industry standard, Python SDK, env-var credential storage |
| Deep Linking | Next.js dynamic routes + PWA manifest | Routes `/invite/{token}` directly into app context |

---

## Data Model

### Tables

```
users
  id              UUID PK
  display_name    TEXT
  email           TEXT UNIQUE
  avatar_url      TEXT
  created_at      TIMESTAMP

groups
  id              UUID PK
  name            TEXT
  created_by      UUID FK → users.id
  created_at      TIMESTAMP

group_members
  id              UUID PK
  group_id        UUID FK → groups.id
  user_id         UUID FK → users.id
  role            TEXT          -- 'admin' | 'member'
  joined_at       TIMESTAMP

festivals
  id              UUID PK
  name            TEXT
  location        TEXT
  start_date      DATE
  end_date        DATE
  slug            TEXT UNIQUE   -- e.g. 'electric-forest-2026'

group_festivals
  id              UUID PK
  group_id        UUID FK → groups.id
  festival_id     UUID FK → festivals.id
  linked_at       TIMESTAMP

stages
  id              UUID PK
  festival_id     UUID FK → festivals.id
  name            TEXT
  description     TEXT

artists
  id              UUID PK
  name            TEXT
  genre           TEXT
  image_url       TEXT

performances
  id              UUID PK
  festival_id     UUID FK → festivals.id
  stage_id        UUID FK → stages.id
  artist_id       UUID FK → artists.id
  start_time      TIMESTAMP
  end_time        TIMESTAMP

user_schedules
  id              UUID PK
  user_id         UUID FK → users.id
  group_festival_id UUID FK → group_festivals.id
  performance_id  UUID FK → performances.id
  status          TEXT          -- 'attending' | 'maybe' | 'skipping'
  created_at      TIMESTAMP
  updated_at      TIMESTAMP

invitations
  id              UUID PK
  group_id        UUID FK → groups.id
  invited_by      UUID FK → users.id
  phone_number    TEXT          -- hashed after acceptance
  token           TEXT UNIQUE   -- embedded in SMS deep link
  status          TEXT          -- 'pending' | 'accepted' | 'expired'
  expires_at      TIMESTAMP
  created_at      TIMESTAMP
```

### Key design decisions
- `group_festivals` is the pivot between persistent friend groups and individual festival trips. One group can attend many festivals across multiple years.
- `user_schedules` is scoped to `group_festival_id`, not just `festival_id`. A user's plans are always tied to a specific trip with a specific crew.
- `performances` is the read-only source of truth for schedule data. Users react to it via `user_schedules`.
- Phone numbers in `invitations` are hashed at rest and cleared after acceptance to minimize PII retention.

---

## API Endpoints

### Auth
```
POST   /auth/register               Create account
POST   /auth/login                  Get JWT token
POST   /auth/refresh                Refresh access token
POST   /auth/logout                 Revoke token
```

### Users
```
GET    /users/me                    Current user profile
PATCH  /users/me                    Update profile
```

### Groups
```
POST   /groups                      Create a group
GET    /groups                      List my groups
GET    /groups/{group_id}           Group details + members
PATCH  /groups/{group_id}           Update group name (admin only)
DELETE /groups/{group_id}           Delete group (admin only)
```

### Invitations
```
POST   /groups/{group_id}/invitations         Send SMS invite via Twilio
GET    /invitations/{token}                   Validate invite token (pre-accept check)
POST   /invitations/{token}/accept            Accept invite + join group
```

### Festivals
```
GET    /festivals                             List all festivals (public)
GET    /festivals/{festival_id}               Festival details (public)
GET    /festivals/{festival_id}/schedule      All stages + performances (public)
POST   /groups/{group_id}/festivals           Link a festival to a group
GET    /groups/{group_id}/festivals           Group's linked festivals
```

### Schedules
```
GET    /group-festivals/{gf_id}/schedules             All members' plans
GET    /group-festivals/{gf_id}/schedules/me          My plan for this trip
POST   /group-festivals/{gf_id}/schedules             Add performance to my plan
PATCH  /group-festivals/{gf_id}/schedules/{id}        Update status
DELETE /group-festivals/{gf_id}/schedules/{id}        Remove from my plan
GET    /group-festivals/{gf_id}/schedules/poll        Delta sync — ?since= timestamp
```

> **Polling strategy:** The `/poll` endpoint accepts a `?since=<ISO timestamp>` query param and returns only rows updated after that time. The frontend polls every 3–5 minutes. This keeps payloads small and handles offline gaps gracefully without requiring WebSockets.

---

## Project Directory Structure

```
totem/
│
├── README.md
├── TOTEM_PROJECT.md        ← this file
│
├── backend/                       FastAPI application
│   ├── main.py                    App entrypoint, router registration
│   ├── requirements.txt
│   ├── .env.example               Template for all required env vars
│   ├── alembic/                   Database migrations
│   │   ├── env.py
│   │   └── versions/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py          Pydantic settings (reads from .env)
│   │   │   ├── security.py        JWT encode/decode, password hashing
│   │   │   └── database.py        SQLAlchemy engine + session factory
│   │   ├── models/                SQLAlchemy ORM models (one per table)
│   │   │   ├── user.py
│   │   │   ├── group.py
│   │   │   ├── festival.py
│   │   │   ├── performance.py
│   │   │   ├── schedule.py
│   │   │   └── invitation.py
│   │   ├── schemas/               Pydantic request/response schemas
│   │   │   ├── user.py
│   │   │   ├── group.py
│   │   │   ├── festival.py
│   │   │   ├── schedule.py
│   │   │   └── invitation.py
│   │   ├── routers/               One router file per resource group
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── groups.py
│   │   │   ├── invitations.py
│   │   │   ├── festivals.py
│   │   │   └── schedules.py
│   │   ├── services/              Business logic, decoupled from HTTP layer
│   │   │   ├── auth_service.py
│   │   │   ├── invitation_service.py   Twilio SMS logic lives here
│   │   │   └── schedule_service.py
│   │   └── dependencies.py        Shared FastAPI dependencies (get_db, get_current_user)
│
└── frontend/                      Next.js PWA
    ├── package.json
    ├── next.config.js             PWA config (next-pwa), deep link rewrites
    ├── public/
    │   ├── manifest.json          PWA manifest (app name, icons, theme)
    │   └── icons/
    ├── src/
    │   ├── app/                   Next.js App Router
    │   │   ├── layout.tsx         Root layout, auth provider
    │   │   ├── page.tsx           Landing / home
    │   │   ├── (auth)/
    │   │   │   ├── login/page.tsx
    │   │   │   └── register/page.tsx
    │   │   ├── groups/
    │   │   │   ├── page.tsx           My groups list
    │   │   │   └── [groupId]/
    │   │   │       ├── page.tsx       Group detail + festival list
    │   │   │       └── [gfId]/
    │   │   │           └── page.tsx   Schedule view — group festival trip
    │   │   ├── invite/
    │   │   │   └── [token]/page.tsx   Deep link landing, accept invite
    │   │   └── festivals/
    │   │       └── [festivalId]/page.tsx  Public festival schedule browser
    │   ├── components/
    │   │   ├── ui/                Reusable primitives (Button, Card, Badge, Modal)
    │   │   ├── schedule/
    │   │   │   ├── ScheduleGrid.tsx    Timeline view of performances
    │   │   │   ├── PerformanceCard.tsx
    │   │   │   └── MemberPlansOverlay.tsx  Shows friends' statuses on schedule
    │   │   ├── groups/
    │   │   │   ├── GroupCard.tsx
    │   │   │   ├── MemberList.tsx
    │   │   │   └── InviteModal.tsx
    │   │   └── layout/
    │   │       ├── Header.tsx
    │   │       └── BottomNav.tsx   Mobile-first nav
    │   ├── lib/
    │   │   ├── api.ts             Typed API client (fetch wrapper)
    │   │   ├── auth.ts            Supabase Auth client helpers
    │   │   └── polling.ts         Poll scheduler — calls /poll on interval
    │   ├── hooks/
    │   │   ├── useGroupSchedule.ts
    │   │   ├── usePolling.ts
    │   │   └── useAuth.ts
    │   └── types/
    │       └── index.ts           Shared TypeScript types matching API schemas
```

---

## Build Phases

---

### Phase 1 — Backend Foundation
*Goal: Working API with auth, groups, and a seeded festival schedule. No frontend yet.*

**Step 1 — Project setup**
- Initialize git repo with `backend/` and `frontend/` directories
- Create `backend/requirements.txt` with: `fastapi`, `uvicorn`, `sqlalchemy`, `alembic`, `psycopg2-binary`, `python-jose`, `passlib`, `pydantic-settings`, `twilio`, `python-dotenv`
- Copy `.env.example`, fill in local values
- Provision a Railway PostgreSQL instance, copy connection string to `.env`

**Step 2 — Database connection + config**
- Implement `app/core/config.py` using `pydantic-settings` to load all env vars with type validation
- Implement `app/core/database.py` — SQLAlchemy async engine, `SessionLocal`, `get_db` dependency
- Verify connection with a simple test query

**Step 3 — ORM models**
- Write SQLAlchemy models for all 9 tables in `app/models/`
- Define relationships (e.g. `group.members`, `performance.stage`)
- Run `alembic init` and configure `env.py` to point at your models
- Generate and run first migration: `alembic revision --autogenerate -m "initial schema"`
- Verify tables created in Railway DB

**Step 4 — Auth endpoints**
- Implement `app/core/security.py`: `hash_password`, `verify_password`, `create_access_token`, `decode_token`
- Write Pydantic schemas: `UserCreate`, `UserLogin`, `TokenResponse`
- Implement `POST /auth/register` and `POST /auth/login`
- Implement `dependencies.py`: `get_current_user` dependency (validates JWT on protected routes)
- Test with Postman or HTTPie: register → login → get token

**Step 5 — Users endpoint**
- Implement `GET /users/me` and `PATCH /users/me`
- Protect with `get_current_user` dependency
- Write `UserResponse` schema (never return password hash)

**Step 6 — Groups + members**
- Implement all 5 group endpoints
- On `POST /groups`, automatically add creator as `role='admin'` in `group_members`
- Enforce admin-only guard on PATCH and DELETE using a reusable dependency

**Step 7 — Festival + schedule seed data**
- Write a seed script `backend/seed.py` that inserts Electric Forest 2026 data:
  - Festival record
  - All stages
  - All artists
  - All performances with real times
- Source the schedule from the official Electric Forest website or lineup announcements
- Run seed script: `python seed.py`
- Implement `GET /festivals`, `GET /festivals/{id}`, `GET /festivals/{id}/schedule`

**Step 8 — Group-festival linking**
- Implement `POST /groups/{group_id}/festivals` and `GET /groups/{group_id}/festivals`
- Validate that the requesting user is a member of the group

**Step 9 — Schedule endpoints**
- Implement all 5 schedule endpoints
- Implement `/poll` endpoint: accepts `?since=` ISO timestamp, returns `user_schedules` rows with `updated_at > since`
- Write integration tests covering: add to plan → poll → verify delta returned

**Step 10 — Invitations + Twilio**
- Create Twilio account, get `ACCOUNT_SID`, `AUTH_TOKEN`, and a phone number
- Add credentials to `.env`
- Implement `invitation_service.py`: generate random token, insert `invitations` row, call Twilio SMS API
- Implement `POST /groups/{group_id}/invitations` — sends SMS with `https://usetotem.app/invite/{token}`
- Implement `GET /invitations/{token}` — validate token is pending + not expired
- Implement `POST /invitations/{token}/accept` — add user to `group_members`, mark invitation accepted, clear phone number from DB

**Phase 1 checkpoint:** Full API is testable via Postman. Auth works, groups work, festival schedule is seeded, invitations send real SMS, schedule polling returns deltas.

---

### Phase 2 — Frontend Foundation
*Goal: Working Next.js PWA that consumes the backend. Core screens only.*

**Step 11 — Next.js project setup**
- `npx create-next-app@latest frontend --typescript --app --tailwind`
- Install `next-pwa`, configure in `next.config.js`
- Create `public/manifest.json` with app name, icons, `start_url`, `display: standalone`
- Install `@supabase/supabase-js` for auth client
- Set up `src/lib/api.ts` — typed fetch wrapper that attaches JWT from localStorage to all requests

**Step 12 — Auth screens**
- Build `/login` and `/register` pages
- Wire to `POST /auth/register` and `POST /auth/login`
- Store JWT in memory + `localStorage` fallback
- Implement `useAuth` hook: `login`, `logout`, `currentUser`
- Add route protection: redirect unauthenticated users to `/login`

**Step 13 — Groups list screen**
- Build `/groups` — shows all groups the user belongs to as cards
- Build `GroupCard` component: group name, member count, next linked festival
- Add "Create group" button → modal → `POST /groups`

**Step 14 — Group detail screen**
- Build `/groups/[groupId]` — shows group name, member list, linked festivals
- Build `MemberList` component with avatars and roles
- Add "Invite member" button → `InviteModal` → phone number input → `POST /groups/{id}/invitations`
- Add "Add festival" button → festival picker → `POST /groups/{id}/festivals`

**Step 15 — Deep link invite flow**
- Build `/invite/[token]` page
- On load: call `GET /invitations/{token}` to validate
- If valid: show group name + "Join group" button → `POST /invitations/{token}/accept` → redirect to group
- If invalid/expired: show clear error message

**Step 16 — Festival schedule screen**
- Build `/groups/[groupId]/[gfId]` — the core screen
- Fetch full festival schedule from `GET /festivals/{id}/schedule`
- Fetch all group members' plans from `GET /group-festivals/{gfId}/schedules`
- Build `ScheduleGrid` — vertical timeline grouped by stage, performances as tappable cards
- Build `PerformanceCard` — artist name, time, stage, status buttons (attending / maybe / skipping)
- On status tap: `POST` or `PATCH` to schedule endpoint
- Show friends' statuses as small avatars on each performance card

**Step 17 — Polling**
- Implement `usePolling` hook: runs `GET /group-festivals/{gfId}/schedules/poll?since=` every 3 minutes
- Merges delta response into local schedule state
- Show subtle "last synced" timestamp in UI so users understand the sync model

**Step 18 — PWA polish**
- Test "Add to Home Screen" flow on iOS Safari and Android Chrome
- Verify offline behavior: app loads and shows last-known schedule with no network
- Add offline banner component ("You're offline — showing last synced data")
- Verify push notification permission prompt works

**Phase 2 checkpoint:** End-to-end flow works on a real phone. User can register, create a group, invite friends via SMS, link Electric Forest, plan their sets, and see friends' plans. Works offline showing last-known state.

---

### Phase 3 — Hardening & Monetization
*Goal: Ready for real users. Stable, secure, and generating revenue.*

**Step 19 — Security hardening**
- Add rate limiting to auth endpoints (prevent brute force): use `slowapi` middleware in FastAPI
- Add CORS configuration — whitelist only your Vercel frontend domain
- Audit all endpoints: confirm every non-public route requires valid JWT
- Confirm phone numbers are cleared from `invitations` table after acceptance
- Add input validation and max-length guards on all text fields
- Set invitation `expires_at` to 48 hours; add a scheduled cleanup job for expired rows

**Step 20 — Error handling + logging**
- Implement global FastAPI exception handler — consistent error response shape `{detail, code}`
- Add structured logging with `loguru` — request ID, user ID, endpoint, response time
- Set up Railway log drain or Papertrail for log visibility in production

**Step 21 — Testing**
- Write pytest integration tests for all auth, group, invitation, and schedule flows
- Write frontend component tests for `ScheduleGrid` and `PerformanceCard` with React Testing Library
- Add GitHub Actions CI: run backend tests on every push to `main`

**Step 22 — Monetization (free + paid tiers)**

Suggested tier structure:

| Feature | Free | Pro (~$3/mo) |
|---|---|---|
| Groups | 1 | Unlimited |
| Members per group | 6 | 20 |
| Festivals per group | 1 | Unlimited |
| Schedule visibility | Group | Group |
| SMS invites | 3/month | Unlimited |
| Push notifications | Basic | Set reminders + friend alerts |

- Integrate Stripe for subscription billing
- Add `subscription_tier` and `stripe_customer_id` to `users` table
- Gate tier-limited features in FastAPI with a `check_tier` dependency
- Build `/settings/billing` page in frontend — shows plan, upgrade button, Stripe portal link

**Step 23 — Multi-festival support**
- Expand seed script to support additional festivals (Bonnaroo, EDC, Lollapalooza)
- Build festival browse/search screen: `GET /festivals` with name filter
- Consider a lightweight admin panel (or just direct DB access) for adding new festival data each season

**Step 24 — App Store distribution (optional)**
- Wrap the PWA in a Capacitor shell for native iOS/Android packaging
- Submit to Apple App Store and Google Play
- This step is optional — the PWA is fully functional as a home screen app without it

**Phase 3 checkpoint:** App is live, secure, and monetized. Real Electric Forest attendees can use it. Revenue covers infrastructure costs with margin.

---

## Environment Variables Reference

```
# Backend (.env)
DATABASE_URL=postgresql://...
SECRET_KEY=<random 64-char string>
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=<service role key>

TWILIO_ACCOUNT_SID=ACxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxx
TWILIO_FROM_NUMBER=+1xxxxxxxxxx

FRONTEND_URL=https://usetotem.app   # used for invite link generation + CORS

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://api.usetotem.app
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

---

## Development Workflow

```bash
# Backend (local)
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head             # run migrations
python seed.py                   # seed festival data
uvicorn main:app --reload        # runs on localhost:8000

# Frontend (local)
cd frontend
npm install
npm run dev                      # runs on localhost:3000
```

**Branches:**
- `main` — production. Merges trigger auto-deploy to Vercel + Railway.
- `dev` — active development branch.
- Feature branches off `dev`, PR back to `dev`, periodic merges to `main`.

---

## What We're Not Building (v1 Scope Constraints)

- No live GPS location tracking
- No real-time WebSocket updates (polling only)
- No social feed or stranger discovery (Radiate-style)
- No Android/iOS native app (PWA covers this)
- No in-app chat (use your group chat for that)
- No festival map (Phase 2+ consideration)
- No official festival API integration (seed data manually for v1)

These are deliberate. Every item on this list is a future feature, not a failure. Scope discipline is what gets v1 shipped.

---

*Document version: 1.1 — created at project inception*
*Stack decisions, data model, and API design finalized before any code was written*