import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/staff/mode";

/** Rafraîchit la session Supabase dans le proxy et renvoie l'utilisateur VÉRIFIÉ (ou null) avec la réponse portant les cookies à jour. */
export async function updateSession(request: NextRequest) {
  const env = supabaseEnv(); let response = NextResponse.next({ request });
  if (!env) return { response: () => response, supabase: null, user: null };
  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => { for (const c of list) request.cookies.set(c.name, c.value); response = NextResponse.next({ request }); for (const c of list) response.cookies.set(c.name, c.value, c.options); },
    },
  });
  let user = null;
  try { const { data } = await supabase.auth.getUser(); user = data.user ?? null; } catch { user = null; } // service injoignable → non authentifié
  return { response: () => response, supabase, user };
}
