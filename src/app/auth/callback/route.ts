import { NextResponse, connection, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { staffAuthMode } from "@/lib/staff/mode";
import { LOGIN_NEXT_COOKIE, safeStaffNext } from "@/lib/staff/paths";

/** Retour du lien e-mail (PKCE) : échange le code contre une session (cookies httpOnly), puis redirige vers un chemin STAFF interne. */
export async function GET(req: NextRequest) {
  await connection(); // toujours évalué à la requête (jamais pré-rendu au build)
  if (staffAuthMode() !== "supabase") return new NextResponse(null, { status: 404 });
  const code = req.nextUrl.searchParams.get("code"); const next = safeStaffNext(req.nextUrl.searchParams.get("next") ?? decodeURIComponent(req.cookies.get(LOGIN_NEXT_COOKIE)?.value ?? ""));
  const fail = () => NextResponse.redirect(new URL("/staff/login?error=1", req.url), { status: 303 });
  if (!code) return fail();
  try { const supabase = await createServerSupabase(); const { error } = await supabase.auth.exchangeCodeForSession(code); if (error) return fail(); } catch { return fail(); }
  const res = NextResponse.redirect(new URL(next, req.url), { status: 303, headers: { "Cache-Control": "no-store" } });
  res.cookies.delete(LOGIN_NEXT_COOKIE);
  return res;
}
