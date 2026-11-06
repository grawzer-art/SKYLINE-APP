import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSignalBySlug } from "@/data/signals";
import { canEnterStaff } from "@/lib/auth/roles";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";
import { getChannel, getStaffMember } from "@/data/staff";
import { SPACE_COOKIE } from "@/lib/space";
import { staffAuthMode } from "@/lib/staff/mode";
import { staffConfigIssue } from "@/lib/staff/data-source";
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
    // Configuration demandée mais incorrecte (ex. STAFF_DATA_SOURCE=db sans authentification Supabase) : STAFF HQ est SUSPENDU avec une erreur
    // explicite. Jamais de repli silencieux vers les données locales ni vers la démonstration (l'équipe croirait ses missions synchronisées).
    const issue = staffConfigIssue();
    if (issue) return configErrorPage(issue);
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
      if (!identity || !canEnterStaff(identity.access)) return redirect("/staff/login", "?denied=1");
      if (unknown) return NextResponse.rewrite(new URL("/signal-introuvable", request.url));
      return guarded(response());
    }

    // Mode démonstration (cookie signé, comptes fictifs) — jamais en production réelle.
    if (pathname === "/staff/login") return redirect("/staff/access");
    if (pathname === "/staff/access") return NextResponse.next();
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) return redirect("/staff/access", `?next=${encodeURIComponent(pathname)}`);
    if (!canEnterStaff(session.access)) return redirect("/staff/access", "?denied=1");
    if (unknown) return NextResponse.rewrite(new URL("/signal-introuvable", request.url));
    return guarded(NextResponse.next());
  }

  const slug = pathname.split("/")[2] ?? "";
  if (!getSignalBySlug(decodeURIComponent(slug))) {
    return NextResponse.rewrite(new URL("/signal-introuvable", request.url)); // route inexistante → 404 + not-found.tsx
  }
  return NextResponse.next();
}

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
/** Page d'erreur de configuration (503) : cite des noms de variables, jamais de valeurs ni de secrets. */
function configErrorPage(issue: string) {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>STAFF HQ — configuration invalide</title><style>body{margin:0;background:#0b0d10;color:#eef2f6;font:16px/1.5 system-ui,sans-serif;padding:max(24px,env(safe-area-inset-top)) 20px 32px}main{max-width:34rem;margin:0 auto}h1{font-size:1.5rem;margin:.2em 0}.tag{font:600 .75rem ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase;color:#ff8a5c}p{color:#c9d2dc}code{color:#7cc4ff}</style></head><body><main role="alert" data-testid="config-error"><p class="tag">STAFF HQ · suspendu</p><h1>Configuration invalide</h1><p>${esc(issue)}</p><p>Pour votre sécurité, STAFF HQ ne bascule pas silencieusement vers des données locales : l'équipe pourrait croire que ses missions sont synchronisées. Corrigez les variables d'environnement, ou utilisez <code>STAFF_DATA_SOURCE=local</code> pour la démonstration.</p></main></body></html>`;
  return new NextResponse(html, { status: 503, headers: { "content-type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}

export const config = { matcher: ["/", "/signal/:slug", "/staff", "/staff/:path*"] };
