const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL || 'https://swarjcefydpvysegwadl.supabase.co'
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3YXJqY2VmeWRwdnlzZWd3YWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg3MTYzOSwiZXhwIjoyMDkyNDQ3NjM5fQ.zQCmvLxXJiuPq-K5HEAjn2RaRHEDrvvD11Cnt4UUle0'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

// Cliente público
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente admin (bypassa RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

module.exports = { supabase, supabaseAdmin }
