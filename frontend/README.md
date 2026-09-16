# Manufacturing & Supply ERP Frontend

React + TypeScript UI for the existing Node.js/Express backend.

Architecture:

```
PostgreSQL  →  existing Express API  →  this React app
```

This project does **not** connect to PostgreSQL. It only calls REST APIs.

## Prerequisites

- Node.js 18+
- The existing backend running (default `http://localhost:3000`)
- Backend already connected to the existing database

## Installation

```bash
cd frontend
cp .env.example .env
npm install
```

## Environment

`.env`:

```
VITE_API_BASE_URL=http://localhost:3000
```

Do not put database credentials, JWT secrets, or `DATABASE_URL` here.

## Start the backend first

```bash
cd backend
npm run dev
```

Confirm `GET http://localhost:3000/health` succeeds.

## Start the frontend

```bash
cd frontend
npm run dev
```

Vite typically serves `http://localhost:5173`.

## Roles (backend seed)

If the backend seed has been applied:

| Role | Login | Password |
|---|---|---|
| ADMIN | `admin@erp.local` or `admin` | `Password123!` |
| SALES_USER | `sales@erp.local` or `sales` | `Password123!` |

Use whatever users already exist in your database if seed was not used.

## Authentication

- `POST /auth/login` with email **or** username plus password
- JWT stored in `localStorage` and sent as `Authorization: Bearer`
- `GET /me` restores the session
- HTTP 401 clears the session and returns to Login

## Workflow in the UI

1. Sign in
2. Customers → create/view/edit
3. Enquiries → multiple product lines
4. Quotations → backend calculates totals
5. Mark SENT then ACCEPTED
6. Convert to sales order
7. View inventory
8. ADMIN confirms (backend reserves stock)
9. Refresh inventory (reserved increases, physical unchanged)
10. ADMIN dispatches (backend reduces physical and reserved)

## Notes

- Confirm and dispatch buttons are hidden for `SALES_USER`. The API still enforces ADMIN.
- Insufficient stock, duplicate dispatch, and invalid status changes are shown from backend error messages.
- Quotation “preview” totals on the create form are estimates only.
