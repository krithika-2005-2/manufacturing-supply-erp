# Manufacturing & Supply ERP Backend

Node.js / Express REST API for the workflow:

**Customer Enquiry → Quotation → Sales Order → Inventory Reservation → Dispatch**

This service is designed to attach to an **existing PostgreSQL database**. It does not create a new database instance. Prisma is the integration layer; `DATABASE_URL` is the only connection setting required.

There is no React frontend in this project.

## Prerequisites

- Node.js 18+
- Access credentials for the existing PostgreSQL database
- npm

## Installation

```bash
cd backend
cp .env.example .env
npm install
```

## Environment setup

Edit `.env` (never commit secrets):

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/EXISTING_DB_NAME?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRATION="8h"
PORT=3000
NODE_ENV=development
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Connection string to the existing Postgres database |
| `JWT_SECRET` | Signing secret for access tokens |
| `JWT_EXPIRATION` | Token lifetime (for example `8h`) |
| `PORT` | HTTP port |
| `NODE_ENV` | `development`, `test`, or `production` |

## Database connection

Point `DATABASE_URL` at the live ERP database. Do not spin up a separate “app-owned” database unless you are only experimenting locally.

Recommended first step against the real schema:

```bash
npx prisma db pull
npx prisma generate
```

`db pull` introspects the existing tables. Then update `prisma/schema.prisma` `@@map` / `@map` names so models match the real tables and columns.

If the existing database already has the required tables, **do not** run `prisma migrate dev` blindly. Map the Prisma models instead.

## Prisma setup

```bash
npx prisma generate
```

This generates the Prisma Client used by `src/prisma/client.js`.

## Migrations

Use migrations only after reviewing SQL against the existing schema.

```bash
npx prisma migrate dev --name init_erp_workflow
```

For production-like apply of already reviewed migrations:

```bash
npx prisma migrate deploy
```

If tables already exist, prefer:

1. `prisma db pull`
2. Align models
3. `prisma generate`

Optional database constraints to add on the existing `inventory` table (names may differ):

```sql
ALTER TABLE inventory
  ADD CONSTRAINT inventory_non_negative
  CHECK (physical_quantity >= 0 AND reserved_quantity >= 0);

ALTER TABLE inventory
  ADD CONSTRAINT inventory_reserved_not_above_physical
  CHECK (reserved_quantity <= physical_quantity);

ALTER TABLE sales_orders
  ADD CONSTRAINT sales_orders_quotation_unique UNIQUE (quotation_id);

ALTER TABLE dispatches
  ADD CONSTRAINT dispatches_sales_order_unique UNIQUE (sales_order_id);
```

## Seed

After the schema is aligned and reachable:

```bash
npm run prisma:seed
```

Seed users (password for both: `Password123!`):

- ADMIN: `admin@erp.local` / username `admin`
- SALES_USER: `sales@erp.local` / username `sales`

Also seeds two sample products with inventory if SKUs `STL-001` and `GSK-010` are absent.

If the existing `users` / `products` tables use different columns, adjust `prisma/seed.js` before running.

## Development server

```bash
npm run dev
```

API: `http://localhost:3000`  
Swagger: `http://localhost:3000/docs`  
OpenAPI JSON: `http://localhost:3000/docs.json`

## Production server

```bash
NODE_ENV=production npm start
```

Production error responses omit stack traces.

## Swagger

Open `/docs` while the server is running. The spec covers authentication, customers, products, inventory, enquiries, quotations, sales orders, and dispatch.

## Postman

Import `postman/ERP-API.postman_collection.json`.

1. Run **Login Admin** (token is stored in the collection variable).
2. Create customer / product / enquiry / quotation.
3. Set `{{customerId}}`, `{{productId}}`, `{{enquiryId}}`, `{{quotationId}}`, `{{salesOrderId}}` from responses.
4. Quotation status must go `DRAFT → SENT → ACCEPTED` before convert.
5. Confirm and dispatch require an ADMIN token.

## Testing

```bash
npm test
```

Covered behaviours:

1. Quotation totals are calculated on the backend (decimal-safe).
2. DRAFT / REJECTED quotations cannot become sales orders.
3. One quotation cannot create duplicate sales orders.
4. Reservation cannot exceed available quantity.
5. SALES_USER cannot perform ADMIN-only operations.
6. Concurrent-style overlapping reservations: 80 then 50 against 100 available — only the first succeeds.

## Sample API requests

Login:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@erp.local","password":"Password123!"}'
```

Create customer (SALES_USER or ADMIN):

```bash
curl -X POST http://localhost:3000/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"companyName":"Acme","contactPerson":"Ravi Kumar","mobile":"9876543210","email":"ravi@acme.test","city":"Pune"}'
```

Create quotation (totals are ignored if sent; backend recalculates):

```bash
curl -X POST http://localhost:3000/quotations \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"enquiryId":"ENQUIRY_UUID","items":[{"productId":"PRODUCT_UUID","quantity":10,"unitPrice":100,"discountPercent":10,"gstPercent":18}]}'
```

Confirm sales order (ADMIN, transactional reservation):

```bash
curl -X POST http://localhost:3000/sales-orders/ORDER_UUID/confirm \
  -H "Authorization: Bearer $TOKEN"
```

Dispatch (ADMIN):

```bash
curl -X POST http://localhost:3000/sales-orders/ORDER_UUID/dispatch \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"dispatchDate":"2026-09-20","vehicleNumber":"MH12AB1234","driverName":"Suresh Patil","items":[{"productId":"PRODUCT_UUID","quantity":10}]}'
```

## Roles

| Action | ADMIN | SALES_USER |
|---|---|---|
| View records | yes | yes |
| Manage products / inventory | yes | no |
| Create customers, enquiries, quotations | yes | yes |
| Convert accepted quotation | yes | yes |
| Confirm sales order / reserve stock | yes | no |
| Dispatch | yes | no |

Authorization is enforced in Express middleware, not only in a UI.

## Inventory reservation and concurrency

Confirm:

1. Opens a PostgreSQL transaction.
2. `SELECT … FROM sales_orders WHERE id = $id FOR UPDATE`
3. `SELECT … FROM inventory WHERE product_id = $id FOR UPDATE` per line
4. Available = physical − reserved
5. Conditional update: `UPDATE inventory SET reserved_quantity = reserved_quantity + :qty WHERE (physical_quantity - reserved_quantity) >= :qty`
6. If any line fails, the transaction throws and rolls back. Physical quantity is unchanged.
7. Order status becomes `CONFIRMED` only after every line is reserved.

Dispatch:

- Allowed only for `CONFIRMED` orders, ADMIN role, once per order (`dispatches.sales_order_id` unique).
- Decrements **both** physical and reserved quantities in the same transaction.

## Connecting to the existing database (checklist)

1. Set `DATABASE_URL`.
2. `npx prisma db pull` and reconcile `@@map` names.
3. Confirm `Role`, status enums, and UUID vs integer primary keys.
4. Ensure unique keys exist for `quotations.id → sales_orders.quotation_id` and dispatch per order.
5. `npx prisma generate`
6. Adjust seed users if identity already lives in another table.
7. Start the API and hit `/health`.
