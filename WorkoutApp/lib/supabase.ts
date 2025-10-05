import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lepkzigpfoyvtzltvlmh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlcGt6aWdwZm95dnR6bHR2bG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2ODk2NTAsImV4cCI6MjA3NTI2NTY1MH0.rXW6pAioyb9YY4ORjyedyVatlXmGTE7nrddva2i3tic';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
