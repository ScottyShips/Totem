# CLAUDE.md — Totem
### AI Assistant Context & Rules for This Project

This file is the source of truth for how Claude should behave when working on this codebase.
Read it fully before writing any code, suggesting any architecture, or answering any question
about this project. Do not deviate from it without explicit instruction from the developer.

---

## Who You Are Working With

- Trevor, a junior-to-mid developer at MIMG (Monarch Investment Management Group)
- Primary strengths: SQL (SQL Server), Python, FastAPI, basic React/Next.js
- Comfortable with: PowerShell, REST APIs, JWT/OAuth basics, Railway, GitHub deployments
- Learning: PostgreSQL, React Native patterns, mobile UX, offline-first architecture
- Working style: prefers clarifying questions before diving in, wants explanations of *why* not just *what*

When explaining decisions, always include the rationale. When multiple approaches exist,
briefly state the tradeoff before recommending one. Never just produce code silently —
explain what it does and why it is structured that way.

---

## Project Summary

A mobile-first Progressive Web App (PWA) for festival group coordination. Users create
persistent friend groups, link those groups to specific festival events, and plan which
performances they will attend. Friends can see each other's plans. The app works offline
by displaying last-synced data when connectivity is unavailable.

**Initial scope:** Electric Forest only. Built to expand.
**Target platform:** iOS and Android via PWA (no native app in v1).
**Core UX constraint:** Never promise real-time tracking. Sync when possible, degrade gracefully.
---

## Brand Identity — Do Not Deviate

- **App name:** Totem
- **Domain:** usetotem.app
- **Frontend URL:** https://usetotem.app
- **Backend URL:** https://api.usetotem.app
- **Twitter/X:** @usetotem
- **Instagram:** @usetotemapp
- **Tagline concept:** Find your people. — (not finalized, do not use in code)

When generating any user-facing strings, copy, SMS messages, or UI text:
- Always refer to the app as "Totem" — never "the app", "festival app", or any other name
- SMS invite message format: "You've been invited to join a group on Totem! usetotem.app/invite/{token}"
- Never use "Forest & Friends", "Festy", "Rally", or any other discarded name



---

## Tech Stack — Locked

Do not suggest alternatives to these unless Trevor explicitly asks for them.

| Layer | Technology | Version target |
|---|---|---|
| Frontend | Next.js (App Router) | 14.x |
| Frontend language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| PWA | next-pwa | latest |
| Backend | FastAPI | 0.111.x |
| Backend language | Python | 3.11+ |
| ORM | SQLAlchemy (async) | 2.x |
| Migrations | Alembic | latest |
| Database | PostgreSQL | 15+ (Railway hosted) |
| Auth | Supabase Auth | latest JS + Python SDK |
| File storage | Supabase Storage | latest |
| SMS | Twilio | latest Python SDK |
| Frontend hosting | Vercel | — |
| Backend hosting | Railway | — |
| DB hosting | Railway PostgreSQL | — |
| Push notifications | Web Push API | native PWA |

---

## Project Structure — Do Not Reorganize

```
totem/
├── CLAUDE.md                          ← this file
├── TOTEM_PROJECT.md            ← project planning doc
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── seed.py
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   └── app/
│       ├── core/
│       │   ├── config.py
│       │   ├── security.py
│       │   └── database.py
│       ├── models/
│       ├── schemas/
│       ├── routers/
│       ├── services/
│       └── dependencies.py
└── frontend/
    ├── next.config.js
    ├── public/
    │   └── manifest.json
    └── src/
        ├── app/
        ├── components/
        ├── lib/
        ├── hooks/
        └── types/
```

If a new file is needed that does not fit an existing directory, ask before creating it.
Never move, rename, or restructure existing files without being asked.

---

## Database — Schema Reference

These are the canonical table definitions. Do not invent columns, rename fields,
or suggest schema changes without flagging it as a deviation.

```sql
users               (id, display_name, email, avatar_url, created_at)
groups              (id, name, created_by → users, created_at)
group_members       (id, group_id → groups, user_id → users, role, joined_at)
festivals           (id, name, location, start_date, end_date, slug)
group_festivals     (id, group_id → groups, festival_id → festivals, linked_at)
stages              (id, festival_id → festivals, name, description)
artists             (id, name, genre, image_url)
performances        (id, festival_id, stage_id, artist_id, start_time, end_time)
user_schedules      (id, user_id, group_festival_id, performance_id, status, created_at, updated_at)
invitations         (id, group_id, invited_by, phone_number, token, status, expires_at, created_at)
```

`user_schedules.status` values: `'attending'` | `'maybe'` | `'skipping'`
`group_members.role` values: `'admin'` | `'member'`
`invitations.status` values: `'pending'` | `'accepted'` | `'expired'`

---

## API Design — Locked Endpoint Surface

Refer to `TOTEM_PROJECT.md` for the full endpoint list. Rules:

- All routes are prefixed with `/api/v1/`
- All protected routes require `Authorization: Bearer <token>` header
- Public routes (no auth required): `GET /festivals`, `GET /festivals/{id}`, `GET /festivals/{id}/schedule`, `GET /invitations/{token}`
- Consistent error response shape: `{"detail": "Human readable message", "code": "MACHINE_READABLE_CODE"}`
- Consistent success shape for lists: `{"data": [...], "count": N}`
- Never return passwords, raw phone numbers, or internal IDs that expose DB structure unnecessarily

---

## Build Phase Reference

We are building in 3 phases. Always confirm which phase/step we are on before writing code.

- **Phase 1** (Steps 1–10): Backend only. FastAPI + PostgreSQL + Auth + Seeded festival data + Invitations.
- **Phase 2** (Steps 11–18): Frontend. Next.js PWA + all core screens + polling + offline behavior.
- **Phase 3** (Steps 19–24): Hardening. Security, testing, Stripe monetization, multi-festival, optional App Store.

Never jump ahead to a later phase without completing the current one.
Never start a new step without confirming the previous step's checkpoint is met.

---

## Security Rules — Non-Negotiable

These apply to every line of code written for this project. No exceptions.

### Credentials and secrets
- Never hardcode secrets, API keys, tokens, or connection strings in source code
- All secrets live in `.env` (backend) or `.env.local` (frontend) — never committed to git
- `.env` and `.env.local` must always be in `.gitignore`
- `.env.example` must exist and stay up to date with all required variable names but no real values
- If a secret must be referenced in code, use `settings.VARIABLE_NAME` via `pydantic-settings` config

### Authentication and authorization
- Every non-public API endpoint must validate the JWT via the `get_current_user` dependency
- Never trust user-supplied IDs without verifying the requesting user has permission to access that resource
- Admin-only operations (group delete, member removal) require an explicit `require_admin` dependency check — do not rely on frontend to enforce this
- JWTs must have short expiry (60 minutes access token, 30 days refresh token)
- Refresh tokens must be rotated on use
- Never log full JWT tokens

### Passwords
- Never store plaintext passwords — always hash with `passlib` using `bcrypt`
- Never return password hashes in any API response
- Never log passwords

### PII handling
- Phone numbers in `invitations` must be hashed at rest using `hashlib.sha256`
- Phone numbers must be cleared (set to `NULL`) from the `invitations` table after the invitation is accepted
- Never log phone numbers
- Never return phone numbers in API responses

### SQL and data access
- Always use SQLAlchemy ORM or parameterized queries — never string-format SQL
- Never use raw `text()` queries unless absolutely necessary; if used, always bind parameters
- All DB queries must go through the `get_db` dependency — no direct engine calls in routers

### Input validation
- All request bodies must have Pydantic schemas with explicit field types and max lengths
- Enforce max lengths: names ≤ 100 chars, descriptions ≤ 500 chars, free-text ≤ 1000 chars
- Strip leading/trailing whitespace on all string inputs
- Validate email format in Pydantic schemas using `EmailStr`

### Rate limiting
- Auth endpoints (`/register`, `/login`) must be rate limited — max 10 requests per minute per IP
- Invitation send endpoint must be rate limited — max 20 SMS per hour per user
- Use `slowapi` middleware in FastAPI for this

### CORS
- CORS must be explicitly configured — never use wildcard `*` in production
- Allowed origins: `FRONTEND_URL` env var only
- In local development, `localhost:3000` is also allowed

### HTTP security headers
- Backend must set: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`
- Use `fastapi-security-headers` middleware or set manually in a custom middleware

### Frontend security
- Never store JWTs in `localStorage` — use `httpOnly` cookies or in-memory storage with refresh token fallback
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend — only `ANON_KEY` via `NEXT_PUBLIC_`
- Sanitize all user-generated content before rendering — use React's default escaping, never `dangerouslySetInnerHTML`
- Deep link token pages (`/invite/[token]`) must validate the token server-side before rendering any group data

### Dependency security
- Pin all dependencies to specific versions in `requirements.txt` and `package.json`
- Run `pip audit` and `npm audit` before any production deployment
- Never install packages that are not needed — justify every dependency

---

## Code Standards — Backend (Python / FastAPI)

### General
- Python 3.11+ features are fine — use them where they improve clarity
- Follow PEP 8. Line length max: 100 characters
- Use type annotations everywhere — no untyped function signatures
- Use `async def` for all route handlers and DB operations
- Never use `import *`

### FastAPI patterns
- Routers live in `app/routers/` — one file per resource group
- Business logic lives in `app/services/` — route handlers should be thin (validate input → call service → return response)
- Shared dependencies (auth, DB session) live in `app/dependencies.py`
- Use `Depends()` for dependency injection — never instantiate services directly in routes
- Always declare explicit response models on route decorators: `@router.get("/", response_model=UserResponse)`
- Use `status_code` explicitly: `201` for creates, `204` for deletes, `200` for reads/updates

### SQLAlchemy
- Use async sessions (`AsyncSession`) throughout
- Always use `select()` syntax (SQLAlchemy 2.x style) — never `session.query()`
- Define relationships explicitly in models with `relationship()` and `back_populates`
- Never use `lazy="dynamic"` — use `selectinload` or `joinedload` explicitly
- Always `await session.commit()` followed by `await session.refresh(obj)` after writes

### Alembic
- Every schema change requires a new migration — never edit the DB manually in production
- Migration messages must be descriptive: `alembic revision --autogenerate -m "add_status_to_invitations"`
- Never delete migration files from `versions/` — migrations are append-only history

### Error handling
- Use `HTTPException` for all expected errors with appropriate status codes
- Define custom exception classes in `app/core/exceptions.py` for domain errors
- Use a global exception handler in `main.py` to catch unhandled exceptions and return consistent shape
- Never let raw Python exceptions bubble up to the client

### Logging
- Use `loguru` for all logging
- Log at `INFO` level: request received, resource created/updated, invitation sent
- Log at `WARNING` level: failed auth attempts, invalid tokens, expired invitations
- Log at `ERROR` level: unexpected exceptions, DB errors, Twilio failures
- Never log: passwords, tokens, phone numbers, full request bodies containing PII

---

## Code Standards — Frontend (Next.js / TypeScript)

### General
- TypeScript strict mode is enabled — no `any` types without explicit justification in a comment
- All components are functional — no class components
- All API calls go through `src/lib/api.ts` — never call `fetch()` directly in components
- All shared TypeScript types live in `src/types/index.ts`

### Next.js App Router patterns
- Use Server Components by default — add `'use client'` only when interactivity requires it
- Data fetching in Server Components uses `fetch()` with appropriate `cache` options
- Client-side data fetching uses custom hooks in `src/hooks/`
- Route handlers (`app/api/`) are for BFF (backend-for-frontend) patterns only — not business logic
- All pages that require auth must check session in layout or page server component and redirect

### Components
- One component per file — filename matches component name
- Props interfaces defined above the component with explicit types — no inline type literals on props
- Avoid prop drilling more than 2 levels — use context or co-location
- `components/ui/` contains only dumb, reusable primitives (no API calls, no business logic)
- `components/schedule/`, `components/groups/` contain smart feature components

### Styling
- Tailwind utility classes only — no inline `style` objects except where Tailwind cannot reach
- No custom CSS files except `globals.css` for base resets
- Mobile-first: base styles are for small screens, `md:` and `lg:` for larger
- Color palette must match the app's design tokens — do not introduce arbitrary hex values

### State management
- No global state library (Redux, Zustand) in v1 — React context + hooks is sufficient
- Server state (API data) managed via custom hooks with local `useState`
- Auth state managed via `useAuth` hook wrapping Supabase Auth client
- Polling state managed via `usePolling` hook — never inline polling logic in components

### Offline behavior
- Schedule data must be persisted to `localStorage` after every successful fetch
- On load, render from `localStorage` immediately, then refresh from network
- Show `OfflineBanner` component when `navigator.onLine` is false
- Never show a blank screen when offline — always show last-known data with a timestamp

---

## What Is Explicitly Out of Scope (v1)

Do not suggest, scaffold, or implement any of the following unless Trevor explicitly asks:

- Live GPS location tracking or real-time location sharing
- WebSocket connections (polling only in v1)
- Stranger/social discovery features (this is private groups only)
- Native iOS or Android app (Capacitor wrapping is Phase 3 optional)
- In-app messaging or chat
- Festival map rendering
- Official festival API integration (seed data is manual in v1)
- Admin dashboard UI (DB access is sufficient for v1 data management)
- Email-based invitations (SMS only in v1)
- Multi-language / i18n support

---

## Hallucination Guards

These are common areas where AI assistants go wrong. Follow these explicitly:

### Do not invent APIs or libraries
- If unsure whether a function, method, or library feature exists, say so and suggest checking the docs
- Do not assume FastAPI, SQLAlchemy, Next.js, or Supabase APIs based on older knowledge — the versions above may have changed interfaces

### Do not invent schema fields
- Only use columns that exist in the schema reference above
- If a feature seems to require a new column, flag it and propose a migration before using it

### Do not invent endpoints
- Only use endpoints defined in this file or `TOTEM_PROJECT.md`
- If a new endpoint is genuinely needed, propose it and get confirmation before implementing

### Do not assume environment variables exist
- Only reference variables defined in the `.env.example` reference section of `TOTEM_PROJECT.md`
- If a new service requires new variables, declare them explicitly and add them to `.env.example`

### Always ask before:
- Adding a new dependency (npm package or pip package)
- Creating a new file outside the established directory structure
- Changing a database schema
- Changing an existing API endpoint's method, path, or response shape
- Implementing anything listed in the "out of scope" section above

---

## Git Workflow

- `main` — production branch. Auto-deploys to Vercel + Railway on push.
- `dev` — active development. All feature work branches from here.
- Feature branches: `feature/step-4-auth-endpoints`, `feature/step-11-nextjs-setup`, etc.
- Commit messages: imperative, lowercase, descriptive — `add jwt refresh token rotation`, not `updated stuff`
- Never commit directly to `main`
- Never commit `.env` or `.env.local`
- Pull request from `dev` → `main` only when a full phase checkpoint is met

---

## How to Work With Claude on This Project

1. Start every session by stating the current step number and what was completed last session
2. If the codebase has changed since the last session, paste relevant file contents or diffs
3. Ask one focused question or request one focused task at a time
4. If Claude produces code that contradicts anything in this file, point it out — this file wins
5. If Claude seems uncertain about a library version or API shape, ask it to flag that uncertainty explicitly rather than guess
6. Request explanations alongside code — understanding the why is part of the goal

---

*CLAUDE.md version: 1.1*
*Initialized at project inception — before any code was written*
*Update this file whenever a locked decision changes*