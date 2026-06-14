
import { createClient } from "@supabase/supabase-js"
import type { Database } from "./supabase.types"
import type { SupabaseClient } from "@supabase/supabase-js"

let _supabase: SupabaseClient<Database> | null = null

function getSupabase(): SupabaseClient<Database> {
  if (_supabase) return _supabase

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Faltan las variables de entorno de Supabase en el servidor.")
  }

  _supabase = createClient<Database>(supabaseUrl, supabaseKey)
  return _supabase
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    return (getSupabase() as any)[prop]
  },
  set(_, prop, value) {
    (getSupabase() as any)[prop] = value
    return true
  }
})