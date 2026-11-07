import { NextResponse, connection, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { staffAuthMode } from "@/lib/staff/mode";
import { LOGIN_NEXT_COOKIE } from "@/lib/staff/paths";
import { participantConfig } from "@/lib/participant/config";
import { PARTICIPANT_HOME, resolveLoginNext, safeParticipantNext } from "@/lib/participant/paths";

/**
 * Retour du lien e-mail (PKCE) — UNE SEULE route pour STAFF HQ et les participants : échange le code contre une session (cookies httpOnly), puis
 * redirige vers un chemin INTERNE validé (/staff… ou /v3…). La liste des URL de retour Supabase reste inchangée (`…/auth/callback`, exacte).
 */
export async function GET(req: NextRequest) {
  await connection(); // toujours évalué à la requête (jamais pré-rendu au build)
  const staff = staffAuthMode() === "supabase"; const participants = participantConfig().mode === "supabase";
  if (!staff && !participants) return new NextResponse(null, { status: 404 });
  const code = req.nextUrl.searchParams.get("code");
  let raw = req.nextUrl.searchParams.get("next") ?? ""; try { raw ||= decodeURIComponent(req.cookies.get(LOGIN_NEXT_COOKIE)?.value ?? ""); } catch { raw = ""; }
  let dest = resolveLoginNext(raw, participants);
  if (!staff) dest = { kind: "participant", path: safeParticipantNext(raw) || PARTICIPANT_HOME }; // STAFF désactivé : jamais de redirection vers /staff
  const fail = () => NextResponse.redirect(new URL(dest.kind === "participant" ? "/v3/login?error=1" : "/staff/login?error=1", req.url), { status: 303 });
  if (!code) return fail();
  try { const supabase = await createServerSupabase(); const { error } = await supabase.auth.exchangeCodeForSession(code); if (error) return fail(); } catch { return fail(); }
  const res = NextResponse.redirect(new URL(dest.path, req.url), { status: 303, headers: { "Cache-Control": "no-store" } });
  res.cookies.delete(LOGIN_NEXT_COOKIE);
  return res;
}
