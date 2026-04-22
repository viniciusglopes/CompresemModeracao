const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL || 'https://pgtuzwvlmcgivqsrscrn.supabase.co'
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBndHV6d3ZsbWNnaXZxc3JzY3JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NzA3NTgsImV4cCI6MjA5MTQ0Njc1OH0.WmaIEP-aNb-jObkbaL5LbOjJYcKIb5wnC95L6YEDuvo'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

// Cliente público
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente admin (bypassa RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

module.exports = { supabase, supabaseAdmin }
