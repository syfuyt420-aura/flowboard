# FlowBoard — Team Intelligence Platform

A production-grade, full-stack project management SaaS built with React 18, Node.js 20, TypeScript, Prisma, Redis, and Socket.IO.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · Vite 5 · TypeScript · Tailwind CSS · Shadcn/UI · Framer Motion |
| State | TanStack Query v5 · Zustand · Socket.IO client |
| Drag & Drop | @dnd-kit/core · @dnd-kit/sortable |
| Charts | Recharts |
| Backend | Node.js 20 · Express · TypeScript · Prisma ORM |
| Database | PostgreSQL 15 |
| Cache / Queue | Redis 7 · Bull |
| Real-time | Socket.IO |
| Auth | JWT (access + refresh tokens) · bcrypt · HTTP-only cookies |
| Validation | Zod (shared between frontend and backend) |
| Email | Nodemailer · Bull queue |

## Project Structure

```
flowboard/
├── apps/
│   ├── frontend/          # React + Vite SPA
│   └── backend/           # Express API + Socket.IO
├── packages/
│   └── shared/            # Zod schemas + TypeScript types
├── docker-compose.yml
├── render.yaml            # Render.com deployment config
└── README.md
```

## Local Development

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### 1. Clone and install

```bash
git clone <repo-url>
cd flowboard
npm install
```

### 2. Start infrastructure

```bash
docker compose up postgres redis -d
```

### 3. Configure environment

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Edit `apps/backend/.env` — set your JWT secrets (min 32 chars).

### 4. Set up the database

```bash
# Push the schema to the database (first time)
npm run db:push --workspace=apps/backend

# Or create a tracked migration
npm run db:migrate --workspace=apps/backend
# Enter a migration name e.g. "init"

# Optional: seed demo data
npm run db:seed --workspace=apps/backend
```

### 5. Run the app

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API health: http://localhost:3001/api/health

---

## Deployment

### Frontend → Vercel (recommended)

1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Set **Root Directory** to `apps/frontend`
4. Add environment variable: `VITE_API_BASE_URL=https://your-api.onrender.com`
5. Deploy

### Backend → Render.com (recommended)

**Option A — One-click via `render.yaml`**

1. Push repo to GitHub
2. Go to [render.com](https://render.com) → New → Blueprint
3. Connect your repo — Render auto-reads `render.yaml`
4. Set the remaining env vars (SMTP credentials, etc.)
5. Deploy

**Option B — Manual service**

1. New Web Service → connect repo
2. Runtime: **Docker**
3. Dockerfile path: `apps/backend/Dockerfile`
4. Docker context: `.` (repo root)
5. Add env vars from `apps/backend/.env.example`
6. Add a PostgreSQL and Redis instance from Render dashboard

### Full stack with Docker Compose

```bash
# Copy env files first
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

docker compose up --build
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

---

## Environment Variables

### Backend (`apps/backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `JWT_ACCESS_SECRET` | ✅ | Min 32 chars, randomly generated |
| `JWT_REFRESH_SECRET` | ✅ | Min 32 chars, randomly generated |
| `FRONTEND_URL` | ✅ | CORS origin (e.g. `https://app.flowboard.app`) |
| `SMTP_HOST` | optional | Email sending (e.g. `smtp.gmail.com`) |
| `SMTP_USER` | optional | Email account |
| `SMTP_PASS` | optional | App password |
| `OPENAI_API_KEY` | optional | AI task breakdown feature |
| `SENTRY_DSN` | optional | Error monitoring |

### Frontend (`apps/frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API URL (e.g. `https://api.flowboard.app`) |
| `VITE_SENTRY_DSN` | Optional Sentry DSN |

---

## Key Features

- **Kanban Board** — drag-and-drop tasks across columns with live updates
- **Task Detail** — inline editing, comments, activity log, time tracking
- **Analytics** — velocity charts, status distribution, team workload
- **Real-time** — presence tracking, live task updates via Socket.IO
- **Command Palette** — ⌘K search across projects and tasks
- **Dark Mode** — system-aware with manual override
- **Role-based Access** — Owner → Admin → Project Manager → Member → Viewer
- **Email Queue** — async email delivery via Bull + Nodemailer

## Database Migrations

```bash
# Development: create a new migration
npm run db:migrate --workspace=apps/backend

# Production: apply pending migrations
npm run db:migrate:prod --workspace=apps/backend

# Push schema without migration history (fast iteration)
npm run db:push --workspace=apps/backend
```

## API Reference

All endpoints are prefixed with `/api/v1`.

| Resource | Endpoints |
|---|---|
| Auth | `POST /auth/signup` `POST /auth/login` `POST /auth/refresh` `GET /auth/me` |
| Workspaces | `GET /workspaces` `POST /workspaces` `GET /workspaces/:id/members` `POST /workspaces/:id/invite` |
| Projects | `GET /projects` `POST /projects` `PATCH /projects/:id` `DELETE /projects/:id` |
| Tasks | `GET /tasks` `POST /tasks` `PATCH /tasks/:id` `POST /tasks/:id/move` |
| Notifications | `GET /notifications` `PATCH /notifications/:id/read` |
| Analytics | `GET /analytics/dashboard` `GET /analytics/workload` |
| Search | `GET /search?q=` |
| Health | `GET /api/health` |
