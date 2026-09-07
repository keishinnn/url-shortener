# URL Shortener

Full-stack URL shortener — Fastify + Postgres backend, React + Vite frontend, Valkey rate-limiting, Nginx load balancing, and Docker-ready deployment. Short codes are generated inside Postgres via trigger with app-level collision retry.

> Repo: `keishinnn/url-shortener`

## Features

- **Create short links** — `POST /api/shorten-url` with `http`/`https` validation, length limits, and global 10 req/min rate limit
- **Resolve & redirect** — `GET /api/shorten-url/:shortCode` → `window.location.assign(originalUrl)` with fallback to home
- **DB-generated codes** — 7-char `md5(random() + clock_timestamp)` in `BEFORE INSERT` trigger; unique index + retry on `P2002` (up to 5 attempts)
- **Rate limiting** — `@fastify/rate-limit` backed by Valkey/Redis (`ioredis`), in-memory fallback for tests
- **Frontend** — React 19 + React Router 8 (`/` create, `/r/:shortCode` redirect), Tailwind CSS 4, `fetchWithTimeout` (10s default, caller `AbortSignal` precedence)
- **Infra** — 3 backend replicas behind Nginx (`least_conn`), Valkey container, host-Postgres guide
- **CI** — GitHub Actions: backend test+build, frontend lint+test+build, Playwright E2E (Chromium), Docker build

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Node 24.8.0, Fastify 5, TypeScript (NodeNext, strict), Prisma 7 + `@prisma/adapter-pg` (pg 8), `tsx`, Valkey via `ioredis` |
| Frontend | React 19, Vite 8, TypeScript, React Router 8, Tailwind CSS 4, lucide-react |
| DB | PostgreSQL, `pg` driver, 4 Prisma migrations (including `generate_short_url()` trigger) |
| Infra | Docker multi-stage, Nginx, Valkey 8-alpine, GitHub Actions (pnpm 10.18.3) |
| Testing | Vitest 5 (node/jsdom, v8 coverage), Testing Library + MSW, Playwright 1.56 |

## Architecture

```
Browser (/ , /r/:shortCode)
   │
   ├── Vite dev / built SPA
   │     ├── Home.tsx  → POST /api/shorten-url  (fetchWithTimeout)
   │     └── RedirectPage.tsx → GET /api/shorten-url/:shortCode → window.location.assign
   │
   ├── Nginx (8080) ──► upstream nodejs_cluster (least_conn)
   │                      ├── backend-1 :3001 ─┐
   │                      ├── backend-2 :3002 ─┼─► Postgres (urls + trigger)
   │                      └── backend-3 :3003 ─┘     └── Valkey (rate-limit)
   │
   └── Direct dev: Frontend 5173 → Backend 3000
```

- **Trigger** `set_short_url BEFORE INSERT ON urls WHEN NEW.short_code IS NULL` calls `generate_short_url()` → `substring(md5(random()::text || clock_timestamp()::text) from 1 for 7)` (`backend/prisma/migrations/20260822121544_add_short_url_trigger/migration.sql`).
- **Service** `backend/src/features/shorten-url/url.service.ts:63` sends only `originalUrl`; Prisma returns trigger-filled row; retries on `P2002`.
- **Routes** mounted at `/api` (`backend/src/app.ts:53`), CORS origin `env.BASE_URL` (`backend/src/app.ts:28`), error handler normalizes 4xx/5xx (`backend/src/app.ts:19`).

## Prerequisites

- Node `24.8.0` (or compatible 24.x)
- `pnpm` `10.18.3` — `npm i -g pnpm@10.18.3`
- PostgreSQL 14+ (local or container)
- Valkey/Redis for rate limiting (optional in dev, required in compose/prod) — or use `buildApp({ redisClient: null })` for in-memory in tests
- Docker + Compose (for replica / Nginx flow)

## Quick Start

### 1. Clone

```bash
git clone https://github.com/keishinnn/url-shortener.git
cd url-shortener
```

### 2. Configure env

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit the files:

**`backend/.env`**

```
DATABASE_URL=postgresql://user:pass@localhost:5432/url_shortener
PORT=3000
BASE_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379
```

> `BASE_URL` must be the **frontend origin** (CORS). `DATABASE_URL` is also read by `prisma.config.ts`. `PORT` defaults to `3000` if omitted.

**`frontend/.env`**

```
VITE_API_URL=http://localhost:3000
VITE_BASE_URL=http://localhost:5173
```

> Vite bakes `VITE_*` at build time — restart dev server after changes.

### 3. Database

```bash
cd backend
pnpm install --frozen-lockfile
pnpm prisma migrate dev   # or pnpm prisma migrate deploy in prod
pnpm prisma generate      # after schema/migration edits
```

### 4. Run (local dev, two terminals)

```bash
# terminal 1 — backend
cd backend
pnpm dev                  # http://localhost:3000

# terminal 2 — frontend
cd frontend
pnpm install --frozen-lockfile
pnpm dev                  # http://localhost:5173
```

Visit `http://localhost:5173` → paste a URL → copy `http://localhost:5173/r/<code>`.

### 5. Docker (3 replicas + Valkey)

```bash
# from repo root or backend/
docker build -t backend:1.0 ./backend
docker compose -f backend/docker-compose.yaml up --build
# backends: 3001, 3002, 3003  |  valkey: 6379
```

For backends to reach **host Postgres**, follow `infrastructure/database/setup.md` (docker gateway `host.docker.internal` / `172.18.0.1`, `postgresql.conf` `listen_addresses`, `pg_hba.conf` `172.18.0.0/16`, restart). Then set `DATABASE_URL` to use the gateway IP.

Optional Nginx (host install or container) — `infrastructure/nginx/nginx.conf:8` expects upstreams `127.0.0.1:3001..3003`, `listen 8080`, `least_conn`.

## Environment Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | yes | — | Postgres connection string. Used by Prisma client and `prisma.config.ts`. |
| `PORT` | no | `3000` | Fastify listen port. Compose/Docker sets `3000` internally. |
| `BASE_URL` | yes | — | Allowed CORS origin (frontend origin). |
| `REDIS_URL` | yes* | — | Valkey/Redis URL for rate-limit. `*`Tests can bypass with `buildApp({ redisClient: null })` or `enableRateLimit:false`. |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | yes | Backend base URL, no trailing slash (e.g. `http://localhost:3000`). Used for API fetch calls. |
| `VITE_BASE_URL` | yes | Frontend origin for display/copy (e.g. `http://localhost:5173`). |

## API

Base path `/api` (`backend/src/app.ts:53`). Both endpoints rate-limited `max: 10 / 1 minute` (`backend/src/features/shorten-url/url.routes.ts:14`).

### `POST /api/shorten-url`

Create a short link.

- **Body** (`backend/src/features/shorten-url/url.schema.ts:3`): `{ "originalUrl": string }` — `1..2048` chars, validated as `http:`/`https:` in service (`url.service.ts:28`).
- **Responses**
  - `201` `{ "shortenUrl": "<7-char code>" }`
  - `400` `{ "message": "Invalid URL" | "Original Url Required" }`
  - `429` rate limit
  - `500` `{ "message": "Internal Server Error" }` or `"Could not generate a unique short code"`

```bash
curl -X POST http://localhost:3000/api/shorten-url \
  -H "Content-Type: application/json" \
  -d '{"originalUrl":"https://example.com/very/long/path"}'
# {"shortenUrl":"a1b2c3d"}
```

### `GET /api/shorten-url/:shortCode`

Resolve a code.

- **Params** (`url.schema.ts:14`): `shortCode` `^[A-Za-z0-9_-]+$`, `1..10` chars.
- **Responses**
  - `200` `{ "originalUrl": "https://..." }`
  - `400` `{ "message": "Short Code Required!" }` / validation error
  - `404` `{ "message": "Short URL not found" }`

```bash
curl http://localhost:3000/api/shorten-url/a1b2c3d
# {"originalUrl":"https://example.com/very/long/path"}
```

Frontend `RedirectPage` (`frontend/src/pages/RedirectPage.tsx:14`) calls this and `window.location.assign`s on success, otherwise `navigate("/")`.

## Scripts

### Backend (`backend/`)

| Script | Description |
|--------|-------------|
| `pnpm dev` | `tsx watch src/server.ts` — dev with reload |
| `pnpm build` | `tsc` → `dist/` |
| `pnpm start` | `node dist/server.js` |
| `pnpm test` | `vitest run` (node env) |
| `pnpm test:watch` | `vitest` watch |
| `pnpm test:coverage` | `vitest run --coverage` (v8) |
| `pnpm prisma generate` | regenerate `src/generated/prisma` |
| `pnpm prisma migrate dev/deploy` | apply migrations |

### Frontend (`frontend/`)

| Script | Description |
|--------|-------------|
| `pnpm dev` | `vite` dev (5173) |
| `pnpm build` | `tsc -b && vite build` |
| `pnpm preview` | `vite preview` |
| `pnpm lint` | `eslint .` (CI-enforced) |
| `pnpm test` | `vitest run` (jsdom) |
| `pnpm test:watch` / `test:coverage` | watch / v8 coverage |
| `pnpm test:e2e` / `test:e2e:ui` | `playwright test` (chromium) |

## Testing

- **Backend** — `vitest` `environment: node`, `src/**/*.test.ts`. Mocks Prisma/Redis; no DB needed. Inject `redisClient` via `buildApp({ redisClient: null })` or `enableRateLimit: false` to avoid Valkey.
- **Frontend unit** — `vitest` `environment: jsdom`, `src/test/setup.ts`, excludes `e2e/**`. Stack: `@testing-library/react`, `msw`. Notable: `fetchWithTimeout.test.ts`, `Home.test.tsx`, `RedirectPage.test.tsx`.
- **Frontend E2E** — `playwright` `testDir: ./e2e`, chromium only, `webServer` auto-starts `pnpm dev` (`playwright.config.ts:20`). Requires `pnpm exec playwright install --with-deps chromium` first time.

```bash
cd backend && pnpm test && pnpm build
cd frontend && pnpm lint && pnpm test && pnpm build
cd frontend && pnpm test:e2e
```

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── app.ts / server.ts
│   │   ├── config/env.ts
│   │   ├── lib/prisma.ts
│   │   ├── features/shorten-url/  # routes, controller, service, repository, schema, types
│   │   └── generated/prisma/      # generated client (do not edit)
│   ├── prisma/{schema.prisma,migrations/}
│   ├── Dockerfile                 # multi-stage (base/deps/prod-deps/build/runtime, non-root)
│   └── docker-compose.yaml        # 3 replicas + valkey (ports 3001-3003)
├── frontend/
│   ├── src/{App.tsx,pages/,lib/fetchWithTimeout.ts}
│   ├── e2e/ + playwright.config.ts
│   └── vite.config.ts
├── infrastructure/
│   ├── nginx/nginx.conf           # upstream nodejs_cluster least_conn :3001-3003
│   └── database/setup.md          # host Postgres for Docker
└── .github/workflows/ci.yml       # 4 jobs: backend, frontend, frontend-e2e, backend-image
```

## Infrastructure

- **Dockerfile** (`backend/Dockerfile`) — stages `base` (node:24.8.0-slim, pnpm 10.18.3), `deps`, `prod-deps`, `build` (`prisma generate && build`), `runtime` (non-root `node`, `PORT=3000`).
- **Compose** (`backend/docker-compose.yaml`) — anchor `x-backend` image `backend:1.0`, `env_file: .env`, `extra_hosts: host.docker.internal:host-gateway`, replicas `backend-1..3` on `3001..3003`, `valkey/valkey:8-alpine` with `--save "" --appendonly no`.
- **Nginx** (`infrastructure/nginx/nginx.conf`) — `upstream nodejs_cluster` `least_conn` `127.0.0.1:3001..3003`, `server listen 8080`, proxies with `Host`, `X-Forwarded-For`, `X-Real-IP`.
- **Postgres host setup** — see `infrastructure/database/setup.md` for `listen_addresses`, `pg_hba.conf`, gateway IP discovery.

## CI

`.github/workflows/ci.yml` — triggers on `push` to `master` + all PRs, `concurrency: ci-${{ github.ref }}` cancel-in-progress.

| Job | Steps |
|-----|-------|
| `backend` | `pnpm install --frozen-lockfile`, `prisma generate`, `test`, `build` (dummy `DATABASE_URL`/`REDIS_URL`) |
| `frontend` | `install`, `lint`, `test`, `build` (`VITE_*` dummies) |
| `frontend-e2e` | `install`, `playwright install --with-deps chromium`, `test:e2e`, upload `playwright-report`/`test-results` on failure |
| `backend-image` | `docker/build-push-action` (`context: ./backend`, `push: false`) |

Node `24`, `pnpm/action-setup@v4` `10`, `cache: pnpm`.

## Database

- Prisma schema `backend/prisma/schema.prisma:10` — `model Url` → table `urls`, `shortCode` nullable `VarChar(10)` for trigger, unique index.
- Migrations in `backend/prisma/migrations/` — do not squash/rename. Apply with `pnpm prisma migrate dev` (creates) / `pnpm prisma migrate deploy` (prod).
- Client output `backend/src/generated/prisma/` — never edit; regenerate via `pnpm prisma generate`.

## Useful Paths

- App factory & hooks: `backend/src/app.ts:13`
- Env accessor: `backend/src/config/env.ts:3`
- Collision retry: `backend/src/features/shorten-url/url.service.ts:63`
- Fetch timeout (signal precedence): `frontend/src/lib/fetchWithTimeout.ts:27`
- Nginx upstream: `infrastructure/nginx/nginx.conf:8`
- CI: `.github/workflows/ci.yml:14`

## Contributing

- Keep `pnpm-lock.yaml` in sync (CI uses `--frozen-lockfile`).
- Conventional commits (`feat:`, `fix:`, `test:`, `ci:` …) preferred — see `git log --oneline`.
- Run `pnpm lint` (frontend) and `pnpm test` + `pnpm build` in touched packages before PR.
- Do not commit `.env`; update `.env.example` instead. Do not edit `src/generated/**`.

