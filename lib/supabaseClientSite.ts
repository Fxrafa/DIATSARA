import { createBrowserClient } from '@supabase/ssr'

export const supabaseSite = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_SITE!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SITE!
)