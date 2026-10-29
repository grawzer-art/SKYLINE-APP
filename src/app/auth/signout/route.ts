import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { staffAuthMode } from "@/lib/staff/mode";

/** Déconnexion (POST uniquement, jamais par un simple lien) : supprime la session côté Supabase et les cookies. */
export async function POST(req: NextRequest) {
  if (staffAuthMode() !== "supabase") return new NextResponse(null, { status: 404 });
  try { const supabase = await createServerSupabase(); await supabase.auth.signOut(); } catch { /* cookies supprimés ci-dessous quoi qu'il arrive */ }
  const res = NextResponse.redirect(new URL("/staff/login", req.url), { status: 303, headers: { "Cache-Control": "no-store" } });
  for (const c of req.cookies.getAll()) if (c.name.startsWith("sb-")) res.cookies.delete(c.name);
  return res;
}
