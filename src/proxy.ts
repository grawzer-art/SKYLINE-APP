import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSignalBySlug } from "@/data/signals";
import { canEnterStaff } from "@/lib/auth/roles";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";
import { getChannel, getStaffMember } from "@/data/staff";
import { SPACE_COOKIE } from "@/lib/space";
import { staffAuthMode } from "@/lib/staff/mode";
import { loadStaffIdentity } from "@/lib/staff/session";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * 1) SIGNAL : un brouillon ou un slug inconnu doit répondre par un VRAI 404 dès la première requête
 *    (sinon, le rendu en flux peut renvoyer 200 avec une page « introuvable »).
 * 2) STAFF HQ : contrôle d'accès CÔTÉ SERVEUR avant tout rendu (cookie signé vérifié ; jamais un état React ni localStorage).
 *    Sans session → page d'accès démo ; session sans rôle staff/admin → refus. Défense en profondeur à ajouter en production
 *    (vérification de session dans chaque route serveur / accès aux données).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0) Ouverture de l'application (vrai chargement de page de « / », pas une navigation interne) : choix de l'espace.
  //    Aucun choix mémorisé → écran de choix ; STAFF mémorisé → STAFF HQ (accès vérifié ci-dessous). La préférence ne donne aucun droit.
  if (pathname === "/") {
    const isPageLoad = request.headers.get("sec-fetch-dest") === "document" && !request.headers.get("rsc");
    if (!isPageLoad) return NextResponse.next();
    const space = request.cookies.get(SPACE_COOKIE)?.value;
    if (!space) return NextResponse.redirect(new URL("/start", request.url), { status: 307, headers: { "Cache-Control": "no-store" } });
    if (space === "staff") return NextResponse.redirect(new URL("/staff", request.url), { status: 307, headers: { "Cache-Control": "no-store" } });
    return NextResponse.next();
  }

  if (pathname.startsWith("/staff")) {
    const mode = staffAuthMode();
    const redirect = (path: string, q = "") => { const u = new URL(path, request.url); u.search = q; return NextResponse.redirect(u, { status: 307, headers: { "Cache-Control": "no-store" } }); };
    // Identifiants inconnus → vrai 404 dès la première requête (cf. SIGNAL), seulement une fois l'accès autorisé.
    const [, , section, id] = pathname.split("/");
    const unknown = (section === "team" && id && !getStaffMember(id)) || (section === "comms" && id && !getChannel(id));
    const guarded = (res: NextResponse) => { res.headers.set("Cache-Control", "private, no-store"); res.headers.set("X-Robots-Tag", "noindex, nofollow"); return res; };

    if (mode === "supabase") {
      // Authentification individuelle (Supabase) : session vérifiée auprès de Supabase + profil actif + rôle. Défaut : refus.
      if (pathname === "/staff/access") return redirect("/staff/login");
      if (pathname === "/staff/login") return guarded(NextResponse.next());
      const { response, supabase, user } = await updateSession(request);
      if (!user || !supabase) return redirect("/staff/login", `?next=${encodeURIComponent(pathname)}`);
      const identity = await loadStaffIdentity(supabase, user.id, user.email ?? "");
      if (!identity || !canEnterStaff(identity.roles)) return redirect("/staff/login", "?denied=1");
      if (unknown) return NextResponse.rewrite(new URL("/signal-introuvable", request.url));
      return guarded(response());
    }

    // Mode démonstration (cookie signé, comptes fictifs) — jamais en production réelle.
    if (pathname === "/staff/login") return redirect("/staff/access");
    if (pathname === "/staff/access") return NextResponse.next();
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) return redirect("/staff/access", `?next=${encodeURIComponent(pathname)}`);
    if (!canEnterStaff(session.roles)) return redirect("/staff/access", "?denied=1");
    if (unknown) return NextResponse.rewrite(new URL("/signal-introuvable", request.url));
    return guarded(NextResponse.next());
  }

  const slug = pathname.split("/")[2] ?? "";
  if (!getSignalBySlug(decodeURIComponent(slug))) {
    return NextResponse.rewrite(new URL("/signal-introuvable", request.url)); // route inexistante → 404 + not-found.tsx
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/signal/:slug", "/staff", "/staff/:path*"] };
