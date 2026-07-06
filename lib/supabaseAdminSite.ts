import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_SITE
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_SITE

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL_SITE is required')
}

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY_SITE is required')
}

export const supabaseAdminSite = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})