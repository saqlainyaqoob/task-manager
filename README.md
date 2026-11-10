# Task Manager — REST API and Authentication Project

Learn REST APIs by reading and running a tiny full-stack app:
**React (Vite + Tailwind v4) → fetch → Express → pg → PostgreSQL**, with a glassmorphism UI, optional accounts (JWT) and guest mode.

## Table of contents
1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Folder structure](#folder-structure)
4. [Prerequisites](#prerequisites)
5. [Environment variables](#environment-variables)
6. [Database setup](#database-setup)
7. [Run the project](#run-the-project)
8. [How a request travels](#how-a-request-travels)
9. [Authentication and authorization](#authentication-and-authorization)
10. [API endpoints](#api-endpoints)
11. [Test with curl](#test-with-curl)
12. [Learning guide](#learning-guide)
13. [Common errors](#common-errors)
14. [Deployment notes](#deployment-notes)
15. [Security notes and next steps](#security-notes-and-next-steps)

---

## Features
- **Tasks (CRUD):** create, view, edit, complete/un-complete and delete tasks.
- **Guest mode:** use the app without an account. Tasks are stored in PostgreSQL under a random guest id kept in your browser.
- **Accounts:** sign up, sign in, edit your profile name, log out. Tasks then belong to your account and follow you across devices.
- **Guest → account migration:** when a guest signs up or signs in, their guest tasks are moved into the account.
- **Authorization:** every task query is filtered by owner, so users can only see and change their own tasks.
- **UI:** glassmorphism design on a gradient background, sidebar with completed and recently added tasks, progress bar, filters (All / To do / Done), icons for complete, edit, delete and restore, loading indicators, success and error messages, empty states.
- **Centralized error handling** and basic input validation on the server.

## Tech stack
| Layer | Tools |
|---|---|
| Backend | Node.js, Express 5, `pg` (no ORM), `dotenv`, `cors`, `bcryptjs`, `jsonwebtoken` |
| Database | PostgreSQL (local, Docker, or Neon) |
| Frontend | React 19, Vite, Tailwind CSS v4, plain JavaScript, native `fetch()` |

## Folder structure
```
task-manager/
├── backend/
│   ├── server.js                      # starts Express, wires middleware + routes
│   ├── routes/ (taskRoutes.js, authRoutes.js)   # URL + method -> controller
│   ├── controllers/ (taskController.js, authController.js)
│   ├── config/db.js                   # PostgreSQL connection pool
│   ├── middleware/ (auth.js, errorHandler.js)  # who is calling + errors
│   ├── db/schema.sql                  # creates the users and tasks tables
│   └── .env.example
└── frontend/
    ├── vite.config.js                 # Tailwind plugin + /api proxy
    └── src/ (api.js, App.jsx, Sidebar, TaskItem, AuthModal, ProfileModal, Icons, index.css)
```

| File | Why it exists |
|---|---|
| `server.js` | Configures Express (CORS, JSON parsing, routes, error handlers) and starts listening. Exits if `JWT_SECRET` is missing. |
| `routes/*` | Maps "HTTP method + URL" to a controller function. |
| `controllers/taskController.js` | Validates input, runs SQL, sends responses for tasks. |
| `controllers/authController.js` | Register, login, get/update profile. Hashes passwords and signs tokens. |
| `middleware/auth.js` | `identify` decides who is calling (user or guest). `requireAuth` blocks guests. |
| `middleware/errorHandler.js` | One place that turns errors into consistent JSON. |
| `config/db.js` | Creates the PostgreSQL pool. |
| `db/schema.sql` | Creates and upgrades the tables. Safe to run more than once. |
| `frontend/src/api.js` | Central fetch helper. Adds the token or guest id to every request. |

## Prerequisites
Node.js 20+, and PostgreSQL: a local install, Docker, **or** a free Neon database.

## Environment variables
Copy `backend/.env.example` to `backend/.env`. Never commit `.env`.

| Variable | Purpose |
|---|---|
| `PORT` | Backend port (default `5001`). |
| `DATABASE_URL` | Full connection string (use this for Neon). When set, the `DB_*` values below are ignored. |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Local PostgreSQL settings, used only when `DATABASE_URL` is empty. `DB_HOST` must be a host name such as `localhost`, never a full URL. |
| `CLIENT_ORIGIN` | Frontend URL allowed by CORS, e.g. `http://localhost:5173`. |
| `JWT_SECRET` | Secret that signs login tokens. **Required.** Generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d`. |

Local example:
```env
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=task_manager
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=paste_a_long_random_value_here
JWT_EXPIRES_IN=7d
```

Neon example (replace the `DB_*` lines with one `DATABASE_URL`):
```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
```

## Database setup

### Tables
| Table | Purpose | Key columns |
|---|---|---|
| `users` | Accounts and profiles | `id`, `name`, `email` (unique), `password_hash`, `created_at` |
| `tasks` | App data | `id`, `title`, `description`, `completed`, `completed_at`, `created_at`, `user_id`, `guest_id` |

A user has many tasks (`tasks.user_id` → `users.id`, `ON DELETE CASCADE`). A task belongs to **either** a user **or** a guest (`guest_id`), never both. Passwords are stored only as bcrypt hashes.

### Option A — existing local PostgreSQL (run from `task-manager/backend`)
```bash
psql -U postgres -c "CREATE DATABASE task_manager;"
psql -U postgres -d task_manager -f db/schema.sql
```

### Option B — Docker
```bash
docker run --name tasks-pg -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=task_manager -p 5432:5432 -d postgres:16
docker exec -i tasks-pg psql -U postgres -d task_manager < db/schema.sql
```

### Option C — Neon (hosted PostgreSQL)
1. Sign up at neon.com and create a project. Pick the region closest to where your backend runs.
2. Copy the connection strings from the dashboard. The **pooled** one has `-pooler` in the host. Use it for the app (`DATABASE_URL`). The direct one is for migrations and admin work.
3. Open **SQL Editor**, make sure the selected branch and database match your URL, paste all of `db/schema.sql` and run it. Tables start empty, which is normal. Check with:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   ```
4. Put `DATABASE_URL` in `backend/.env` (one `?`, one `sslmode`, no spaces):
   ```
   DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
   ```

### `backend/config/db.js`
Uses `DATABASE_URL` when present and the `DB_*` variables otherwise. The extra timeout lines help when the database is far away (Node's default per-address timeout of 250 ms can be too short and causes `ETIMEDOUT` even though the network works).
```js
require('dotenv').config();
require('net').setDefaultAutoSelectFamilyAttemptTimeout(5000); // wait up to 5s per address
const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 })
  : new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

module.exports = pool;
```

Re-running `db/schema.sql` upgrades an existing database (adds `users`, `completed_at`, `user_id`, `guest_id`). Old tasks created before the upgrade have no owner and will not show up.

## Run the project
Use two terminals.

**Terminal 1 — backend (in `backend/`)**
```bash
npm install
cp .env.example .env      # then set your database settings and a random JWT_SECRET
npm run dev               # http://localhost:5001
```
You should see `API running on http://localhost:5001`. Run only one backend at a time, or you get `EADDRINUSE`.

**Terminal 2 — frontend (in `frontend/`)**
```bash
npm install
npm run dev               # http://localhost:5173
```
Vite forwards every `/api` request to `http://localhost:5001` (see `vite.config.js`), so the browser only talks to one origin.

## How a request travels
Example: ticking a checkbox as a **logged-in user**.

```
React (TaskItem)  → api.patchTask(1, { completed: true })
api.js            → fetch PATCH /api/tasks/1   + Authorization: Bearer <token> + JSON body
Vite proxy        → forwards to Express on port 5001
Express           → cors → express.json() (fills req.body)
taskRoutes        → identify() verifies the token, sets req.user
                  → router matches PATCH /:id → controller updateTask
Controller        → validates body, then runs
                    UPDATE tasks SET ... WHERE id = $2 AND user_id = $3 RETURNING *
PostgreSQL        → returns the updated row (or nothing if it isn't yours)
Controller        → 200 { "data": row }   (or 404 if no row matched)
api.js            → parses JSON → React re-fetches the list and re-renders
```
For a **guest**, the same flow uses the `X-Guest-Id` header and `guest_id = $3` instead.

---

## Authentication and authorization

**Authentication** answers "who are you?" **Authorization** answers "what are you allowed to do?"
In this project everyone may use the app, so the rule is simple: *you may only touch your own tasks*.

### Two kinds of callers
| Caller | Sent by the browser | Server sets | Tasks stored with |
|---|---|---|---|
| **Guest** | `X-Guest-Id: <random id>` | `req.guestId` | `guest_id` |
| **Logged-in user** | `Authorization: Bearer <JWT>` | `req.user = { id }` | `user_id` |

### Where each part lives
| Concern | File | What it does |
|---|---|---|
| Identify the caller | `backend/middleware/auth.js` → `identify` | Reads the token or guest id. Bad token → `401`. Neither → `400`. |
| Require a login | `backend/middleware/auth.js` → `requireAuth` | Used on `/api/auth/me`. Guests get `401`. |
| Apply to all task routes | `backend/routes/taskRoutes.js` | `router.use(identify)` runs before every task route. |
| Register / login / profile | `backend/controllers/authController.js` | Validates input, hashes passwords, signs tokens. |
| Ownership checks (authorization) | `backend/controllers/taskController.js` → `owner()` | Adds the owner filter to every query. |
| Store the token and guest id | `frontend/src/api.js` | Keeps `tm_token` and `tm_guest` in `localStorage` and sends them with every request. |
| Restore the session | `frontend/src/App.jsx` | On page load, calls `GET /api/auth/me` if a token exists. |
| Sign up / sign in UI | `frontend/src/AuthModal.jsx` | Calls register or login, saves the token. |
| Profile UI | `frontend/src/ProfileModal.jsx` | Shows stats, edits the name, logs out. |

### How it works, step by step

**1. Guest use (no account).** `api.js` creates a random id the first time the app loads and saves it in `localStorage` as `tm_guest`. Every request carries it in `X-Guest-Id`. The server stores new tasks with that `guest_id` and only returns tasks that match it.

**2. Register.** `POST /api/auth/register` with `{ name, email, password }`.
- The server validates the input (name up to 80 characters, valid email, password at least 8 characters).
- The password is hashed with **bcrypt** (`bcryptjs`, cost 10). The plain password is never stored.
- The user row is inserted. A duplicate email violates the unique constraint and returns `409`.
- The browser also sends its `guestId`. The server runs `UPDATE tasks SET user_id = ..., guest_id = NULL WHERE guest_id = ...`, so guest tasks become the user's tasks.
- The server signs a **JWT** and returns `{ token, user }`.

**3. Login.** `POST /api/auth/login` with `{ email, password }`.
- The server looks up the email (stored lowercase) and compares the password with `bcrypt.compare`.
- "No such email" and "wrong password" return the **same** `401 Invalid email or password`, so attackers can't learn which emails exist.
- On success it claims guest tasks (same as register) and returns `{ token, user }`.

**4. The token (JWT).** A signed string `header.payload.signature`. The payload holds the user id (`sub`) and an expiry. It is signed with `JWT_SECRET` and lasts `JWT_EXPIRES_IN` (default 7 days). Anyone can read a JWT, but nobody can change it without the secret, so the server trusts it only if the signature checks out. The frontend stores it as `tm_token` in `localStorage`.

**5. Every later request.** `api.js` adds `Authorization: Bearer <token>`. `identify()` verifies the signature and expiry, then sets `req.user = { id }`. If the token is invalid or expired, the server returns `401`, and `api.js` deletes the token and shows "Session expired. Please sign in again."

**6. Authorization (ownership).** Every task query includes an owner filter built by `owner()` in `taskController.js`:
```sql
-- logged-in user
SELECT * FROM tasks WHERE id = $1 AND user_id = $2
-- guest
SELECT * FROM tasks WHERE id = $1 AND guest_id = $2 AND user_id IS NULL
```
If a task belongs to someone else, no row matches and the API returns `404`, exactly as if it didn't exist. The values are always passed as `$1, $2` parameters, never pasted into the SQL text.

**7. Session restore.** When the page loads, `App.jsx` checks for a saved token and calls `GET /api/auth/me`. If it succeeds, the user is logged in. If not (expired token, deleted account), the token is cleared and the app falls back to guest mode.

**8. Logout.** The frontend deletes `tm_token`, clears the user state and reloads tasks as a guest. Tokens are stateless, so the server keeps no session to destroy. Because your guest tasks were moved into the account at login, the guest list will be empty after logout.

### Auth flow at a glance
```
Guest ──X-Guest-Id──────────────────────────────┐
                                                                                                             ▼
Register/Login ──► bcrypt + JWT ──► token ──► identify() ──► req.user / req.guestId
                       ▲                                           │
        guest tasks moved to the account       ▼
                                                  controller adds owner filter to SQL
```

---

## API endpoints
Success responses look like `{ "data": ... }`; errors like `{ "error": "message" }`.

### Auth endpoints
| Method | URL | Body | Success | Errors |
|---|---|---|---|---|
| POST | /api/auth/register | `{name, email, password(min 8)}` | 201 `{data:{token,user}}` | 400, 409 |
| POST | /api/auth/login | `{email, password}` | 200 `{data:{token,user}}` | 400, 401 |
| GET | /api/auth/me | token required | 200 | 401 |
| PATCH | /api/auth/me | `{name}` (token required) | 200 | 400, 401 |

### Task endpoints
Task endpoints need either a token or an `X-Guest-Id` header (8–64 letters, digits or hyphens).

| Method | URL | Body | Success | Errors |
|---|---|---|---|---|
| GET | /api/tasks | none (optional `?completed=true`) | 200 | 400, 401, 500 |
| GET | /api/tasks/:id | none | 200 | 400, 401, 404 |
| POST | /api/tasks | `{title, description?, completed?}` | 201 | 400, 401 |
| PUT | /api/tasks/:id | `{title, description?, completed?}` (replaces all) | 200 | 400, 401, 404 |
| PATCH | /api/tasks/:id | any of `title, description, completed` | 200 | 400, 401, 404 |
| DELETE | /api/tasks/:id | none | 204 (no body) | 400, 401, 404 |

A task object looks like this:
```json
{
  "id": 1,
  "title": "Learn REST",
  "description": "Read the README",
  "completed": false,
  "created_at": "2026-11-10T10:00:00.000Z",
  "completed_at": null,
  "user_id": null,
  "guest_id": "my-test-guest-1"
}
```
`completed_at` is set when a task becomes completed and cleared when it is reopened. The sidebar uses it to order the completed list.

### Endpoint details
**GET /api/tasks** — returns all your tasks, newest first. `?completed=true` or `?completed=false` filters them (a query parameter).
Response `200`: `{ "data": [ {task}, {task} ] }`

**GET /api/tasks/:id** — returns one task. `:id` is a URL parameter and must be a positive integer.
Response `200`: `{ "data": {task} }` · `400` bad id · `404` not found or not yours.

**POST /api/tasks** — creates a task. Required: `title` (non-empty string, max 200 characters). Optional: `description` (string), `completed` (boolean).
Request body: `{ "title": "Buy milk", "description": "2 liters" }`
Response `201`: `{ "data": {task} }` · `400` with a message such as `title is required (non-empty string, max 200 chars)`.

**PUT /api/tasks/:id** — replaces the editable fields. Missing optional fields reset to defaults (`description` becomes `""`, `completed` becomes `false`). Same validation as POST.
Response `200`: `{ "data": {task} }` · `404` not found.

**PATCH /api/tasks/:id** — changes only the fields you send (at least one of `title`, `description`, `completed`).
Request body: `{ "completed": true }`
Response `200`: `{ "data": {task} }` · `400` if the body is empty or a field has the wrong type.

**DELETE /api/tasks/:id** — deletes a task. Response `204` with no body · `404` not found.

**POST /api/auth/register** — Request: `{ "name": "Ada", "email": "ada@example.com", "password": "secret123" }`
Response `201`:
```json
{ "data": { "token": "eyJhbGciOi...", "user": { "id": 1, "name": "Ada", "email": "ada@example.com", "created_at": "2026-11-10T10:00:00.000Z" } } }
```
`400` invalid input · `409` email already registered.

**POST /api/auth/login** — Request: `{ "email": "ada@example.com", "password": "secret123" }` · Response `200` in the same shape as register · `401 Invalid email or password`.

**GET /api/auth/me** — needs `Authorization: Bearer <token>`. Response `200`: `{ "data": {user} }` · `401` if the token is missing, invalid, expired or the account no longer exists.

**PATCH /api/auth/me** — Request: `{ "name": "Ada Lovelace" }` · Response `200`: `{ "data": {user} }` · `400` invalid name · `401` not logged in.

## Test with curl
Task requests need an identity. The examples below use a guest id; for a logged-in user, replace the header with `-H "Authorization: Bearer $TOKEN"`.

```bash
# Create a task as a guest
curl -i -X POST localhost:5001/api/tasks \
  -H "Content-Type: application/json" -H "X-Guest-Id: my-test-guest-1" \
  -d '{"title":"Learn REST","description":"Read the README"}'
# 201 {"data":{"id":1,"title":"Learn REST","description":"Read the README","completed":false,"created_at":"...","completed_at":null,"user_id":null,"guest_id":"my-test-guest-1"}}

curl -i localhost:5001/api/tasks   -H "X-Guest-Id: my-test-guest-1"
curl -i localhost:5001/api/tasks/1 -H "X-Guest-Id: my-test-guest-1"
curl -i -X PATCH  localhost:5001/api/tasks/1 -H "Content-Type: application/json" -H "X-Guest-Id: my-test-guest-1" -d '{"completed":true}'
curl -i -X PUT    localhost:5001/api/tasks/1 -H "Content-Type: application/json" -H "X-Guest-Id: my-test-guest-1" -d '{"title":"New title"}'
curl -i -X DELETE localhost:5001/api/tasks/1 -H "X-Guest-Id: my-test-guest-1"   # 204, no body
curl -i localhost:5001/api/tasks/999 -H "X-Guest-Id: my-test-guest-1"            # 404 {"error":"Task 999 not found"}
curl -i -X POST localhost:5001/api/tasks -H "Content-Type: application/json" -H "X-Guest-Id: my-test-guest-1" -d '{}'   # 400
curl -i localhost:5001/api/tasks                                                 # 400 no identity header
```

Authentication:
```bash
# Register (201 returns a token)
curl -i -X POST localhost:5001/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com","password":"secret123"}'

# Login and keep the token in a shell variable
TOKEN=$(curl -s -X POST localhost:5001/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","password":"secret123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")

curl -i localhost:5001/api/auth/me    -H "Authorization: Bearer $TOKEN"   # 200
curl -i localhost:5001/api/tasks      -H "Authorization: Bearer $TOKEN"   # 200, only your tasks
curl -i localhost:5001/api/auth/me                                         # 401 (no token)
curl -i localhost:5001/api/tasks      -H "Authorization: Bearer not-a-token"  # 401
```

Authorization check: create a task as a guest, then try to read it with a token (or with another guest id). You get `404`, because the owner filter hides other people's tasks.

In Postman/Insomnia use the same URLs with a JSON body, and add the header under **Headers** (or **Authorization → Bearer Token**).

## Learning guide
Request journey: see [How a request travels](#how-a-request-travels).

1. **REST API:** a server exposing *resources* (tasks) at URLs, manipulated with standard HTTP methods, exchanging JSON.
2. **Endpoints/routes:** a method + path pair, e.g. `GET /api/tasks/:id` (`routes/taskRoutes.js`).
3. **Methods:** GET reads · POST creates · PUT replaces everything · PATCH changes some fields · DELETE removes. Compare `replaceTask` and `updateTask` in the controller.
4. **Inputs:** URL params `/tasks/5` → `req.params.id`; query params `?completed=true` → `req.query.completed`; headers (`Content-Type: application/json`, `Authorization`, `X-Guest-Id`) → `req.headers`; body → `req.body`.
5. **Express:** each request passes through middleware in order (`cors`, `express.json`, router, `notFound`, `errorHandler`); handlers reply with `res.status(...).json(...)`.
6. **JSON:** text data format. The frontend sends `JSON.stringify(obj)` and reads `res.json()` (`api.js`).
7. **Status codes:** 2xx success (200, 201, 204), 4xx client mistake (400 bad input, 401 not authenticated, 404 not found, 409 conflict), 5xx server fault (500).
8. **Node ↔ PostgreSQL:** `config/db.js` creates a `Pool`; controllers call `pool.query(sql, values)`.
9. **CRUD in SQL:** INSERT (create), SELECT (read), UPDATE (update), DELETE (delete).
10. **Parameterized queries:** `WHERE id = $1` with `[id]` keeps data apart from SQL. If you built the string by concatenation, input like `1; DROP TABLE tasks` could become SQL.
11. **Forms:** `onSubmit` → `preventDefault()` → `api.createTask(form)` → server saves → UI re-fetches.
12. **Testing without the UI:** use the curl commands above.
13. **Debugging:** read the backend terminal first, then the browser Network tab (status and response body), then inspect data with `psql -d task_manager -c "SELECT * FROM tasks;"`.
14. **Authentication vs authorization:** authentication proves who you are (`identify`, login). Authorization limits what you can do (the owner filter on every query).
15. **Password hashing:** bcrypt turns a password into a one-way hash with a random salt. At login the server hashes the attempt and compares. Read `register` and `login` in `authController.js`.
16. **JWT:** a signed token the client sends back on each request, so the server needs no session storage. Try pasting a token into jwt.io to see its payload, then change one character and watch verification fail.
17. **Middleware:** functions that run before your controller. `identify` is middleware that turns headers into `req.user` or `req.guestId`.
18. **Foreign keys and cascades:** `tasks.user_id REFERENCES users(id) ON DELETE CASCADE` makes the database remove a user's tasks when the user is deleted.

## Common errors
| Symptom | Cause / fix |
|---|---|
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL isn't running, or wrong `DB_HOST`/`DB_PORT`. |
| `password authentication failed` | Wrong password in `DB_PASSWORD` or inside `DATABASE_URL`. Copy the string again from Neon, or reset the role password. |
| `database "task_manager" does not exist` | Run the `CREATE DATABASE` command, or fix the database name at the end of your URL. |
| `relation "tasks" does not exist` | Run `db/schema.sql` on the **same** database and branch that your URL points to. |
| `column "user_id" does not exist` | Re-run `db/schema.sql` to upgrade the table. |
| `Missing JWT_SECRET` on start | Add `JWT_SECRET` to `backend/.env`. |
| `400 Send an Authorization token or an X-Guest-Id header` | Task curl calls need `-H "X-Guest-Id: any-8-char-id"` or a Bearer token. |
| `401 Invalid or expired token` | Log in again. Check that `JWT_SECRET` hasn't changed since the token was issued. |
| `401 Invalid email or password` | Wrong credentials. Emails are case-insensitive, passwords are not. |
| `409 That email is already registered` | Use Sign in instead, or another email. |
| `400 Invalid JSON body` | Malformed JSON, or missing `Content-Type: application/json`. |
| Network/CORS error in browser | Backend not running on port 5001, or `CLIENT_ORIGIN` mismatch. |
| `EADDRINUSE :5001` | Another backend is still running. Stop it with Ctrl+C or `kill <PID>` (find it with `ss -ltnp \| grep 5001`), or change `PORT` in `backend/.env` and the proxy in `vite.config.js`. |
| "Internal server error" popup in the UI | The request reached Express but the database call failed. Read the backend terminal for the real error. |
| `ETIMEDOUT` to Neon although `nc -vz HOST 5432` succeeds | Node's short per-address timeout. Use the `db.js` above with `setDefaultAutoSelectFamilyAttemptTimeout`. IPv6 `ENETUNREACH` lines in the same log are harmless. |
| `getaddrinfo ... Name or service not known` | The host in the URL is mistyped, cut off, or still a placeholder. |
| SSL warning about `sslmode=require` | Harmless today. To silence it, end the URL with `?sslmode=verify-full`. |
| Tables look empty in Neon | Tables start empty. Verify with `SELECT COUNT(*) FROM tasks;` and check you are on the right branch/database. |
| Old tasks disappeared after the upgrade | They have no owner (`user_id` and `guest_id` are NULL). Re-create them or assign them with an `UPDATE`. |

## Deployment notes
- Use a separate Neon branch for production and for development, each with its own connection string.
- Set the environment variables in your host's dashboard instead of a `.env` file: `DATABASE_URL`, `JWT_SECRET` (a new random value, different from local), `JWT_EXPIRES_IN`, `CLIENT_ORIGIN` (the deployed frontend URL). The host usually sets `PORT` for you.
- Run `db/schema.sql` once on the production database.
- The frontend calls the relative path `/api`, which only works through the Vite dev proxy. For production, make `api.js` use a configurable base URL, for example `fetch((import.meta.env.VITE_API_URL || '/api') + path, ...)`, and set `VITE_API_URL=https://your-backend-host/api` in the frontend host.
- Serve both sites over **HTTPS** so tokens are not sent in plain text.

## Security notes and next steps
What this project already does: parameterized SQL, bcrypt password hashing, signed tokens with an expiry, owner filtering on every task query, validated input, generic login errors, and no secrets in code.

Known limitations (good next exercises):
- The token lives in `localStorage`, so a cross-site scripting (XSS) bug could expose it. A more hardened design uses httpOnly cookies.
- Tokens are stateless, so logout only removes the token on the client and a stolen token works until it expires. Short-lived access tokens plus refresh tokens fix this.
- A guest id works like a password for guest tasks. It is random and hard to guess, but anyone who has it can read those tasks.
- There is no rate limiting, so login attempts are not throttled. Add a package such as `express-rate-limit`.
- There is no email verification and no password reset.
- There are no roles. "Authorization" here means ownership only. An admin role would add a `role` column on `users` and a `requireRole` middleware.
- Add automated tests for the endpoints, for example with Node's built-in test runner and `fetch`.