import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/staff/mode";

/**
 * Client SERVEUR (composants serveur, Server Actions, Route Handlers) : session lue/écrite dans les cookies httpOnly.
 * À n'importer que dans du code serveur. Toujours valider l'identité avec `auth.getUser()` (jeton vérifié auprès de Supabase),
 * jamais avec `auth.getSession()` seul (cookie non vérifié).
 */
export async function createServerSupabase() {
  const env = supabaseEnv(); if (!env) throw new Error("Supabase n'est pas configuré.");
  const store = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => { try { for (const c of list) store.set(c.name, c.value, c.options); } catch { /* appelé depuis un composant serveur : le proxy rafraîchit la session */ } },
    },
  });
}
