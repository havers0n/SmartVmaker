Local Supabase setup (for this project)

Prereqs

- Docker running
- Node >= 18
- Supabase CLI installed (or use npx supabase@latest)

1. Initialize supabase (run from repo root)

npx supabase@latest init

This creates `supabase/` with migrations/ and seed files.

2. Start local stack

npx supabase start

Default local services:

- Postgres: postgresql://postgres:postgres@localhost:54322/postgres
- Studio: http://localhost:54323
- Inbucket: http://localhost:54324
- Supabase API: http://localhost:54321

3. Get keys

npx supabase status

Copy the ANON KEY and SERVICE ROLE KEY into your `.env` (or `.env.local`).

4. Apply migrations and seed

npx supabase db reset

This will drop, recreate DB, apply migrations and run `supabase/seed.sql`.

5. Verify

- Open Studio: http://localhost:54323 and check tables `tasks`, `clips`, `batches`, `assets` and the `demo-task-1` row.
- Start server: `npm start` and call `/api/job/demo-task-1` to see the DB-backed task record.

Notes

- If ports 54322/54323/54324 are in use, stop other services or change them in `supabase/config.toml`.
- If you need to stop supabase: `npx supabase stop`.
