-- Migration: Set split_days.day_id foreign key to ON DELETE SET NULL
ALTER TABLE split_days DROP CONSTRAINT IF EXISTS split_days_day_id_fkey;
ALTER TABLE split_days ADD CONSTRAINT split_days_day_id_fkey FOREIGN KEY (day_id) REFERENCES days(id) ON DELETE SET NULL;