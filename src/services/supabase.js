import { createClient } from '@supabase/supabase-js'

// Замените эти значения на свои из Supabase dashboard
const supabaseUrl = 'https://vmsyetfqqqbdamumpldq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtc3lldGZxcXFiZGFtdW1wbGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MjM2NDQsImV4cCI6MjA3ODA5OTY0NH0.3VyNz4p7NqNfJSED2Z9vxu-A6V3yvdjCp6d1l38ePzM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)