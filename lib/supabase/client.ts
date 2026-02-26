import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv } from './env'

export const createClient = () => {
  const { url, anonKey, isConfigured } = getSupabaseEnv()

  if (!isConfigured) {
    throw new Error('Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.')
  }

  return createBrowserClient(
    url,
    anonKey
  )
}