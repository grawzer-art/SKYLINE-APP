/* eslint-disable */
// B4.1 — Comptes participants : connexion par code e-mail (Supabase Auth, FAUX serveur local), profil, identité réelle, protection côté serveur,
// application inchangée quand PARTICIPANT_AUTH est désactivée, erreur explicite quand elle est mal configurée. Aucun vrai projet Supabase n'est contacté.
// Serveurs (tests/run-participant.sh) : A = PARTICIPANT_AUTH=supabase (3105) · B = désactivée (3106) · C = valeur invalide (3107).
const { chromium } = require("playwright");
const A = process.env.PART_A || "http://localhost:3105", OFF = process.env.PART_OFF || "http://localhost:3106", BAD = process.env.PART_BAD || "http://localhost:3107", MOCK = process.env.MOCK || "http://127.0.0.1:3199";
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d ? " — " + d : ""}`); if (!c) fails++; };
const ctl = (b) => fetch(MOCK + "/__control", { method: "POST", body: JSON.stringify(b) }).then((r) => r.json());
(async () => {
  const browser = await chromium.launch(); const errs = []; await ctl({ reset: true, delay: 0, fail: {}, profileTable: "ok", setAccount: { who: "participant", spaces: ["members"] } });
  const mk = async (base, o = {}) => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...o }); await ctx.addCookies([{ name: "sk_space", value: "members", url: base }]); const p = await ctx.newPage(); p.setDefaultTimeout(15000); p.on("pageerror", (e) => errs.push(e.message)); return { ctx, p }; };
  const vis = async (loc, t = 8000) => { try { await loc.first().waitFor({ state: "visible", timeout: t }); return true; } catch { return false; } };
  const get = (ctx, url) => ctx.request.get(url, { maxRedirects: 0 });
  const ergo = (page, only) => page.evaluate((only) => { const v = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; }; const small = [], zoom = [];
    document.querySelectorAll(only || "main button, main a[href], main select, main input:not([type=hidden]), main textarea").forEach((el) => { if (!v(el)) return; const r = el.getBoundingClientRect(); const nm = ((el.getAttribute("aria-label") || el.textContent || el.tagName) + "").trim().slice(0, 28); if (r.height < 43.5) small.push(`${nm} ${Math.round(r.width)}x${Math.round(r.height)}`); if (/INPUT|SELECT|TEXTAREA/.test(el.tagName) && parseFloat(getComputedStyle(el).fontSize) < 16) zoom.push(nm); });
    return { small, zoom, hscroll: document.documentElement.scrollWidth > window.innerWidth }; }, only);

  /* ======= A. Authentification participants DÉSACTIVÉE (défaut) : application strictement inchangée ======= */
  { const { ctx, p } = await mk(OFF);
    ok("DÉSACTIVÉ : /v3/login et /v3/account n'existent pas (404)", (await get(ctx, OFF + "/v3/login")).status() === 404 && (await get(ctx, OFF + "/v3/account")).status() === 404);
    const j = await (await get(ctx, OFF + "/api/participant/me")).json(); ok("DÉSACTIVÉ : l'API d'identité répond { mode: « off » } sans aucune donnée", j.mode === "off" && Object.keys(j).length === 1);
    await p.goto(OFF + "/v3", { waitUntil: "domcontentloaded" }); await vis(p.getByRole("heading", { level: 1 })); await p.waitForTimeout(600); ok("DÉSACTIVÉ (hors revue) : application SANS COMPTES — aucune identité de démonstration, aucun lien de connexion, aucune commande de simulation", (await p.getByText(/Alex|Martin/).count()) === 0 && (await p.getByText("Se connecter").count()) === 0 && (await p.getByRole("button", { name: /Désactiver|Avant|Pendant Ibiza/ }).count()) === 0 && (await p.getByText(/Simuler/).count()) === 0);
    await p.goto(OFF + "/v3/profile", { waitUntil: "domcontentloaded" }); await vis(p.getByRole("heading", { name: "Profil" })); ok("DÉSACTIVÉ (hors revue) : le profil n'affiche aucun nom de démonstration, aucun bloc « Mon compte » ni réglage simulé", (await p.getByTestId("account-link").count()) === 0 && (await p.getByTestId("login-link").count()) === 0 && (await p.getByText(/Alex|Membres bloqués|Réinitialiser le prototype/).count()) === 0);
    ok("DÉSACTIVÉ : /staff et le reste de l'application répondent comme avant", [200, 307].includes((await get(ctx, OFF + "/staff")).status()) && [200, 307].includes((await get(ctx, OFF + "/explore")).status()));   // /explore → /v3/explore (redirection)
    await ctx.close(); }

  /* ======= B. Configuration invalide : erreur explicite, limitée aux pages personnelles ======= */
  { const { ctx, p } = await mk(BAD);
    const r = await get(ctx, BAD + "/v3/account"); const body = await r.text(); ok("MAL CONFIGURÉ : /v3/account → 503 « Configuration invalide » avec la cause (nom de variable, jamais de valeur)", r.status() === 503 && /Configuration invalide/.test(body) && /PARTICIPANT_AUTH/.test(body) && r.headers()["cache-control"] === "no-store" && !/sb_publishable|127\.0\.0\.1/.test(body));
    ok("MAL CONFIGURÉ : /v3/login aussi ; le reste de l'application participants reste disponible", (await get(ctx, BAD + "/v3/login")).status() === 503 && (await get(ctx, BAD + "/v3")).status() === 200 && [200, 307].includes((await get(ctx, BAD + "/explore")).status()));
    const j = await (await get(ctx, BAD + "/api/participant/me")).json(); ok("MAL CONFIGURÉ : l'API signale « misconfigured » sans identité", j.mode === "misconfigured" && typeof j.configError === "string" && !j.profile);
    await p.goto(BAD + "/v3", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1500); ok("MAL CONFIGURÉ : l'accueil ne montre AUCUNE identité (ni démo, ni inventée) et ne plante pas", (await p.getByText("Alex Martin").count()) === 0 && (await p.getByRole("heading", { level: 1 }).count()) >= 1);
    await ctx.close(); }

  /* ======= C. Authentification participants ACTIVE ======= */
  const { ctx, p } = await mk(A);
  // C1. Non connecté : aucun nom inventé, pages personnelles protégées côté serveur
  await p.goto(A + "/v3", { waitUntil: "domcontentloaded" });
  ok("NON CONNECTÉ : l'accueil n'invente aucune identité (« Bienvenue à bord » + « Se connecter »), pas d'« Alex »", (await vis(p.getByTestId("identity-anonymous"))) && (await p.getByText(/Alex/).count()) === 0);
  const prot = await get(ctx, A + "/v3/account"); ok("PROTECTION SERVEUR : /v3/account sans session → redirection vers la connexion (jamais de contenu)", prot.status() === 307 && /\/v3\/login\?next=%2Fv3%2Faccount/.test(prot.headers().location || ""), prot.status() + " " + prot.headers().location);
  ok("PROTECTION SERVEUR : sous-chemins et variantes protégés aussi ; /v3/login public", (await get(ctx, A + "/v3/account/x")).status() === 307 && (await get(ctx, A + "/v3/login")).status() === 200 && (await get(ctx, A + "/v3/profile")).status() === 200);
  const forged = await browser.newContext(); await forged.addCookies([{ name: "sb-127-auth-token", value: "base64-garbage", url: A }, { name: "sb-127-auth-token.0", value: "garbage", url: A }, { name: "sk_demo", value: "x.y", url: A }]);
  ok("PROTECTION SERVEUR : cookie de session falsifié ou jeton de démonstration → refusé", (await get(forged, A + "/v3/account")).status() === 307); await forged.close();
  ok("API : sans session → « anonymous », aucune donnée", (await (await get(ctx, A + "/api/participant/me")).json()).status === "anonymous");
  await p.goto(A + "/v3/profile", { waitUntil: "domcontentloaded" }); ok("PROFIL (non connecté) : invitation « Se connecter » dans « Mon compte SKYLINE », aucune identité de démonstration", await vis(p.getByTestId("login-link")));
  await p.goto(A + "/v3/flight", { waitUntil: "domcontentloaded" }); await vis(p.getByText(/Skyline Pass|My Flight/));
  ok("À CONFIRMER : le pass n'annonce jamais « Réservation confirmée » ; « Réservation à confirmer » ; aucune donnée de vol fictive présentée comme réelle", (await vis(p.getByText("Réservation à confirmer"))) && (await p.getByText("Réservation confirmée").count()) === 0 && (await p.getByText(/Aéroport de démonstration/).count()) === 0);
  await p.goto(A + "/v3", { waitUntil: "domcontentloaded" }); await vis(p.getByTestId("identity-anonymous")); ok("À CONFIRMER : le compte à rebours de l'accueil porte la mention « Date à confirmer »", await vis(p.getByTestId("to-confirm")));
  const crew = await mk(A); await crew.p.goto(A + "/crew", { waitUntil: "domcontentloaded" }).catch(() => {}); await crew.p.waitForTimeout(800);
  ok("ANCIENNE ROUTE /crew : redirigée vers /v3/club ; aucun siège fictif affiché", new URL(crew.p.url()).pathname === "/v3/club" && (await crew.p.getByText(/\b1[23][ABC]\b/).count()) === 0); await crew.ctx.close();

  // C2. Connexion par code e-mail
  await p.goto(A + "/v3/login?next=/v3/account", { waitUntil: "domcontentloaded" }); await vis(p.locator("#login-email"));
  ok("CONNEXION : page plein cadre, sans mot de passe, adresse e-mail puis code", (await p.getByLabel(/mot de passe/i).count()) === 0 && (await p.getByRole("heading", { level: 1, name: "Connexion" }).count()) === 1);
  await p.locator("#login-email").fill("pas-une-adresse"); await p.getByRole("button", { name: "Recevoir un code" }).click(); ok("CONNEXION : adresse invalide → message d'erreur, aucun envoi", await vis(p.getByText("Saisissez une adresse e-mail valide.")));
  await p.locator("#login-email").fill("participant@example.test"); await p.getByRole("button", { name: "Recevoir un code" }).click();
  ok("CONNEXION : message NEUTRE (« Si ce compte existe… ») et saisie du code ; renvoi différé", (await vis(p.getByText(/Si ce compte existe/))) && (await vis(p.getByRole("button", { name: /Renvoyer le code \(\d+ s\)/ }))));
  await p.locator("#login-code").fill("000000"); await p.getByRole("button", { name: "Se connecter" }).click(); ok("CONNEXION : code invalide ou expiré → « Code invalide ou expiré. » (aucune session)", (await vis(p.getByText("Code invalide ou expiré."))) && (await get(ctx, A + "/v3/account")).status() === 307);
  await p.locator("#login-code").fill("12ab"); await p.getByRole("button", { name: "Se connecter" }).click(); ok("CONNEXION : code mal formé → message de saisie", await vis(p.getByText("Saisissez le code reçu par e-mail.")));
  await p.locator("#login-code").fill("123456"); await p.getByRole("button", { name: "Se connecter" }).click(); await p.waitForURL("**/v3/account");
  ok("CONNEXION : code correct → page « Mon compte » (redirection interne validée), session ouverte", await vis(p.getByRole("heading", { level: 1, name: "Mon compte" })));
  ok("SESSION : l'adresse du compte s'affiche ; aucune identité inventée (profil à compléter)", (await vis(p.getByTestId("account-email"))) && /participant@example\.test/.test(await p.getByTestId("account-email").innerText()) && (await p.getByText(/Alex|Camille/).count()) === 0 && (await vis(p.getByText(/Complétez votre profil/))));
  ok("PROTECTION SERVEUR : avec la session, /v3/account est servie (200)", (await get(ctx, A + "/v3/account")).status() === 200);
  const me0 = await (await get(ctx, A + "/api/participant/me")).json(); ok("API : « ready » avec SES seules données (adresse, profil absent) ; pas de rôle, pas de métadonnées", me0.status === "ready" && me0.profile === null && me0.email === "participant@example.test" && !("role" in me0) && !JSON.stringify(me0).includes("user_metadata"));

  // C3. Profil : validation, enregistrement, affichage de l'identité réelle
  await p.getByRole("button", { name: "Enregistrer" }).click(); ok("PROFIL : champs obligatoires signalés (prénom, nom, nom affiché), rien n'est enregistré", (await vis(p.getByText("Le prénom est obligatoire."))) && (await p.getByText("Le nom est obligatoire.").count()) === 1 && (await ctl({})).missions >= 0);
  await p.locator("#p-first").fill("Camille"); ok("PROFIL : le nom affiché suit le prénom tant qu'il n'est pas modifié", (await p.locator("#p-display").inputValue()) === "Camille");
  await p.locator("#p-last").fill("Dupont"); await p.locator("#p-display").fill("Camille D."); await p.getByRole("button", { name: "Enregistrer" }).click();
  ok("PROFIL : enregistrement confirmé « Profil enregistré. »", await vis(p.getByText("Profil enregistré.")));
  const st = await (await fetch(MOCK + "/__state")).json(); ok("PROFIL : écrit via la fonction (nom, prénom, nom affiché) pour SON compte seulement", Object.keys(st.profiles).length === 1 && st.profiles.participant.display_name === "Camille D." && st.profiles.participant.user_id === "44444444-4444-4444-8444-444444444444");
  await p.goto(A + "/v3", { waitUntil: "domcontentloaded" }); ok("IDENTITÉ : l'accueil affiche le NOM RÉEL du participant (plus aucune identité de démonstration)", (await vis(p.getByTestId("identity-name").filter({ hasText: "Camille D." }))) && (await p.getByText("Alex").count()) === 0);
  await p.goto(A + "/v3/profile", { waitUntil: "domcontentloaded" }); ok("IDENTITÉ : l'espace profil affiche le compte (nom et adresse), lien vers « Mon compte »", (await vis(p.getByTestId("account-link").filter({ hasText: "Camille D." }))) && /participant@example\.test/.test(await p.getByTestId("account-link").innerText()));
  await p.goto(A + "/v3/flight", { waitUntil: "domcontentloaded" }); ok("IDENTITÉ : le pass porte le nom du participant ; statut issu de la preuve serveur (le faux serveur le déclare voyageur vérifié), sans QR", (await vis(p.getByText(/Camille D\./i))) && (await p.getByText("Réservation vérifiée").count()) >= 1 && (await p.locator("canvas, img[alt*=QR]").count()) === 0);
  const legacy = await mk(A); await legacy.ctx.addCookies((await ctx.cookies()).filter((c) => c.name.startsWith("sb-"))); await legacy.p.goto(A + "/", { waitUntil: "domcontentloaded" }); ok("IDENTITÉ : l'ancienne adresse « / » ouvre l'accueil V3 avec le nom réel", await vis(legacy.p.getByTestId("identity-name").filter({ hasText: "Camille D." }))); await legacy.ctx.close();
  await p.goto(A + "/v3", { waitUntil: "domcontentloaded" }); await p.reload({ waitUntil: "domcontentloaded" }); ok("SESSION : persistante après rechargement (cookie de session)", await vis(p.getByTestId("identity-name")));

  // C4. États d'erreur : profil indisponible (migration non appliquée), panne
  await ctl({ profileTable: "missing" }); await p.goto(A + "/v3/account", { waitUntil: "domcontentloaded" });
  ok("MIGRATION NON APPLIQUÉE : « Le profil n'est pas encore disponible » (l'application reste utilisable, aucune erreur brute)", (await vis(p.getByText(/profil n.est pas encore disponible/))) && (await vis(p.getByTestId("account-email"))));
  await ctl({ profileTable: "ok", fail: { participant_profiles: { status: 500, body: { message: "db down" }, once: false } } }); await p.goto(A + "/v3/account", { waitUntil: "domcontentloaded" });
  ok("PANNE : « Compte indisponible » + Réessayer (jamais le texte brut du serveur)", (await vis(p.getByText("Compte indisponible"))) && (await p.getByText(/db down/).count()) === 0);
  await ctl({ fail: {} }); await p.getByRole("button", { name: "Réessayer" }).click(); ok("PANNE : « Réessayer » recharge le compte", await vis(p.locator("#p-first")));
  await ctl({ fail: { upsert_my_participant_profile: { status: 403, body: { code: "42501", message: "forbidden" } } } }); await p.locator("#p-display").fill("Camille X."); await p.getByRole("button", { name: "Enregistrer" }).click();
  ok("ENREGISTREMENT REFUSÉ par la base : message sûr « Accès non autorisé », profil inchangé", (await vis(p.getByText(/Accès non autorisé/))) && (await (await fetch(MOCK + "/__state")).json()).profiles.participant.display_name === "Camille D.");
  await ctl({ fail: {} });

  // C5. Déconnexion
  await p.goto(A + "/v3/account", { waitUntil: "domcontentloaded" }); await vis(p.locator("#p-first")); await p.getByRole("button", { name: "Se déconnecter" }).click(); await p.waitForURL("**/v3/login");
  ok("DÉCONNEXION : retour à la connexion ; session supprimée (cookies), pages personnelles de nouveau protégées", (await get(ctx, A + "/v3/account")).status() === 307 && (await (await get(ctx, A + "/api/participant/me")).json()).status === "anonymous");
  ok("DÉCONNEXION : uniquement en POST (un simple lien ne déconnecte pas)", (await get(ctx, A + "/auth/signout")).status() === 405);
  const evil = await ctx.request.post(A + "/auth/signout", { form: { to: "https://evil.example" }, maxRedirects: 0 }); ok("DÉCONNEXION : destination externe ignorée (liste fermée)", evil.status() === 303 && !/evil/.test(evil.headers().location || ""));

  // C6. Cohabitation avec STAFF HQ : permissions inchangées
  await p.goto(A + "/v3/login?next=/v3/account", { waitUntil: "domcontentloaded" }); await p.locator("#login-email").fill("tom@example.test"); await p.getByRole("button", { name: "Recevoir un code" }).click(); await p.locator("#login-code").fill("123456"); await p.getByRole("button", { name: "Se connecter" }).click();
  await p.waitForURL(/\/v3\/login\?denied=1/); ok("STAFF SEUL : un compte STAFF sans accès participants est REFUSÉ côté serveur (message explicite)", await vis(p.getByText(/n.a pas accès à l.espace participants/)));
  ok("STAFF SEUL : l'API d'identité répond « no_access » (aucun profil, aucune donnée)", (await (await get(ctx, A + "/api/participant/me")).json()).status === "no_access");
  await p.goto(A + "/v3", { waitUntil: "domcontentloaded" }); ok("STAFF SEUL : l'accueil indique « Compte sans accès participants » (aucun nom inventé)", await vis(p.getByTestId("identity-no-access")));
  ok("STAFF HQ INCHANGÉ : le même compte (Tom, administrateur) accède toujours à STAFF HQ", (await get(ctx, A + "/staff")).status() === 200 && (await get(ctx, A + "/staff/missions")).status() === 200);
  const crossLogin = await mk(A); await crossLogin.p.goto(A + "/v3/login", { waitUntil: "domcontentloaded" }); await crossLogin.p.locator("#login-email").fill("participant@example.test"); await crossLogin.p.getByRole("button", { name: "Recevoir un code" }).click(); await crossLogin.p.locator("#login-code").fill("123456"); await crossLogin.p.getByRole("button", { name: "Se connecter" }).click(); await crossLogin.p.waitForURL("**/v3/account");
  const sr = await get(crossLogin.ctx, A + "/staff/missions"); ok("STAFF HQ PROTÉGÉ : une session PARTICIPANT n'ouvre JAMAIS STAFF HQ (redirigée vers la connexion STAFF, accès refusé)", sr.status() === 307 && /\/staff\/login/.test(sr.headers().location || ""), sr.status() + " " + sr.headers().location);
  await ctl({ setAccount: { who: "participant", spaces: [] } }); ok("ACCÈS RETIRÉ : si l'accès « members » est retiré, la page personnelle est refusée immédiatement (revérifié à chaque requête)", (await get(crossLogin.ctx, A + "/v3/account")).status() === 307 && (await (await get(crossLogin.ctx, A + "/api/participant/me")).json()).status === "no_access");
  await ctl({ setAccount: { who: "participant", spaces: ["members"] } }); await crossLogin.ctx.close();

  // C7. Ergonomie 320 → 430 px
  const sess = await mk(A); await sess.p.goto(A + "/v3/login", { waitUntil: "domcontentloaded" }); await sess.p.locator("#login-email").fill("participant@example.test"); await sess.p.getByRole("button", { name: "Recevoir un code" }).click(); await sess.p.locator("#login-code").fill("123456"); await sess.p.getByRole("button", { name: "Se connecter" }).click(); await sess.p.waitForURL("**/v3/account");
  for (const [w, h] of [[320, 568], [375, 667], [390, 844], [430, 932]]) {
    await sess.p.setViewportSize({ width: w, height: h }); const rec = async (l, page, only) => { const r = await ergo(page, only); ok(`IPHONE ${w} px — ${l} : cibles ≥ 44 px, champs ≥ 16 px, sans débordement`, !r.small.length && !r.zoom.length && !r.hscroll, JSON.stringify(r)); };
    await sess.p.goto(A + "/v3/account", { waitUntil: "domcontentloaded" }); await vis(sess.p.locator("#p-first")); await rec("Mon compte", sess.p);
    await sess.p.goto(A + "/v3/profile", { waitUntil: "domcontentloaded" }); await vis(sess.p.getByTestId("account-link")); await rec("espace profil (bloc « Mon compte »)", sess.p, "[data-testid=account-link]");
    await p.setViewportSize({ width: w, height: h }); await p.goto(A + "/v3/login", { waitUntil: "domcontentloaded" }); await vis(p.locator("#login-email")); await rec("connexion", p);
    await sess.p.goto(A + "/v3", { waitUntil: "domcontentloaded" }); await vis(sess.p.getByTestId("identity-name")); ok(`IPHONE ${w} px — accueil avec identité réelle : sans débordement horizontal`, await sess.p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  }
  await sess.ctx.close();
  ok("AUCUNE erreur JavaScript", errs.length === 0, errs.slice(0, 3).join(" | "));
  await browser.close(); console.log(fails ? `\n${fails} ÉCHEC(S)` : "\nTous les tests E2E participants sont passés."); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
