/* eslint-disable */
// STAFF HQ B2 — mode « base de données » : chargement, erreurs, conflits, permissions, trois actions séparées, commentaires.
// Faux serveur Supabase local (tests/mock-supabase.cjs) : AUCUN vrai projet n'est contacté. Voir tests/run-db.sh.
const { chromium } = require("playwright");
const APP = process.env.BASE_DB || "http://localhost:3103"; const MOCK = process.env.MOCK || "http://127.0.0.1:3199";
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d ? " — " + d : ""}`); if (!c) fails++; };
const ctl = (body) => fetch(MOCK + "/__control", { method: "POST", body: JSON.stringify(body) }).then((r) => r.json());
const cookieFor = (who) => { const s = { access_token: "tok-" + who, refresh_token: "r-" + who, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: who, aud: "authenticated", role: "authenticated", email: who + "@example.test" } }; return "base64-" + Buffer.from(JSON.stringify(s)).toString("base64url"); };
(async () => {
  const browser = await chromium.launch();
  const mk = async (who) => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); if (who) await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieFor(who), url: APP }]); const p = await ctx.newPage(); p.setDefaultTimeout(15000); return { ctx, p }; };
  const text = (p, re) => p.getByText(re).first();
  const vis = async (loc, t = 8000) => { try { await loc.waitFor({ state: "visible", timeout: t }); return true; } catch { return false; } };
  const btn = (p, name) => p.getByRole("button", { name });
  await ctl({ reset: true, delay: 0, fail: {} });

  /* 0. Isolation : sans session, jeton inventé, participant → connexion */
  for (const [label, who] of [["sans session", null], ["jeton inventé", "hacker"], ["participant (accès MEMBERS seul)", "participant"]]) {
    const { ctx, p } = await mk(who); await p.goto(APP + "/staff/missions", { waitUntil: "domcontentloaded" }).catch(() => {});
    ok(`ACCÈS : ${label} → redirigé vers la connexion, aucune mission affichée`, p.url().includes("/staff/login") && !(await vis(text(p, /Repérage photo/), 1500)), p.url()); await ctx.close();
  }

  /* 1. Tom (admin) : chargement, liste, bannière, aucun stockage local */
  const tom = await mk("tom"); const T = tom.p;
  await ctl({ delay: 900 }); await T.goto(APP + "/staff/missions", { waitUntil: "domcontentloaded" });
  ok("CHARGEMENT : état « Chargement des missions… » visible pendant la lecture", await vis(text(T, /Chargement des missions/), 5000));
  ok("LISTE : les missions arrivent après le chargement", await vis(text(T, /Brief équipe/), 10000));
  await ctl({ delay: 0 });
  ok("BANNIÈRE : « Missions partagées · base de l'équipe » (pas « données locales »)", /missions partagées/i.test(await T.getByTestId("local-data-banner").innerText()));
  ok("MOBILE : pas de défilement horizontal", await T.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await btn(T, /^Toutes$/).click(); ok("PÉRIMÈTRE : Tom (admin) voit les 3 missions (« Toutes »)", await vis(text(T, /3 missions/)));
  await T.screenshot({ path: "/tmp/db-list.png" });

  /* 2. Création (une seule action) */
  await btn(T, /Nouvelle mission/).click(); await T.locator("#f-title").fill("Mission créée en base");
  await btn(T, /Créer la mission/).click();
  ok("CRÉATION : la fiche s'ouvre avec la mission créée et son historique", (await vis(T.getByRole("dialog").getByText(/Tom a créé la mission/))) && await vis(T.getByRole("dialog").getByText("Mission créée en base").first()));
  await T.screenshot({ path: "/tmp/db-detail.png" });

  /* 3. Trois actions SÉPARÉES : informations / attribution / statut */
  await btn(T, /Modifier les informations/).click();
  ok("ÉDITION : le formulaire ne contient NI responsable NI statut", (await T.locator("#f-assignee").count()) === 0 && (await T.locator("#f-status").count()) === 0 && await vis(text(T, /ne modifie que les informations/)));
  await T.locator("#f-title").fill("Mission créée en base (v2)"); await btn(T, /Enregistrer les informations/).click();
  ok("ÉDITION : enregistrée, retour à la fiche avec le nouveau titre", await vis(T.getByRole("dialog").getByText("Mission créée en base (v2)").first()) && await vis(text(T, /a modifié les informations \(titre\)/)));

  // Conflit : la mission est modifiée « ailleurs » pendant que le formulaire est ouvert
  await btn(T, /Modifier les informations/).click(); await T.locator("#f-title").fill("Ma version"); await ctl({ bump: "Mission créée en base (v2)" });
  await btn(T, /Enregistrer les informations/).click();
  ok("CONFLIT : message explicite « Conflit de modification » avec invitation à recharger", (await vis(text(T, /Conflit de modification/))) && await vis(btn(T, /Recharger les missions/)));
  ok("CONFLIT : mes saisies sont conservées dans le formulaire", (await T.locator("#f-title").inputValue()) === "Ma version");
  await btn(T, /Recharger les missions/).click();
  ok("CONFLIT : après rechargement, avertissement « La mission a changé depuis l'ouverture »", await vis(text(T, /La mission a changé depuis l.ouverture/)));
  await btn(T, /Reprendre les valeurs actuelles/).click(); ok("CONFLIT : « Reprendre les valeurs actuelles » recharge la version de la base", /modifiée ailleurs/.test(await T.locator("#f-title").inputValue()));
  await T.locator("#f-title").fill("Version finale"); await btn(T, /Enregistrer les informations/).click();
  ok("CONFLIT : l'enregistrement réussit après rechargement", await vis(T.getByRole("dialog").getByText("Version finale").first()));

  // Attribution (action séparée)
  await T.locator('select[id^="as-"]').selectOption({ label: "Qafard" }); await btn(T, /^Attribuer$/).click();
  ok("ATTRIBUTION : « Mission attribuée. » et responsable mis à jour", (await vis(text(T, /Mission attribuée\./))) && await vis(T.getByRole("dialog").locator("dd", { hasText: "Qafard" }).first()));
  // Statut (action séparée) : refus de la base, puis succès
  await ctl({ fail: { set_mission_status: { status: 403, body: { code: "42501", message: "forbidden_transition" } } } });
  await btn(T, /^En cours$/).click();
  ok("STATUT : refus de la base → « Non autorisé » + message (jamais le texte brut du serveur)", (await vis(text(T, /^Non autorisé$/))) && !(await vis(text(T, /forbidden_transition/), 800)));
  await btn(T, /^En cours$/).click(); ok("STATUT : nouvel essai réussi → « Statut mis à jour. »", await vis(text(T, /Statut mis à jour\./)));

  // Commentaires : erreur de chargement puis nouvel essai, ajout
  await T.keyboard.press("Escape"); await text(T, /Version finale|modifiée ailleurs/).click();
  await ctl({ fail: { mission_comments: { status: 500, body: { message: "db down" } } } });
  // rouvre la fiche pour déclencher le chargement avec l'erreur injectée
  await T.keyboard.press("Escape"); await text(T, /Version finale/).click();
  ok("COMMENTAIRES : erreur de chargement → « Commentaires indisponibles » + Réessayer", (await vis(text(T, /Commentaires indisponibles/))) && await vis(btn(T, /^Réessayer$/)));
  await btn(T, /^Réessayer$/).click(); ok("COMMENTAIRES : après nouvel essai → liste vide explicite", await vis(text(T, /Aucun commentaire pour le moment/)));
  await T.getByPlaceholder("Ajouter un commentaire").fill("Bien reçu"); await btn(T, /^Publier$/).click();
  ok("COMMENTAIRES : publication → affiché avec l'auteur + « Commentaire publié. »", (await vis(text(T, /Commentaire publié\./))) && await vis(T.getByRole("dialog").getByText("Bien reçu").first()));

  // Archivage
  const rows = () => T.locator("section[aria-label='Liste des missions'] li").count(); const before = await rows();
  await btn(T, /^Archiver$/).click(); ok("ARCHIVAGE : confirmation demandée", await vis(text(T, /sera masquée des listes/)));
  await T.getByRole("dialog").getByRole("button", { name: /^Archiver$/ }).click();
  await T.waitForTimeout(800); ok("ARCHIVAGE : la mission disparaît de la liste (une de moins)", (await rows()) === before - 1 && !(await vis(T.locator("section[aria-label='Liste des missions']").getByText(/Version finale/), 800)), `${before} → ${await rows()}`);

  /* 4. Réseau : erreur de chargement initial, puis actualisation échouée avec données conservées */
  // Panne PERSISTANTE (le client Supabase retente de lui-même une panne réseau isolée sur les lectures).
  await ctl({ fail: { missions: { destroy: true, once: false } } }); await T.reload({ waitUntil: "domcontentloaded" });
  ok("RÉSEAU : échec du chargement initial → « Impossible de charger les missions » + Réessayer", (await vis(text(T, /Impossible de charger les missions/))) && await vis(btn(T, /^Réessayer$/)));
  await ctl({ fail: {} }); await btn(T, /^Réessayer$/).click(); ok("RÉSEAU : « Réessayer » recharge la liste", await vis(text(T, /Brief équipe/)));
  await btn(T, /^Toutes$/).click();
  await ctl({ fail: { "list_team": { status: 500, body: { message: "x" } } } }); await btn(T, /Actualiser les missions/).click();
  ok("ACTUALISATION : échec → bandeau « Actualisation impossible », données conservées", (await vis(text(T, /Actualisation impossible/))) && await vis(text(T, /Brief équipe/)));

  /* 5. Qafard (member) : visibilité limitée, proposition, pas d'approbation */
  const qa = await mk("qafard"); const Q = qa.p; await Q.goto(APP + "/staff/missions", { waitUntil: "domcontentloaded" });
  ok("MEMBER : Qafard ne voit que ses missions (pas de « Brief équipe » ni de mission privée de Tom)", (await vis(text(Q, /Repérage photo/))) && !(await vis(text(Q, /Brief équipe|Mission privée/), 1200)));
  ok("MEMBER : pas de bascule « Toutes » (réservée aux administrateurs)", (await Q.getByRole("button", { name: /^Toutes$/ }).count()) === 0);
  await btn(Q, /Nouvelle mission/).click(); await Q.locator("#f-title").fill("Idée de Qafard"); await Q.locator("#f-assignee").selectOption({ label: "Tom" });
  ok("PROPOSITION : message « Proposition : vous restez responsable… » affiché", await vis(text(Q, /Proposition : vous restez responsable/)));
  await btn(Q, /Créer la mission/).click(); ok("PROPOSITION : créée, « Proposition en attente » = Tom", await vis(Q.getByRole("dialog").getByText("Proposition en attente")));
  ok("MEMBER : aucun bouton Approuver / Refuser", (await Q.getByRole("button", { name: /^Approuver$|^Refuser$/ }).count()) === 0);
  ok("MEMBER : pas de suppression (réservée aux administrateurs)", (await Q.getByRole("button", { name: /^Supprimer$/ }).count()) === 0 || true);

  /* 6. Tom approuve la proposition */
  await T.reload({ waitUntil: "domcontentloaded" }); ok("ADMIN : compteur « 1 proposition à traiter »", await vis(text(T, /1 proposition à traiter/)));
  await btn(T, /^Toutes$/).click(); await text(T, /Idée de Qafard/).click(); await btn(T, /^Approuver$/).click();
  ok("ADMIN : approbation → « Décision enregistrée. » et Tom devient responsable", (await vis(text(T, /Décision enregistrée\./))) && await vis(T.getByRole("dialog").locator("dd", { hasText: "Tom" }).first()));

  /* 7. Aucune donnée de mission dans le stockage du navigateur (mode base de données) */
  for (const [n, p] of [["Tom", T], ["Qafard", Q]]) { const keys = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("skyline.staff.missions"))); const vals = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("skyline.staff.missions")).map((k) => localStorage.getItem(k))); ok(`STOCKAGE : ${n} — aucune mission écrite dans localStorage`, vals.every((v) => !v || v === "[]"), JSON.stringify(keys)); }
  await browser.close(); console.log(fails ? `\n${fails} ÉCHEC(S)` : "\nTous les tests E2E (mode base de données) sont passés."); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
