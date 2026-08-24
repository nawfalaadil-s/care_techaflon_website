# College Hackathon Platform

A production-quality college hackathon platform with a **mobile-first public website**, a **team leader portal**, and an **admin CRM**.

> **Development principle:** ONE PHASE AT A TIME. The public user experience is mobile-first (320px → 1920px), and mobile usability always wins over desktop complexity.

## Tech Stack

| Layer     | Technology                                                                 |
| --------- | -------------------------------------------------------------------------- |
| Frontend  | React 19, Vite, TypeScript, React Router, Tailwind CSS v4, Axios           |
| Backend   | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic                |
| Database  | PostgreSQL                                                                  |
| Auth      | JWT + refresh tokens + RBAC (implemented in the authentication phase)      |
| Email     | Gmail API via Google OAuth 2.0 (backend only)                              |
| Tasks     | Celery + Redis                                                              |
| Storage   | S3-compatible object storage / Cloudinary                                   |

## Project Structure

```
hackathon-platform/
├── frontend/                  # React + Vite + TypeScript
│   ├── src/
│   │   ├── api/               # Centralized Axios client + API modules
│   │   ├── components/
│   │   │   ├── ui/            # Design-system primitives
│   │   │   ├── layout/
│   │   │   ├── public/        # Public website sections
│   │   │   ├── hero/
│   │   │   ├── three/         # React Three Fiber scenes
│   │   │   ├── forms/
│   │   │   ├── team/          # Team leader portal
│   │   │   ├── admin/         # Admin CRM
│   │   │   └── common/
│   │   ├── config/            # Environment configuration
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── store/             # Zustand stores
│   │   └── types/
│   └── .env.example
├── backend/                   # FastAPI
│   ├── app/
│   │   ├── main.py            # App factory
│   │   ├── core/              # Settings & security
│   │   ├── database/          # Engine, session, Base
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── api/               # Routers (/api/...)
│   │   ├── services/          # Business logic
│   │   ├── workers/           # Celery tasks
│   │   └── utils/
│   ├── alembic/               # DB migrations
│   ├── tests/                 # Pytest suite
│   └── .env.example
└── README.md
```

## Prerequisites

- Node.js ≥ 20 and npm
- Python ≥ 3.11
- PostgreSQL running locally (default: `postgres:postgres@localhost:5432`)

## Getting Started

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt -r requirements-dev.txt
Copy-Item .env.example .env    # then edit DATABASE_URL if needed

# Run the API (http://localhost:8000)
.venv\Scripts\uvicorn app.main:app --reload --port 8000

# Health check
curl http://localhost:8000/api/health

# Tests
.venv\Scripts\pytest
```

Interactive docs: <http://localhost:8000/docs>

### Frontend

```powershell
cd frontend
npm install
npm run dev          # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:8000`, so no CORS setup is needed in development.

Other scripts:

```powershell
npm run build        # Type-check + production build
npm run preview      # Serve the production build
npm run lint         # OxLint
```

## Environment Configuration

- **Frontend** — `frontend/.env.example`: `VITE_API_BASE_URL` (empty in dev; the Vite proxy handles `/api`).
- **Backend** — `backend/.env.example`: app metadata, `DATABASE_URL`, `SECRET_KEY`, CORS origins.

Never commit real secrets. All runtime settings are loaded from environment variables / `.env` files.

## API Overview (Phase 1)

| Method | Path          | Description                                    |
| ------ | ------------- | ---------------------------------------------- |
| GET    | `/api/health` | Service health incl. PostgreSQL connectivity   |
| GET    | `/`           | API metadata                                   |

Full route groups (`/api/auth`, `/api/registration`, `/api/teams`, …) are added in their respective phases.

## Frontend Design System (Phase 2)

The mobile-first design system lives in the frontend and is the foundation for every page that follows.

- **Tokens** — `frontend/src/index.css` defines the full system via Tailwind v4 `@theme`: an OKLCH brand-purple palette (`primary`, `secondary`, `muted`, `accent`, `success`, `warning`, `destructive`, `info`, plus surface/foreground/border tokens), display (Space Grotesk) + body (Inter) + mono fonts, a radius scale, and card/popover shadows — all with automatic light/dark theming through a `.dark` variant.
- **Dark mode** — `src/hooks/useTheme.ts` persists the choice to `localStorage`, falls back to the OS preference, and `index.html` applies the saved theme before paint to avoid a flash.
- **UI primitives** — `src/components/ui/`:
  - `Button` / `LinkButton` (with `buttonVariants`)
  - `Input`, `Textarea`, `Select`, `Label`, `Field` (label + hint + error)
  - `Card` (+ Header/Title/Description/Content/Footer), `Badge`, `Spinner`
  - `Container`, `ScreenReaderOnly`
  - All interactive elements meet mobile touch-target guidelines (44px on small screens).
- **Layout** — `src/components/layout/` provides `PublicHeader`, `PublicFooter` and the shared `PublicLayout` used by every public page.

**Living styleguide:** <http://localhost:5173/design-system> documents the colors, type scale, radius, buttons, badges, forms, cards and loading states — resize to 320px–1920px and toggle dark mode to validate the system.

## Public Home Page (Phase 3)

The home page (`/`) is built entirely on the Phase 2 design system.

- **Sections** — `src/components/public/`: `Hero`, `Stats`, `Tracks`, `Timeline`, `Prizes`, `HowItWorks`, `CtaBand`, plus a shared `Section`/`SectionHeading` wrapper. All are mobile-first and fully responsive.
- **Staged content** — `src/data/home.ts` centralizes event facts, stats, tracks, schedule, prizes and steps. The API endpoints that provide this data live (registration, problem statements, admin CRM) arrive in later phases; the section components are presentational and can be wired to live data later with no markup changes.

## Animation (Phase 4)

A performant, **dependency-free** animation layer that honours the mobile-first principle and user motion preferences. Instead of a heavy WebGL/Three.js bundle (which would hurt mobile 320px performance), it uses GPU-friendly CSS transforms + opacities.

- **`usePrefersReducedMotion`** (`src/hooks/`) — live-tracked `prefers-reduced-motion`.
- **`Reveal`** (`src/components/common/`) — IntersectionObserver scroll-reveal wrapper (opacity + transform only, fires once then unobserves). Direction + stagger-delay props; no-ops under reduced motion and no-JS/SSR safe.
- **CSS keyframes & utilities** (`src/index.css`) — `animate-float`, `animate-glow-pulse`, `animate-gradient` (all disabled under reduced motion) and a `link-underline` affordance.
- **Animated home sections** — hero (entrance reveals, floating art, animated gradient + pulsing glow), staggered card/grid reveals in Stats, Tracks, Timeline, Prizes and HowItWorks, and a sweeping animated gradient CTA band.

A heavier WebGL hero can be added later (Phase 17/18) behind a media/device check without changing the existing layout.

## Authentication (Phase 6)

JWT auth with refresh tokens, wired end-to-end against the backend `/api/auth` group.

- **API module** — `src/api/authApi.ts`: `register`, `login`, `refresh`, `me`; types mirror `backend/app/schemas/user.py` and live in `src/types/auth.ts`.
- **Session store** — `src/store/authStore.ts`: Zustand + `persist` (localStorage key `hackathon-auth`) holding `user`, `accessToken`, `refreshToken`.
- **Axios wiring** — `src/api/client.ts`: a request interceptor attaches `Authorization: Bearer …`; on any 401 a **single-flight** refresh call exchanges the refresh token for a new pair and replays the original request. Auth endpoints themselves are excluded from the retry to avoid loops; a failed refresh clears the session.
- **Login page** — `/login` with Sign in / Create account tabs, inline validation, API error surfacing, and redirect back to the page that required auth (`location.state.from`).
- **Protected routes** — `RequireAuth` (`src/components/common/`) guards `/account`, which shows the profile and a sign-out button. The header swaps "Log in" for the user's first name when a session exists.

## Team Portal (Phase 7)

Team leaders manage their registrations from `/portal` (protected).

**Backend**
- **Migration `0003_teams_owner`** — nullable `registrations.owner_id` FK → `users.id` (indexed, `ON DELETE SET NULL`), so an anonymous registration can later be owned by an account.
- **Auto-link** — `POST /api/auth/register` now claims any unclaimed registration whose `representative_email` matches the new account's email (`services/user.py:link_registrations_to_user`).
- **`/api/teams` group** (`app/api/v1/teams.py`, all Bearer-authenticated):
  | Method | Path | Description |
  | ------ | ---- | ----------- |
  | GET | `/api/teams/mine` | Teams owned by the signed-in leader |
  | POST | `/api/teams/claim` | Attach unclaimed registrations matching the account email |
  | PATCH | `/api/teams/{id}` | Edit name, track, statement, members (owner-only, 404 on foreign IDs — no existence leak) |
- **Security hardening** — `GET /api/registration` (full PII feed) is now admin-RBAC-only (`get_current_admin`).
- **Tests** — `tests/test_teams.py`: auto-link, claim/idempotency/no-steal, owner edits + guard, auth required; `test_registration.py` updated for the protected listing. Suite: 10 passed.

**Frontend**
- **API module** — `src/api/teamApi.ts` (`getMine`, `claim`, `update`) over the shared client; track/year constants centralized in `src/data/tracks.ts`.
- **Portal page** — `src/pages/team/PortalPage.tsx`: loading/error states, empty state with *Register a team* + *link existing registration* actions, team cards, and an inline editor (name, track, statement, up to 4 member rows) mirroring the public form.
- **Wiring** — `/portal` route behind `RequireAuth`; header greeting links to `/portal`; post-login redirect defaults to `/portal`; `/account` cross-links to it.

## Project Submission (Phase 8)

Teams submit their hackathon project from the portal — one submission per team.

**Backend**
- **Migration `0004_submissions`** — `submissions` table, 1:1 with `registrations` (unique FK, `ON DELETE CASCADE`): `project_name`, `description` (text), `repo_url`, optional `demo_url`, timestamps.
- **Nested routes** (`app/api/v1/submissions.py`, Bearer-authenticated, owner-guarded via the Phase 7 team service):
  | Method | Path | Description |
  | ------ | ---- | ----------- |
  | GET | `/api/teams/{id}/submission` | Current submission or `null` before first submit |
  | PUT | `/api/teams/{id}/submission` | Idempotent upsert (create → update) |
  | DELETE | `/api/teams/{id}/submission` | Withdraw (204) |
- **Validation** — `schemas/submission.py`: http(s) URL checks, description ≥ 10 chars, empty demo URL normalizes to `null`.
- **Tests** — `tests/test_submissions.py`: upsert/get/withdraw cycle, validation, ownership guard, auth required. Suite: 14 passed.

**Frontend**
- **API module** — `src/api/submissionApi.ts` (`get`, `save`, `withdraw`).
- **Submission panel** — `src/components/team/SubmissionPanel.tsx`: per-team card section with submitted view (demo/repo links + withdraw) and an inline create/edit form with client-side validation. Rendered inside every team card on `/portal`.

## Problem Statements (Phase 9)

Organizer-published challenges that teams browse publicly and adopt during registration.

**Backend**
- **Migration `0005_problem_statements`** — `problem_statements` table (`title`, `summary`, `description`, `track`, `difficulty` easy/medium/hard, optional `sponsor`, `published` flag) **seeded** with six sample challenges across all tracks.
- **Routes** (`app/api/v1/problems.py`):
  | Method | Path | Auth | Description |
  | ------ | ---- | ---- | ----------- |
  | GET | `/api/problems?track=` | public | Published statements, optional track filter |
  | GET | `/api/problems/{id}` | public | Single published statement |
  | POST / PATCH / DELETE | `/api/problems[/{id}]` | admin | Lifecycle management (draft → publish → retire); drafts 404 publicly |
- **Tests** — `tests/test_problems.py`: published-only browsing, track filter + detail, full admin lifecycle, validation, RBAC guards. Suite: 18 passed.

**Frontend**
- **API module** — `src/api/problemApi.ts`.
- **`/problems` page** — replaces the Phase-9 placeholder: mobile-first card grid with track filter chips, difficulty badges (easy/medium/hard), expandable full briefs, and a register CTA band.
- **Registration Step 3** — after choosing a track, a picker lists that track's published statements; teams can still "Decide at the event" or write their own. The chosen statement title is stored in the existing `problem_statement` field, so no API contract changed.

## FAQ + Rules (Phase 10)

The last public placeholders are real pages, built on the repo's staged-content pattern (`src/data/`) — Phase 14 wires both to admin-managed settings.

- **Content data** — `src/data/faq.ts` (4 categories × ~16 Q&As: eligibility, registration, logistics, judging) and `src/data/rules.ts` (7 numbered sections with `critical` rule flags + last-updated date).
- **`/faq`** — sticky search box filtering across all answers (live match count, empty state with mailto fallback), native `<details>` accordions (accessible, no-JS safe), register CTA band.
- **`/rules`** — horizontally scrollable section-anchor nav, numbered rule lists with highlighted critical rules (e.g., "all code written during the event"), code-of-conduct acceptance footer.
- Header nav "FAQ" / "Rules" links are now live; every public route ships a real page.

## Admin CRM (Phase 11)

Organizer dashboard for triaging registrations and managing problem statements end-to-end.

**Backend**
- **Migration `0006_registration_status`** — `registrations.status` (`pending` default, indexed) + `RegistrationStatusUpdate` schema; every registration response now carries its status.
- **Admin routes** (`get_current_admin` RBAC):
  | Method | Path | Description |
  | ------ | ---- | ----------- |
  | GET | `/api/registration` | Full PII feed (protected since Phase 7), now includes statuses |
  | GET | `/api/registration/{id}` | Single registration detail |
  | PATCH | `/api/registration/{id}/status` | Apply a review decision (`pending/approved/waitlisted/rejected`) |
  | GET | `/api/problems/all` | Every statement incl. drafts (declared before the public `/{id}` route) |
  | GET | `/api/stats/overview` | Aggregates: totals by status/track, members, submissions, statements, users |
- **Tests** — `tests/test_admin_crm.py`: stats shape + counts, status transitions, `/problems/all` visibility incl. drafts, RBAC guards (401/403). Suite: 22 passed.

**Frontend**
- **API modules** — admin methods on `registrationApi` (`adminList/adminGet/adminSetStatus`), full CRUD on `problemApi` (`listAll/create/update/remove`), new `statsApi.overview`; shared status vocabulary in `src/data/status.ts` (labels + badge variants).
- **Guards & chrome** — `RequireAdmin` route guard (organizer/admin only; anonymous → login with return path, others → home) + `useIsOrganizer`; `AdminShell` pathless layout with pill sub-nav.
- **`/admin` dashboard** — headline stat cards (status split), track-distribution bars, latest registrations feed.
- **`/admin/registrations`** — search + status/track filters, detail panel with member roster and one-click review decisions (optimistic-free, server-confirmed).
- **`/admin/problems`** — manage drafts and live statements alike: inline create/edit form, quick publish/unpublish toggle, delete-with-confirm.
- **Wiring** — nested `/admin/*` routes behind the guard; header shows an *Admin* link for organizers; account page swaps the placeholder note for a direct CRM link.




## Gmail Automation (Phase 12)

Transactional email delivered through a durable outbox with a Gmail API client built on the Python standard library (`urllib`) -- no extra runtime dependency.

**Backend**

- Migration `0007_email_messages` -- `email_messages` table (`template`, `to_email`, `subject`, `body`, `status` queued/sent/logged/failed, `error`, `sent_at`) + an outbox service (`app/services/email.py`) that renders plain-text templates, persists a row inside the request session, then dispatches in a background task.
- `app/core/gmail.py` -- Google OAuth 2.0 refresh-token exchange + `gmail.users.messages.send` via stdlib `urllib`. When credentials are unset the outbox runs in "log mode" (recorded as `logged`).
- Decision emails only fire when the review status actually changes; submission confirmations only on first submit (updates never re-send).
- **Routes** (`app/api/v1/emails.py`, organizer/admin only): `GET /api/emails` (log + status filter), `GET /api/emails/{id}`, `POST /api/emails/{id}/resend`.
- **Tests** -- `tests/test_emails.py`: registration confirmation, status decision (no duplicates on same status), submission received (no duplicates on edits), dispatch failure recorded not raised, RBAC + resend. Suite: 5 passed.

**Frontend**

- `src/api/emailsApi.ts` + `/admin/emails` outbox: status filter pills, expandable bodies, one-click resend for failed/logged rows.

## Analytics (Phase 13)

Time-series and funnel analytics for organizers.

**Backend**

- `GET /api/stats/analytics?days=7..90` (organizer/admin) -- zero-filled registrations-over-time, review funnel (registered/approved/waitlisted/rejected/submitted + approval & submission rates), institutions leaderboard, per-track teams/submissions/approved counters, problem-statement adoption, and email delivery health.
- **Tests** -- `tests/test_analytics.py`: RBAC guards, window bounds (422), plus shape-and-math checks that seed approved/pending rows.

**Frontend**

- **`/admin/analytics`** -- window selector (7/14/30/60/90 days), metric cards, funnel breakdown, signup trend bars, track and institution distributions.

## Admin Settings (Phase 14)

**Backend**

- Migration `0008_site_settings` -- `site_settings` key/value table with typed defaults for `event_name`, `tagline`, `registration_open`, `registration_deadline`, `contact_email`, `announcement`.
- Routes: `GET /api/settings/public` (anonymous), `GET/PATCH /api/settings` (admin editor), `DELETE /api/settings/{key}` (reset to default).
- Registration gating: when `registration_open` is `false`, the registration POST is rejected 403 and `/api/registration/meta` exposes the flag.
- **Tests** -- `tests/test_settings.py`: defaults without auth, admin patch + public visibility, validation (deadline/email/empty name), reset behavior, and the gated-when-closed flow.

**Frontend**

- **`/admin/settings`** editor: event facts, registration lifecycle toggle, optional deadline, announcement text.
- **Public wiring** -- `src/hooks/usePublicSettings` fetches `/api/settings/public` once per load (module-level cache, staged-content fallback); its values drive the header brand, the footer, and a live `AnnouncementBanner` in the public layout.

## Security Audit (Phase 15)

- Baseline header set on every API response (`nosniff`, `DENY` framing, strict referrer policy, restrictive `Permissions-Policy`) now also ships `Cache-Control: no-store` (PII), `Cross-Origin-Opener-Policy: same-origin`, and production-only HSTS.
- Signed short-lived access JWT + long-lived refresh JWT, PBKDF2-HMAC-SHA256 (600k iterations) password hashing, per-IP login throttling, and a strong-secret guard for production boots.
- Tests -- `tests/test_security.py`: header assertions, rate-limiter basis, login bucket integration, production secret guard, and HSTS enforcement.

## Testing (Phase 16)

- **Backend** -- full pytest suite: 40 tests across health, registration, auth, teams, submissions, problems, admin CRM, emails, analytics, settings and security pass against the live PostgreSQL database.
- **Frontend** -- `npm run build` runs the strict TypeScript build (also producing the production bundle) and `npm run lint` runs OxLint.

## Mobile Performance (Phase 17)

- Route-level code splitting (React `lazy`) turns every admin page plus the portal, registration, problems, FAQ, rules, login, account and design-system pages into on-demand chunks so the landing page stays lean on mobile connections.
- The existing `usePrefersReducedMotion` + `Reveal` animation layer honours 320px-first and OS motion preferences.

## Final Polish (Phase 18)

- README brought fully up-to-date, root `.gitignore` added, and stale development logs removed from the tree.

## Production Readiness

### Environment

- **Backend** — copy `backend/.env.production.example` to `backend/.env` and fill every value. In production the API refuses to boot with a weak `SECRET_KEY`, serves `/docs` only when `DEBUG=true`, and sends HSTS headers when `ENVIRONMENT=production`.
- **Frontend** — set `VITE_API_BASE_URL` to the deployed API origin at build time; `npm run build` produces the static bundle in `frontend/dist`.

### Database hygiene

The pytest suite creates and deletes real rows, so it **refuses to run** unless
`TEST_DATABASE_URL` points at a disposable database (this protects production data):

```powershell
$env:TEST_DATABASE_URL = "postgresql+psycopg://postgres:postgres@localhost:5432/hackathon_test"
.venv\Scripts\pytest
```

Operational scripts live in `backend/scripts/`:

| Script | Purpose |
| ------ | ------- |
| `reset_production_data.py` | Wipe all teams/users/submissions/emails back to a clean state and bootstrap one admin account (`--admin-email`). Keeps problem statements + site settings. |
| `e2e_smoke_check.py` | Full in-process smoke test: registers two fresh teams via the public flow, signs into the leader portal, submits a project, verifies RBAC, then removes everything it created. |

```powershell
# Clean slate + bootstrap admin (prints a one-time password)
$env:PYTHONPATH = (Get-Location).Path
.\venv\Scripts\python.exe scripts\reset_production_data.py --admin-email you@example.com

# Post-deploy smoke check
.\venv\Scripts\python.exe scripts\e2e_smoke_check.py <admin-email> <admin-password>
```

## Phase Checklist

All 18 phases are implemented and validated:

1. [x] **Phase 1 -- Project Foundation**
2. [x] **Phase 2 -- Mobile-First Design System**
3. [x] **Phase 3 -- Public Home Page**
4. [x] **Phase 4 -- 3D + Animation Optimization**
5. [x] **Phase 5 -- Registration**
6. [x] **Phase 6 -- Authentication**
7. [x] **Phase 7 -- Team Portal**
8. [x] **Phase 8 -- Project Submission**
9. [x] **Phase 9 -- Problem Statements**
10. [x] **Phase 10 -- FAQ + Rules**
11. [x] **Phase 11 -- Admin CRM**
12. [x] **Phase 12 -- Gmail Automation**
13. [x] **Phase 13 -- Analytics**
14. [x] **Phase 14 -- Admin Settings**
15. [x] **Phase 15 -- Security Audit**
16. [x] **Phase 16 -- Testing**
17. [x] **Phase 17 -- Mobile Performance**
18. [x] **Phase 18 -- Final Polish**