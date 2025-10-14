-- Migration: Set workouts.day_id foreign key to ON DELETE SET NULL
ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_day_id_fkey;
ALTER TABLE workouts ADD CONSTRAINT workouts_day_id_fkey FOREIGN KEY (day_id) REFERENCES days(id) ON DELETE SET NULL;