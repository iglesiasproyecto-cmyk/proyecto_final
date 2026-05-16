import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Singleton to prevent Vite HMR from creating multiple Supabase instances,
// which causes NavigatorLockAcquireTimeoutError (multiple clients fight over the auth token lock).
declare global {
  // eslint-disable-next-line no-var
  var __supabaseInstance: ReturnType<typeof createClient<Database>> | undefined
}

export const supabase =
  globalThis.__supabaseInstance ??
  createClient<Database>(supabaseUrl, supabaseAnonKey)

if (import.meta.env.DEV) {
  globalThis.__supabaseInstance = supabase
}
