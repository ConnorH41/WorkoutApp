This folder contains SQL migrations for the local/Postgres database used by the app.

2025-09-25-add-bodyweight-unit.sql
- Adds a new enum type `weight_unit` and a `unit` column on the `bodyweight` table.
- Default is `kg` to preserve backwards compatibility.

Apply migration:
- Run the SQL file against your Postgres database used by Supabase (for example, via psql):

  psql <CONNECTION_STRING> -f 2025-09-25-add-bodyweight-unit.sql

Rollback (manual):
- ALTER TABLE bodyweight DROP COLUMN IF EXISTS unit;
- DROP TYPE IF EXISTS weight_unit;

Note: If you're using the hosted Supabase dashboard, create a new migration or run the SQL from the SQL editor. Be sure to back up your data first.
