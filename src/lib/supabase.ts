import { createClient } from '@supabase/supabase-js'

// Fallback vazio evita exceção durante o prerender do Cloudflare.
// As variáveis reais devem ser configuradas em Cloudflare Pages → Settings → Environment variables.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
