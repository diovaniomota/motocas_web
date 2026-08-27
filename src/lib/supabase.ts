import { createClient } from '@supabase/supabase-js'

// Durante o prerender estático (build do Cloudflare sem env vars), createClient
// rejeita string vazia pois verifica !supabaseUrl. O placeholder garante que o
// módulo carrega sem erros; em runtime as variáveis reais substituem via Cloudflare Pages.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
