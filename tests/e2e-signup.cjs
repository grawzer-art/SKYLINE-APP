/* eslint-disable */
// B4.2 — Inscription publique : fermée par défaut (404), configuration explicite, inscription par code, finalisation après lien magique, membre gratuit ≠ voyageur,
// comptes existants / STAFF / suspendu, aucune création de compte par la connexion STAFF, isolation entre comptes, ergonomie iPhone. FAUX serveur Supabase local.
// Serveurs (tests/run-participant.sh) : A=3105 (inscription désactivée) · D=3108 (inscription ouverte, CAPTCHA « none ») · E=3109 (ouverte, CAPTCHA manquant → erreur) · F=3110 (CAPTCHA Turnstile configuré).
const { chromium } = require("playwright");
const A = process.env.PART_A || "http://localhost:3105", D = process.env.SIGNUP_ON || "http://localhost:3108", E = process.env.SIGNUP_BAD || "http://localhost:3109", F = process.env.SIGNUP_CAP || "http://localhost:3110", MOCK = process.env.MOCK || "http://127.0.0.1:3199";
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d ? " — " + d : ""}`); if (!c) fails++; };
const ctl = (b) => fetch(MOCK + "/__control", { method: "POST", body: JSON.stringify(b) }).then((r) => r.json());
const state = () => fetch(MOCK + "/__state").then((r) => r.json());
(async () => {
  const browser = await chromium.launch(); const errs = []; await ctl({ reset: true, delay: 0, fail: {}, profileTable: "ok", clubTable: "ok", signupTable: "ok", otpRate: false });
  const mk = async (base) => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await ctx.addCookies([{ name: "sk_space", value: "members", url: base }]); const p = await ctx.newPage(); p.setDefaultTimeout(15000); p.on("pageerror", (e) => errs.push(e.message)); return { ctx, p }; };
  const vis = async (loc, t = 8000) => { try { await loc.first().waitFor({ state: "visible", timeout: t }); return true; } catch { return false; } };
  const status = (ctx, url) => ctx.request.get(url, { maxRedirects: 0 }).then((r) => r.status());
  const fillForm = async (p, who, o = {}) => { await p.locator("#s-first").fill(o.first ?? "Camille"); await p.locator("#s-last").fill(o.last ?? "Dupont"); if (o.display) await p.locator("#s-display").fill(o.display); await p.locator("#s-email").fill(`${who}@example.test`); if (o.terms !== false) await p.getByTestId("accept-terms").check(); if (o.adult !== false) await p.getByTestId("attest-adult").check(); };
  const signup = async (p, who, o = {}) => { await p.goto(D + "/v3/signup", { waitUntil: "domcontentloaded" }); await vis(p.locator("#s-first")); await fillForm(p, who, o); await p.getByRole("button", { name: "Recevoir un code" }).click(); await vis(p.locator("#login-code")); };

  /* ===== 1. Fermée par défaut ===== */
  { const { ctx, p } = await mk(A);
    ok("DÉSACTIVÉE (défaut) : /v3/signup et /v3/signup/complete n'existent pas (404)", (await status(ctx, A + "/v3/signup")) === 404 && (await status(ctx, A + "/v3/signup/complete")) === 404);
    await p.goto(A + "/v3/login", { waitUntil: "domcontentloaded" }); await vis(p.locator("#login-email")); ok("DÉSACTIVÉE : aucun lien « Créer un compte » sur la connexion", (await p.getByTestId("signup-link").count()) === 0);
    await p.locator("#login-email").fill("newbie1@example.test"); await p.getByRole("button", { name: "Recevoir un code" }).click(); await vis(p.locator("#login-code"));
    const st = await state(); ok("CONNEXION : ne crée JAMAIS de compte (create_user = false), même pour une adresse inconnue", st.otpLog.length === 1 && st.otpLog[0].create_user === false && !st.created.newbie1);
    await ctx.close(); }
  { const { ctx, p } = await mk(E); const r = await ctx.request.get(E + "/v3/signup", { maxRedirects: 0 }); const body = await r.text();
    ok("MAL CONFIGURÉE : erreur explicite 503 (variable citée, aucune valeur), jamais d'ouverture silencieuse", r.status() === 503 && /PARTICIPANT_CAPTCHA_PROVIDER/.test(body) && !/sb_publishable|secret/i.test(body));
    await p.goto(E + "/v3/login", { waitUntil: "domcontentloaded" }); await vis(p.locator("#login-email")); ok("MAL CONFIGURÉE : aucun lien d'inscription", (await p.getByTestId("signup-link").count()) === 0); await ctx.close(); }

  /* ===== 2. Formulaire ===== */
  const N1 = await mk(D); const p = N1.p;
  await p.goto(D + "/v3/login", { waitUntil: "domcontentloaded" }); await vis(p.locator("#login-email"));
  ok("OUVERTE : le lien « Créer un compte » apparaît sur la connexion", await vis(p.getByTestId("signup-link")));
  await p.getByTestId("signup-link").click(); await vis(p.locator("#s-first"));
  ok("FORMULAIRE : prénom, nom, nom affiché, e-mail, CGU, âge ; aucun mot de passe ; message « ne vaut pas réservation »", (await p.getByLabel(/mot de passe/i).count()) === 0 && (await vis(p.getByText(/ne vaut pas réservation/))) && (await p.locator("a[href='/legal/cgu']").count()) === 1);
  await p.getByRole("button", { name: "Recevoir un code" }).click();
  ok("VALIDATION : champs obligatoires, e-mail, CGU et âge signalés ; AUCUN code envoyé", (await vis(p.getByText("Le prénom est obligatoire."))) && (await vis(p.getByText(/adresse e-mail valide/))) && (await vis(p.getByText(/accepter les conditions/))) && (await vis(p.getByText(/au moins 18 ans/))) && (await state()).otpLog.length === 1);
  await p.locator("#s-first").fill("Camille"); ok("FORMULAIRE : le nom affiché suit le prénom", (await p.locator("#s-display").inputValue()) === "Camille");

  /* ===== 3. Inscription complète (code) ===== */
  await fillForm(p, "newbie1", { last: "Dupont", display: "Cam D." }); await p.getByRole("button", { name: "Recevoir un code" }).click(); await vis(p.locator("#login-code"));
  let st = await state(); ok("INSCRIPTION : la création d'utilisateur est demandée UNIQUEMENT par ce parcours (create_user = true)", st.otpLog.at(-1).create_user === true && st.created.newbie1 === true);
  ok("INSCRIPTION : message neutre, étape du code", await vis(p.getByText(/Si ce compte existe/)));
  await p.locator("#login-code").fill("000000"); await p.getByRole("button", { name: "Créer mon compte" }).click(); ok("CODE invalide → « Code invalide ou expiré. », aucun compte membre", (await vis(p.getByText("Code invalide ou expiré."))) && !(await state()).signups.newbie1);
  await p.locator("#login-code").fill("123456"); await p.getByRole("button", { name: "Créer mon compte" }).click(); await p.waitForURL("**/v3/account");
  st = await state(); const su = st.signups.newbie1;
  ok("CLAIM : le profil est créé côté serveur avec les noms saisis ; la requête ne contient AUCUN rôle / espace / identifiant", su && su.first === "Camille" && su.last === "Dupont" && su.display === "Cam D." && su.terms === "cgu-test-1" && JSON.stringify(su.role_args.sort()) === JSON.stringify(["p_adult", "p_display_name", "p_first_name", "p_last_name", "p_terms_version"]));
  await vis(p.getByTestId("account-email"));
  ok("COMPTE : adresse et nom réels (aucune identité de démonstration) ; statut « Compte membre · réservation non vérifiée »", /newbie1@example\.test/.test(await p.getByTestId("account-email").innerText()) && (await vis(p.getByTestId("account-status").filter({ hasText: "Compte membre · réservation non vérifiée" }))) && (await p.getByText(/Alex/).count()) === 0);
  const me = await (await N1.ctx.request.get(D + "/api/participant/me")).json(); ok("API : « ready », traveler = none, aucun rôle ni métadonnée", me.status === "ready" && me.traveler === "none" && me.profile.displayName === "Cam D." && !("role" in me) && !JSON.stringify(me).includes("user_metadata"));

  /* ===== 4. Membre gratuit ≠ voyageur vérifié ===== */
  await p.goto(D + "/v3/flight", { waitUntil: "domcontentloaded" }); await vis(p.getByRole("heading", { level: 1 }));
  ok("PASS : « Réservation à confirmer », aucun QR ni statut confirmé sans preuve serveur", (await vis(p.getByText(/Réservation à confirmer/))) && (await p.getByText(/Réservation confirmée/).count()) === 0 && (await vis(p.getByText(/à la confirmation/))) && (await p.locator("canvas, img[alt*=QR], svg[aria-label*=QR]").count()) === 0);
  await p.goto(D + "/v3/club/space", { waitUntil: "domcontentloaded" }); await vis(p.getByTestId("club-create")); await p.getByTestId("club-create").click(); await vis(p.locator("#club-pseudo")); await p.locator("#club-pseudo").fill("Skylar"); await p.getByTestId("club-save").click(); await vis(p.getByTestId("club-pseudo"));
  ok("CLUB (membre gratuit) : peut créer son profil CLUB PRIVÉ ; la publication est réservée aux voyageurs vérifiés (aucun interrupteur)", (await vis(p.getByTestId("club-traveler-only"))) && (await p.getByTestId("club-visibility").locator("input[role=switch]").count()) === 0 && (await state()).clubs.newbie1.visible === false);
  await p.goto(D + "/v3/club/members", { waitUntil: "domcontentloaded" }); ok("CLUB (membre gratuit) : annuaire fermé « Réservé aux voyageurs vérifiés » ; aucun membre, aucun profil fictif", (await vis(p.getByTestId("dir-traveler"))) && (await p.getByTestId("dir-list").count()) === 0 && !/Alba|Noé|Sacha/.test(await p.locator("body").innerText()));
  await p.goto(D + "/v3/club/messages", { waitUntil: "domcontentloaded" }); ok("CLUB (membre gratuit) : messagerie « Bientôt disponible »", await vis(p.getByTestId("club-soon")));

  /* ===== 5. Voyageur vérifié (preuve serveur) ===== */
  const T = await mk(D); const lp = T.p; await lp.goto(D + "/v3/login"); await lp.locator("#login-email").fill("lea@example.test"); await lp.getByRole("button", { name: "Recevoir un code" }).click(); await lp.locator("#login-code").fill("123456"); await lp.getByRole("button", { name: "Se connecter" }).click(); await lp.waitForURL("**/v3/account");
  ok("VOYAGEUR (réservation confirmée côté serveur) : statut « Voyageur · réservation vérifiée »", await vis(lp.getByTestId("account-status").filter({ hasText: "Voyageur · réservation vérifiée" })));
  await lp.goto(D + "/v3/club/space", { waitUntil: "domcontentloaded" }); await vis(lp.getByTestId("club-create")); await lp.getByTestId("club-create").click(); await vis(lp.locator("#club-pseudo")); await lp.locator("#club-pseudo").fill("Nova"); await lp.getByTestId("club-save").click(); await vis(lp.getByTestId("club-pseudo"));
  ok("VOYAGEUR : l'interrupteur de publication est disponible", (await lp.getByTestId("club-visibility").locator("input[role=switch]").count()) === 1);
  await T.ctx.close();

  /* ===== 6. Isolation entre deux inscrits ===== */
  const N2 = await mk(D); await signup(N2.p, "newbie2", { first: "Bruno", last: "Martin", display: "Bru" }); await N2.p.locator("#login-code").fill("123456"); await N2.p.getByRole("button", { name: "Créer mon compte" }).click(); await N2.p.waitForURL("**/v3/account"); await vis(N2.p.getByTestId("account-email"));
  const t2 = await N2.p.locator("body").innerText(); ok("ISOLATION : le second inscrit voit SES données, aucune trace du premier (nom, e-mail, profil CLUB)", /newbie2@/.test(t2) && !/newbie1|Camille|Dupont|Skylar|Cam D\./.test(t2));
  await N2.p.goto(D + "/v3/club/space", { waitUntil: "domcontentloaded" }); ok("ISOLATION : son espace CLUB est vide (pas le profil « Skylar »)", (await vis(N2.p.getByTestId("club-empty"))) && !/Skylar/.test(await N2.p.locator("body").innerText()));
  st = await state(); ok("ISOLATION : deux comptes distincts côté serveur", st.signups.newbie1.display === "Cam D." && st.signups.newbie2.display === "Bru");
  await N2.ctx.close();

  /* ===== 7. Finalisation après lien magique ===== */
  { const { ctx, p: q } = await mk(D); ok("FINALISATION : sans session → redirigée vers l'inscription", (await status(ctx, D + "/v3/signup/complete")) === 307);
    await ctl({ created: "newbie3" }); await q.goto(D + "/v3/login"); await q.locator("#login-email").fill("newbie3@example.test"); await q.getByRole("button", { name: "Recevoir un code" }).click(); await q.locator("#login-code").fill("123456"); await q.getByRole("button", { name: "Se connecter" }).click();
    await q.waitForURL(/\/v3\/login\?denied=1/); ok("LIEN MAGIQUE : adresse confirmée mais compte sans accès → pas d'accès aux pages personnelles", /denied=1/.test(q.url()) && !(await state()).signups.newbie3);
    await q.goto(D + "/v3/signup/complete", { waitUntil: "domcontentloaded" }); ok("FINALISATION : écran « Finaliser mon compte » avec l'adresse DÉJÀ confirmée", (await vis(q.getByTestId("complete-form"))) && /newbie3@example\.test/.test(await q.getByTestId("complete-email").innerText()));
    await q.getByRole("button", { name: "Créer mon compte" }).click(); ok("FINALISATION : validation (noms, CGU, âge) avant tout appel", (await vis(q.getByText("Le prénom est obligatoire."))) && !(await state()).signups.newbie3);
    await q.locator("#s-first").fill("Chloé"); await q.locator("#s-last").fill("Bernard"); await q.getByTestId("accept-terms").check(); await q.getByTestId("attest-adult").check(); await q.getByRole("button", { name: "Créer mon compte" }).click(); await q.waitForURL("**/v3/account");
    ok("FINALISATION : compte membre créé puis redirection vers « Mon compte »", (await state()).signups.newbie3?.first === "Chloé" && (await vis(q.getByTestId("account-email"))));
    ok("FINALISATION : un membre déjà actif est renvoyé vers son compte (pas de double création)", (await status(ctx, D + "/v3/signup/complete")) === 307);
    await ctx.close(); }

  /* ===== 8. Comptes existants, STAFF, suspendu ===== */
  { const x = await mk(D); await signup(x.p, "participant", { first: "Pat", last: "Ient" }); await x.p.locator("#login-code").fill("123456"); await x.p.getByRole("button", { name: "Créer mon compte" }).click(); await x.p.waitForURL("**/v3/account");
    ok("COMPTE EXISTANT (invité) : le parcours d'inscription agit comme une connexion ; aucune modification de ses droits ni de son profil", (await vis(x.p.getByTestId("account-email"))) && !(await state()).signups.participant); await x.ctx.close(); }
  { const x = await mk(D); await signup(x.p, "tom", { first: "Tom", last: "Staff" }); await x.p.locator("#login-code").fill("123456"); await x.p.getByRole("button", { name: "Créer mon compte" }).click(); await x.p.waitForURL(/\/v3\/login\?denied=1/);
    ok("COMPTE STAFF : l'inscription n'accorde AUCUN accès participants (refusé) et ne donne aucun droit", /denied=1/.test(x.p.url()) && !(await state()).signups.tom); await x.ctx.close(); }
  { await ctl({ suspend: "newbie1" }); const x = await mk(D); await signup(x.p, "newbie1", { first: "Camille", last: "Dupont" }); await x.p.locator("#login-code").fill("123456"); await x.p.getByRole("button", { name: "Créer mon compte" }).click();
    ok("COMPTE SUSPENDU : message « désactivé », jamais réactivé par l'inscription", (await vis(x.p.getByTestId("signup-error").filter({ hasText: /désactivé/ }))) && /signup/.test(x.p.url())); await x.ctx.close(); }
  { await ctl({ otpRate: true }); const x = await mk(D); await x.p.goto(D + "/v3/signup"); await vis(x.p.locator("#s-first")); await fillForm(x.p, "newbie2"); await x.p.getByRole("button", { name: "Recevoir un code" }).click();
    ok("LIMITE DE DÉBIT : message « Trop de tentatives », pas de passage à l'étape du code", (await vis(x.p.getByText(/Trop de tentatives/))) && (await x.p.locator("#login-code").count()) === 0); await ctl({ otpRate: false }); await x.ctx.close(); }
  { await ctl({ signupTable: "missing" }); const x = await mk(D); await signup(x.p, "newbie2"); await x.p.locator("#login-code").fill("123456"); await x.p.getByRole("button", { name: "Créer mon compte" }).click();
    ok("MIGRATION NON APPLIQUÉE : « L'inscription n'est pas encore disponible », aucune erreur brute", (await vis(x.p.getByText(/pas encore disponible/))) && !/PGRST|schema cache/.test(await x.p.locator("body").innerText())); await ctl({ signupTable: "ok" }); await x.ctx.close(); }

  /* ===== 9. CAPTCHA configuré ===== */
  { const x = await mk(F); await x.p.goto(F + "/v3/signup", { waitUntil: "domcontentloaded" }); await vis(x.p.locator("#s-first")); await fillForm(x.p, "newbie2"); const before = (await state()).otpLog.length;
    await x.p.getByRole("button", { name: "Recevoir un code" }).click(); ok("CAPTCHA : conteneur présent ; sans jeton le formulaire refuse l'envoi", (await x.p.getByTestId("captcha").count()) === 1 && (await vis(x.p.getByText(/contrôle anti-robot/))) && (await state()).otpLog.length === before); await x.ctx.close(); }

  /* ===== 10. STAFF HQ : connexion inchangée ===== */
  { const x = await mk(D); await x.p.goto(D + "/staff/login", { waitUntil: "domcontentloaded" }); await vis(x.p.locator("#login-email")); const n0 = (await state()).otpLog.length;
    await x.p.locator("#login-email").fill("inconnu@example.test"); await x.p.getByRole("button", { name: /code/i }).click(); await vis(x.p.locator("#login-code")); const s2 = await state();
    ok("STAFF : la connexion STAFF ne crée jamais de compte (create_user = false), pas de lien d'inscription, même avec l'inscription ouverte", s2.otpLog.length === n0 + 1 && s2.otpLog.at(-1).create_user === false && (await x.p.getByText(/Créer un compte|inscription/i).count()) === 0);
    ok("STAFF : /staff exige toujours une session STAFF (membre sans session → connexion)", (await status(x.ctx, D + "/staff/missions")) === 307); await x.ctx.close(); }
  { const m = await mk(D); await m.p.goto(D + "/v3/login"); await m.p.locator("#login-email").fill("lea@example.test"); await m.p.getByRole("button", { name: "Recevoir un code" }).click(); await m.p.locator("#login-code").fill("123456"); await m.p.getByRole("button", { name: "Se connecter" }).click(); await m.p.waitForURL("**/v3/account");
    const r = await m.ctx.request.get(D + "/staff/missions", { maxRedirects: 0 }); ok("STAFF : un membre/voyageur connecté ne peut pas entrer dans STAFF HQ (redirigé vers la connexion STAFF)", r.status() === 307 && /staff\/login/.test(r.headers()["location"] || "")); await m.ctx.close(); }

  /* ===== 11. Ergonomie iPhone ===== */
  { const x = await mk(D); for (const [w, h] of [[320, 568], [375, 667], [390, 844], [430, 932]]) {
      await x.p.setViewportSize({ width: w, height: h }); await x.p.goto(D + "/v3/signup", { waitUntil: "domcontentloaded" }); await vis(x.p.locator("#s-first"));
      const r = await x.p.evaluate(() => { const bad = []; document.querySelectorAll("main input:not([type=checkbox]), main button, main select, main textarea").forEach((el) => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); if (!b.width) return; if (b.height < 43.5) bad.push((el.id || el.textContent || "").slice(0, 16) + " h" + Math.round(b.height)); if (/INPUT|SELECT|TEXTAREA/.test(el.tagName) && parseFloat(cs.fontSize) < 16) bad.push(el.id + " font " + cs.fontSize); });
        document.querySelectorAll("main label:has(input[type=checkbox])").forEach((el) => { if (el.getBoundingClientRect().height < 43.5) bad.push("case h" + Math.round(el.getBoundingClientRect().height)); });
        return { bad, hs: document.documentElement.scrollWidth > innerWidth }; });
      ok(`IPHONE ${w} px — inscription : champs ≥ 16 px, cibles ≥ 44 px, sans débordement`, !r.bad.length && !r.hs, JSON.stringify(r));
      await x.p.locator("button[type=submit]").scrollIntoViewIfNeeded(); const hit = await x.p.evaluate(() => { const b = document.querySelector("button[type=submit]").getBoundingClientRect(); const top = document.elementFromPoint(b.x + b.width / 2, b.y + Math.min(b.height / 2, 10)); return b.bottom <= innerHeight + 1 && document.querySelector("button[type=submit]").contains(top); });
      ok(`IPHONE ${w} px — bouton « Recevoir un code » accessible en bas de page (pas de barre masquante)`, hit);
    } await x.ctx.close(); }

  await N1.ctx.close();
  ok("AUCUNE erreur JavaScript", errs.length === 0, errs.slice(0, 3).join(" | "));
  await browser.close(); console.log(fails ? `\n${fails} ÉCHEC(S)` : "\nTous les tests E2E INSCRIPTION sont passés."); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
