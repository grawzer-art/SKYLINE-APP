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
import { participantConfig, signupConfig } from "@/lib/participant/config";
import { reviewModeFromProcess } from "@/lib/experience/reviewMode";
import { loadParticipantAccess } from "@/lib/participant/access";

/**
 * 1) SIGNAL : un brouillon ou un slug inconnu doit répondre par un VRAI 404 dès la première requête
 *    (sinon, le rendu en flux peut renvoyer 200 avec une page « introuvable »).
 * 2) STAFF HQ : contrôle d'accès CÔTÉ SERVEUR avant tout rendu (cookie signé vérifié ; jamais un état React ni localStorage).
 *    Sans session → page d'accès démo ; session sans rôle staff/admin → refus. Défense en profondeur à ajouter en production
 *    (vérification de session dans chaque route serveur / accès aux données).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0) Ouverture de l'application (« / ») : choix de l'espace d'abord, puis l'accueil V3.
  //    Chargement de page sans choix mémorisé → écran de choix ; STAFF mémorisé → STAFF HQ (accès vérifié plus bas) ; sinon (et pour toute navigation interne) → SKYLINE V3 (`/v3`),
  //    requête conservée. La préférence d'espace ne donne AUCUN droit. `/v3` ne redirige jamais vers « / » : aucune boucle possible.
  if (pathname === "/") {
    const isPageLoad = request.headers.get("sec-fetch-dest") === "document" && !request.headers.get("rsc");
    const to = (path: string, keepQuery = false) => { const u = new URL(path, request.url); if (keepQuery) u.search = request.nextUrl.search; return NextResponse.redirect(u, { status: 307, headers: { "Cache-Control": "no-store" } }); };
    if (isPageLoad) {
      const space = request.cookies.get(SPACE_COOKIE)?.value;
      if (!space) return to("/start");
      if (space === "staff") return to("/staff");
    }
    return to("/v3", true);
  }

  // MODE REVUE (plan des écrans, wireframes) : LOCAL uniquement (voir src/lib/experience/reviewMode.ts). Ailleurs : page inexistante (404).
  if (pathname === "/v3/screens" || pathname === "/v3/wireframes") {
    return reviewModeFromProcess({ host: request.headers.get("host"), forwardedHost: request.headers.get("x-forwarded-host") })
      ? NextResponse.next({ headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } })
      : NextResponse.rewrite(new URL("/signal-introuvable", request.url));
  }

  // PARTICIPANTS : pages personnelles (/v3/account) et connexion (/v3/login). Authentification Supabase RÉUTILISÉE (même session que STAFF).
  // Défaut : application participants inchangée (PARTICIPANT_AUTH=off → ces pages n'existent pas : 404). Les autres pages /v3 restent publiques.
  if (pathname === "/v3/login" || pathname === "/v3/account" || pathname.startsWith("/v3/account/")) {
    const cfg = participantConfig();
    if (cfg.mode === "off") return NextResponse.rewrite(new URL("/signal-introuvable", request.url));
    if (cfg.mode === "misconfigured") return configErrorPage(cfg.issue ?? "Configuration invalide.", "Espace participants");
    const noStore = (res: NextResponse) => { res.headers.set("Cache-Control", "private, no-store"); res.headers.set("X-Robots-Tag", "noindex, nofollow"); return res; };
    if (pathname === "/v3/login") return noStore(NextResponse.next());
    const { response, supabase, user } = await updateSession(request);
    const go = (q: string) => { const u = new URL("/v3/login", request.url); u.search = q; return NextResponse.redirect(u, { status: 307, headers: { "Cache-Control": "no-store" } }); };
    if (!user || !supabase) return go(`?next=${encodeURIComponent(pathname)}`);
    // Vérification CÔTÉ SERVEUR : compte actif ET accès « members » (jamais un état d'interface, jamais les métadonnées de l'utilisateur).
    if (!(await loadParticipantAccess(supabase, user.id))) return go("?denied=1");
    return noStore(response());
  }

  // INSCRIPTION PUBLIQUE (B4.2) : fermée par défaut (PARTICIPANT_SIGNUP=off → 404). La finalisation exige une session (adresse confirmée) ; un membre déjà actif va à son compte.
  if (pathname === "/v3/signup" || pathname === "/v3/signup/complete") {
    const pc = participantConfig(); const sc = signupConfig();
    if (pc.mode === "off" || sc.mode === "off") return NextResponse.rewrite(new URL("/signal-introuvable", request.url));
    if (pc.mode === "misconfigured") return configErrorPage(pc.issue ?? "Configuration invalide.", "Espace participants");
    if (sc.mode === "misconfigured") return configErrorPage(sc.issue, "Inscription");
    const noStore = (res: NextResponse) => { res.headers.set("Cache-Control", "private, no-store"); res.headers.set("X-Robots-Tag", "noindex, nofollow"); return res; };
    if (pathname === "/v3/signup") return noStore(NextResponse.next());
    const { response, supabase, user } = await updateSession(request);
    const to = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 307, headers: { "Cache-Control": "no-store" } });
    if (!user || !supabase) return to("/v3/signup");
    if (await loadParticipantAccess(supabase, user.id)) return to("/v3/account");
    return noStore(response());
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
function configErrorPage(issue: string, scope = "STAFF HQ") {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(scope)} — configuration invalide</title><style>body{margin:0;background:#0b0d10;color:#eef2f6;font:16px/1.5 system-ui,sans-serif;padding:max(24px,env(safe-area-inset-top)) 20px 32px}main{max-width:34rem;margin:0 auto}h1{font-size:1.5rem;margin:.2em 0}.tag{font:600 .75rem ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase;color:#ff8a5c}p{color:#c9d2dc}code{color:#7cc4ff}</style></head><body><main role="alert" data-testid="config-error"><p class="tag">${esc(scope)} · suspendu</p><h1>Configuration invalide</h1><p>${esc(issue)}</p><p>${scope === "STAFF HQ" ? "Pour votre sécurité, STAFF HQ ne bascule pas silencieusement vers des données locales : l'équipe pourrait croire que ses missions sont synchronisées. Corrigez les variables d'environnement, ou utilisez <code>STAFF_DATA_SOURCE=local</code> pour la démonstration." : "Les pages personnelles sont suspendues pour votre sécurité ; le reste de l'application reste disponible. Corrigez les variables d'environnement, ou utilisez <code>PARTICIPANT_AUTH=off</code>."}</p></main></body></html>`;
  return new NextResponse(html, { status: 503, headers: { "content-type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}

export const config = { matcher: ["/", "/signal/:slug", "/staff", "/staff/:path*", "/v3/login", "/v3/screens", "/v3/wireframes", "/v3/signup", "/v3/signup/complete", "/v3/account", "/v3/account/:path*"] };
