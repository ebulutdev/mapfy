// Supabase Client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://zwlyucqzjnqtrcztzhcs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3bHl1Y3F6am5xdHJjenR6aGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MzU1MDMsImV4cCI6MjA4MzMxMTUwM30.81LUbnaHkd5BznVsnu_mFU0WmosoR8AJKKs-aOnIffI';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
