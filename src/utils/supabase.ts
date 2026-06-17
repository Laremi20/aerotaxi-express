import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Conector oficial que usaremos para hablar con la base de datos
export const supabase = createClient(supabaseUrl, supabaseAnonKey)