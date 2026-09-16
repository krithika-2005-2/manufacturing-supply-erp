# Seed

The seed script lives at [`../prisma/seed.js`](../prisma/seed.js) and is run with:

```
npm run seed
```

It uses the `pg` driver directly (not the Prisma Client), so it only needs
network access to your Postgres instance — not to Prisma's engine-binary CDN.
