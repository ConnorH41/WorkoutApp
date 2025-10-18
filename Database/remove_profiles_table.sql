-- ==========================================
-- REMOVE PROFILES TABLE
-- Execute this to remove the profiles table and all related policies
-- ==========================================

-- Drop policies first
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Drop the profiles table
DROP TABLE IF EXISTS profiles CASCADE;

-- Note: This will not affect auth.users table which is managed by Supabase Auth
