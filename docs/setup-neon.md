# Neon PostgreSQL setup

The app already runs against a live Neon database (see `README.md`'s Local
setup for the day-to-day `db:migrate` / `db:seed` flow). This doc covers
provisioning a Neon project from scratch and the production-specific
details.

1. **Create a project** at https://neon.tech (the free tier is enough for
   development and a small college's early rollout).
2. **Create a database** inside the project — this app expects a single
   database (any name; `.env.example` uses `college_attendance`).
3. **Copy both connection strings** from the Neon dashboard's "Connection
   Details" panel:
   - The **pooled** connection (`-pooler` in the hostname) → `DATABASE_URL`.
     The app's Prisma client uses this one at runtime; Neon's pooler
     (PgBouncer) is what lets a serverless deployment (many short-lived
     Vercel function instances) share a small number of real Postgres
     connections instead of exhausting Neon's connection limit.
   - The **direct** connection (no `-pooler`) → `DIRECT_DATABASE_URL`.
     Prisma Migrate needs a direct, non-pooled connection to run schema
     migrations; `prisma/schema.prisma`'s `datasource db` block already
     wires `directUrl` to this variable.
   - Keep `?sslmode=require` on both — Neon requires TLS.
4. **Run migrations and seed**:
   ```bash
   npm run db:migrate   # dev: creates + applies a migration
   npm run db:seed
   ```
   In production, use `npm run db:deploy` instead of `db:migrate` (applies
   already-committed migrations without prompting or generating new ones —
   see `docs/deployment.md`).
5. **Region**: pick the Neon region closest to where the app will actually
   run (e.g. `ap-southeast-1` for a Vercel deployment targeting India) to
   keep query latency low — this matters for this app specifically because
   several endpoints (attendance submission, imports, leave/OD decisions)
   run multi-step Prisma transactions (`LONG_TRANSACTION_OPTIONS` in
   `src/lib/prisma.ts`) that are sensitive to round-trip latency.

## Backups and restore (Section 43)

Neon takes continuous, automatic backups via **point-in-time restore
(PITR)** — no separate backup job is needed. Retention depends on plan
(check the current retention window on the Neon dashboard before relying
on it for a specific recovery point). To restore:

1. Neon dashboard → the project → **Branches** → **Restore** (or create a
   new branch from a past timestamp — Neon's branching feature is exactly
   a point-in-time copy of the database).
2. Verify the restored branch's data, then either point `DATABASE_URL` /
   `DIRECT_DATABASE_URL` at it, or use Neon's "Restore" action to replace
   the primary branch's data with the chosen point in time.

Document the exact retention window and who is authorized to run a
restore as part of the college's own operational runbook — that's
institution-specific and isn't something this codebase can encode.

## Known gap

The `postgresql://...neon.tech/...` connection string currently in `.env`
was supplied directly for this project and has been verified working
end-to-end through every phase's live testing. Nothing further is pending
here.
