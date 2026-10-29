import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSignalBySlug } from "@/data/signals";
import { canEnterStaff } from "@/lib/auth/roles";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";
import { getChannel, getStaffMember } from "@/data/staff";
import { SPACE_COOKIE } from "@/lib/space";

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
    if (pathname === "/staff/access") return NextResponse.next();
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
    const to = (q: string) => { const u = new URL("/staff/access", request.url); u.search = q; return NextResponse.redirect(u, { status: 307, headers: { "Cache-Control": "no-store" } }); };
    if (!session) return to(`?next=${encodeURIComponent(pathname)}`);
    if (!canEnterStaff(session.roles)) return to("?denied=1");
    // Identifiants inconnus → vrai 404 dès la première requête (cf. SIGNAL), seulement une fois l'accès autorisé.
    const [, , section, id] = pathname.split("/");
    if ((section === "team" && id && !getStaffMember(id)) || (section === "comms" && id && !getChannel(id))) return NextResponse.rewrite(new URL("/signal-introuvable", request.url));
    const res = NextResponse.next(); res.headers.set("Cache-Control", "private, no-store"); res.headers.set("X-Robots-Tag", "noindex, nofollow"); return res;
  }

  const slug = pathname.split("/")[2] ?? "";
  if (!getSignalBySlug(decodeURIComponent(slug))) {
    return NextResponse.rewrite(new URL("/signal-introuvable", request.url)); // route inexistante → 404 + not-found.tsx
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/signal/:slug", "/staff", "/staff/:path*"] };
