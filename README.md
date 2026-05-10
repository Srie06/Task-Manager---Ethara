# Team Task Manager

Full-stack team task manager built as a monorepo with:

- **Backend**: Node.js + Express + PostgreSQL (`pg`) + JWT + bcrypt
- **Frontend**: Next.js 14 + Tailwind CSS + shadcn/ui-style components

Architecture adds **hierarchical roles** (`admin`, `pl`, `qr`, `tasker`, `member`), **rubrics** attached to projects, richer **task payloads** (prompt / pairwise responses / scoring), and a **submit → QR review** workflow with **hard approval validation**.

## Project structure

```text
/backend
/frontend
```

## Database

### New databases (greenfield)

Apply `backend/schema.sql`.

### Existing installations

Run additive migration SQL (no drops):

```bash
psql "$DATABASE_URL" -f backend/migrations/001_ethara_scale.sql
```

If PostgreSQL named your original CHECK constraints differently than `users_role_check` / `tasks_status_check`, adjust `DROP CONSTRAINT` lines accordingly (discover with `\d+ users` / `\d+ tasks`).

## Features

- JWT authentication (`signup` / `login`) with optional **parent assignment** for `tasker` → `qr` and `qr` → `pl`
- Hierarchy-aware task visibility (scoped listings for `tasker`, `qr`, `pl`; global for `admin`)
- Rubric catalog + optional inline rubric creation when creating a project
- Tasks support Ethara-style fields and reviewer workflow
- Dashboard adapts to role (QR pending review counts, scoped tables, extended status chart)

## Local setup

### Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### Environment variables

#### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
JWT_SECRET=your-super-secret
PORT=5000
```

#### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Deployed frontend example:

```env
NEXT_PUBLIC_API_URL=https://your-railway-url
```

### Run

```bash
# terminal 1 — API
cd backend && npm run dev

# terminal 2 — web
cd frontend && npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

## API endpoints

### Auth / hierarchy helpers

- `GET /api/auth/parent-options?forRole=tasker|qr`
- `POST /api/auth/signup`
- `POST /api/auth/login`

### Rubrics (`admin` / `pl`)

- `GET /api/rubrics`
- `POST /api/rubrics`

### Projects (auth required)

- `GET /api/projects`
  - `admin` / `pl`: all projects
  - Others: member/owner visibility (unchanged semantics)
- `POST /api/projects` (**`admin` / `pl`**)
  - Body may include `rubric_id` **or** `{ rubric: { name, version?, guides... } }`
- `GET /api/projects/:id`
- `PUT /api/projects/:id` (**`admin` / `pl`**) — supports `rubric_id`
- `DELETE /api/projects/:id` (**`admin` + owner**)
- Member management routes (**`admin` / `pl`**)

### Tasks (auth required)

- `GET /api/tasks?project_id=`
- `POST /api/tasks` (**`admin` / `pl`**)
- `PUT /api/tasks/:id/submit` — **assigned `tasker` only**, transitions `in_progress → submitted`, enforces rationale ≥ 20 chars, logs structured notification for the tasker’s QR parent
- `PUT /api/tasks/:id/review` — **`qr` only**, transitions `submitted → approved|rejected`
  - Approvals require numeric scores (1–7) on the request and must satisfy the approval gate server-side
- `PUT /api/tasks/:id`
  - **`admin` / `pl`**: full edit (still blocked from silently approving without gate)
  - Others: single-step status edits on legacy states only (cannot jump to `submitted`; pipeline locked after submission)
- `DELETE /api/tasks/:id` (**`admin` / `pl`**)

### Dashboard (auth required)

- `GET /api/dashboard`

Returns:

- `totalTasks`, `byStatus` (extended keys), `overdue`, `myTasks`, `scopedTasks`, `pendingReviewCount` (meaningful for QR), `completionRate`.

## Approval gate (server enforced)

When `status = approved`:

- All of `factuality_score`, `helpfulness_score`, `safety_score` populated (1–7)
- `rationale` trimmed length ≥ `20`
- `reviewed_by` populated (set automatically via `/review` or editable by leads)

Violations return `400`.

## Deployment

### Backend

- `npm run start`
- Uses `DATABASE_URL`, `process.env.PORT`, `Procfile` (`web: node server.js`)

### Frontend

- Uses `NEXT_PUBLIC_API_URL`

## Live URLs

- Backend: `<your-live-backend-url>`
- Frontend: `<your-live-frontend-url>`
