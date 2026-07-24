import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { env } from './env'

// The only place the Supabase client is created — every services/*.ts
// file imports this instance instead of calling createClient() itself.
export const supabase = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey)
