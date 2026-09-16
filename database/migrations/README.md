# Migrations

Prisma requires migrations to live under `prisma/migrations/`, so that is
the canonical location:

```
prisma/migrations/20260101000000_init/migration.sql
```

This folder exists to satisfy the requested top-level project layout and
to point you to the real thing — see [`../prisma/migrations/20260101000000_init/migration.sql`](../prisma/migrations/20260101000000_init/migration.sql).

Apply it with:
```
npx prisma migrate deploy
```
or, if you don't have network access to Prisma's engine binaries, apply the
raw SQL directly (see the main README's "Applying without Prisma CLI" section):
```
psql "$DATABASE_URL" -f prisma/migrations/20260101000000_init/migration.sql
```
