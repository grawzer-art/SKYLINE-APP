import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/staff/mode";

/** Client NAVIGATEUR : uniquement la clé publique. Toute donnée reste protégée par les politiques RLS de la base. */
export function createBrowserSupabase() {
  const env = supabaseEnv(); if (!env) throw new Error("Supabase n'est pas configuré (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).");
  return createBrowserClient(env.url, env.key);
}
