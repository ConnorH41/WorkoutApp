import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ksoyybbbwtmgegxgrzyz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzb3l5YmJid3RtZ2VneGdyenl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNDI1NzYsImV4cCI6MjA3MzYxODU3Nn0.iKs_HsK05H2DF0szyvNpjZht7KY3nXGxqIgxsJu6E6o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
