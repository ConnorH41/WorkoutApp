-- Migration: add unit to bodyweight
-- Creates an enum type 'weight_unit' and adds a 'unit' column to the bodyweight table.
-- Default is 'kg' for backwards compatibility.

BEGIN;

-- Create enum type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'weight_unit') THEN
    CREATE TYPE weight_unit AS ENUM ('kg', 'lbs');
  END IF;
END
$$;

-- Add the column with default 'kg'
ALTER TABLE IF EXISTS bodyweight
  ADD COLUMN IF NOT EXISTS unit weight_unit NOT NULL DEFAULT 'kg';

-- Backfill any NULLs (defensive)
UPDATE bodyweight SET unit = 'kg' WHERE unit IS NULL;

COMMIT;

-- Rollback notes:
-- To revert: ALTER TABLE bodyweight DROP COLUMN IF EXISTS unit; DROP TYPE IF EXISTS weight_unit;
