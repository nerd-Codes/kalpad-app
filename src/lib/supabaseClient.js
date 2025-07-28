// src/lib/supabaseClient.js
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'

const supabase = createPagesBrowserClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
})

export default supabase