/* eslint-disable */
// B4.3 — Profil CLUB : deux participants distincts, création / modification / publication, annuaire des profils publiés uniquement, photo, absence de données fictives,
// isolation entre comptes, ergonomie iPhone. FAUX serveur Supabase local (aucun vrai projet). A = PARTICIPANT_AUTH=supabase (3105) · OFF = désactivée (3106).
const { chromium } = require("playwright");
const A = process.env.PART_A || "http://localhost:3105", OFF = process.env.PART_OFF || "http://localhost:3106", MOCK = process.env.MOCK || "http://127.0.0.1:3199";
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d ? " — " + d : ""}`); if (!c) fails++; };
const ctl = (b) => fetch(MOCK + "/__control", { method: "POST", body: JSON.stringify(b) }).then((r) => r.json());
const state = () => fetch(MOCK + "/__state").then((r) => r.json());
const FICTIVE = /\b(Alba|Noé|Maëlys|Sacha|Inès|Zoé|Léo|Alex)\b/;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
(async () => {
  const browser = await chromium.launch(); const errs = []; await ctl({ reset: true, delay: 0, fail: {}, profileTable: "ok", clubTable: "ok", setAccount: { who: "participant", spaces: ["members"] } });
  const mk = async (base) => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await ctx.addCookies([{ name: "sk_space", value: "members", url: base }]); const p = await ctx.newPage(); p.setDefaultTimeout(15000); p.on("pageerror", (e) => errs.push(e.message)); return { ctx, p }; };
  const vis = async (loc, t = 8000) => { try { await loc.first().waitFor({ state: "visible", timeout: t }); return true; } catch { return false; } };
  const login = async (p, who) => { await p.goto(A + "/v3/login", { waitUntil: "domcontentloaded" }); await p.locator("#login-email").fill(`${who}@example.test`); await p.getByRole("button", { name: "Recevoir un code" }).click(); await p.locator("#login-code").fill("123456"); await p.getByRole("button", { name: "Se connecter" }).click(); await p.waitForURL("**/v3/account"); };
  const go = async (p, path, waitFor) => { await p.goto(A + path, { waitUntil: "domcontentloaded" }); if (waitFor) await vis(waitFor); };

  /* ===== 0. Authentification désactivée : prototype de démonstration inchangé ===== */
  { const { ctx, p } = await mk(OFF); await p.goto(OFF + "/v3/club/space", { waitUntil: "domcontentloaded" });
    ok("DÉSACTIVÉ : My Space = prototype de démonstration (formulaire local), aucun appel au profil réel", (await vis(p.getByRole("heading", { level: 1 }))) && (await p.getByTestId("club-empty").count()) === 0 && (await p.getByRole("button", { name: /modifier|edit/i }).count()) > 0);
    await ctx.close(); }

  /* ===== 1. Participant 1 : compte sans profil CLUB ===== */
  const P1 = await mk(A); const p1 = P1.p; await login(p1, "participant");
  await go(p1, "/v3/club/space", p1.getByTestId("club-empty"));
  ok("ÉTAT VIDE : pas de profil CLUB → invitation à le créer ; AUCUN nom fictif (Alex, Alba…), aucun profil inventé", (await vis(p1.getByTestId("club-empty"))) && !FICTIVE.test(await p1.locator("main, body").first().innerText()));
  await go(p1, "/v3/club/members", p1.getByTestId("dir-closed"));
  ok("ANNUAIRE : sans profil CLUB, l'annuaire est fermé (aucun membre fictif)", (await vis(p1.getByTestId("dir-closed"))) && (await p1.getByTestId("dir-list").count()) === 0);
  await go(p1, "/v3/club/messages", p1.getByTestId("club-soon")); ok("MESSAGES : « Bientôt disponible », aucune conversation fictive", (await vis(p1.getByTestId("club-soon"))) && !FICTIVE.test(await p1.locator("body").innerText()));

  /* ===== 2. Création ===== */
  await go(p1, "/v3/club/space", p1.getByTestId("club-create")); await p1.getByTestId("club-create").click(); await vis(p1.locator("#club-pseudo"));
  await p1.locator("#club-pseudo").fill("x"); await p1.getByTestId("club-save").click(); ok("VALIDATION : pseudo trop court → message, rien n'est enregistré", (await vis(p1.getByText(/au moins 2 caractères/))) && Object.keys((await state()).clubs).length === 0);
  await p1.locator("#club-pseudo").fill("contact@ex.fr"); await p1.getByTestId("club-save").click(); ok("VALIDATION : e-mail / lien dans le pseudo refusés", (await vis(p1.getByText(/ni lien, ni @, ni e-mail/))) && Object.keys((await state()).clubs).length === 0);
  await p1.locator("#club-pseudo").fill("Skylar"); await p1.locator("#club-city").selectOption("Paris"); await p1.locator("#club-bio").fill("Premier rang, toujours."); await p1.getByRole("button", { name: "House", exact: true }).click(); await p1.getByRole("button", { name: "Techno", exact: true }).click();
  await p1.getByTestId("club-save").click(); await vis(p1.getByTestId("club-pseudo"));
  let st = await state();
  ok("CRÉATION : profil enregistré sous SON compte, visibilité DÉSACTIVÉE par défaut", (await p1.getByTestId("club-pseudo").textContent()) === "Skylar" && st.clubs.participant?.pseudo === "Skylar" && st.clubs.participant.visible === false && (await p1.getByTestId("club-visibility").getAttribute("data-visible")) === "false");
  ok("CRÉATION : le profil CLUB ne contient ni e-mail ni nom légal (séparé de l'identité privée)", !/example\.test|Camille|Dupont/.test(JSON.stringify(st.clubs)));
  await p1.reload({ waitUntil: "domcontentloaded" }); await vis(p1.getByTestId("club-pseudo")); ok("PERSISTANCE : après rechargement, le profil est relu depuis la base", (await p1.getByTestId("club-pseudo").textContent()) === "Skylar" && /Premier rang/.test(await p1.getByTestId("club-bio").textContent()));

  /* ===== 3. Participant 2 : autre compte ===== */
  const P2 = await mk(A); const p2 = P2.p; await login(p2, "lea");
  await go(p2, "/v3/club/space", p2.getByTestId("club-empty"));
  ok("ISOLATION : le second participant ne voit PAS le profil du premier (état vide, aucune donnée de « Skylar »)", (await vis(p2.getByTestId("club-empty"))) && !/Skylar|Premier rang/.test(await p2.locator("body").innerText()));
  await p2.getByTestId("club-create").click(); await vis(p2.locator("#club-pseudo")); await p2.locator("#club-pseudo").fill("Nova"); await p2.locator("#club-city").selectOption("Lille"); await p2.getByRole("button", { name: "Disco", exact: true }).click(); await p2.getByTestId("club-save").click(); await vis(p2.getByTestId("club-pseudo"));
  st = await state(); ok("CRÉATION (2e compte) : profil distinct, privé par défaut ; deux profils indépendants", st.clubs.lea.pseudo === "Nova" && st.clubs.lea.visible === false && st.clubs.participant.pseudo === "Skylar");

  /* ===== 4. Publication volontaire / réciprocité ===== */
  await p2.getByTestId("club-visibility").locator("label").click(); await p2.waitForFunction(() => document.querySelector("[data-testid=club-visibility]")?.getAttribute("data-visible") === "true");
  ok("PUBLICATION : Léa publie son profil (action volontaire) ; l'état est persisté", (await state()).clubs.lea.visible === true);
  await go(p1, "/v3/club/members", p1.getByTestId("dir-closed")); ok("RÉCIPROCITÉ : le participant 1 n'a pas publié → il ne voit pas Nova", (await vis(p1.getByTestId("dir-closed"))) && !/Nova/.test(await p1.locator("body").innerText()));
  await p1.getByTestId("dir-publish").click(); await vis(p1.getByTestId("dir-list"));
  const dirText = await p1.getByTestId("dir-list").innerText();
  ok("ANNUAIRE : après publication, seuls les profils PUBLIÉS des autres apparaissent (Nova), jamais soi-même, jamais de fictif", /Nova/.test(dirText) && !/Skylar/.test(dirText) && !FICTIVE.test(await p1.locator("body").innerText()));
  await p1.getByRole("link", { name: /Nova/ }).click(); await vis(p1.getByTestId("member-card"));
  const card = await p1.getByTestId("member-card").innerText(); const body1 = await p1.locator("body").innerText();
  ok("FICHE : seuls les champs publics (pseudo, ville, goûts) ; ni e-mail, ni nom, ni réservation, ni rôle", /Nova/i.test(card) && /Lille/i.test(card) && /Disco/i.test(card) && !/lea@|example\.test|Léa|@|réservation confirmée|admin|staff/i.test(body1));
  await go(p2, "/v3/club/members", p2.getByTestId("dir-list")); ok("ANNUAIRE (2e compte) : Skylar est visible une fois publié ; Nova (soi) absent", /Skylar/.test(await p2.getByTestId("dir-list").innerText()) && !/Nova/.test(await p2.getByTestId("dir-list").innerText()));
  await p2.getByRole("searchbox", { name: /Rechercher/ }).fill("zzz"); ok("RECHERCHE : aucun résultat → état vide propre", await vis(p2.getByText(/Aucun membre à afficher/)));
  // Masquer
  await go(p1, "/v3/club/space", p1.getByTestId("club-visibility")); await p1.getByTestId("club-visibility").locator("label").click(); await p1.waitForFunction(() => document.querySelector("[data-testid=club-visibility]")?.getAttribute("data-visible") === "false");
  await go(p2, "/v3/club/members", p2.getByTestId("dir-list")); ok("CONFIDENTIALITÉ : masqué, le profil disparaît immédiatement de l'annuaire des autres", (await p2.getByTestId("dir-list").count()) === 0 || !/Skylar/.test(await p2.getByTestId("dir-list").innerText().catch(() => "")));
  const pid = "c" + "4444444-4444-4444-8444-444444444444".slice(0); await go(p2, `/v3/club/members/${pid}`, p2.getByRole("heading", { level: 1 }));
  ok("CONFIDENTIALITÉ : la fiche d'un profil masqué est introuvable (accès direct par identifiant)", (await vis(p2.getByText(/Profil introuvable/))) || (await vis(p2.getByText(/Publiez votre profil/))));

  /* ===== 5. Modification ===== */
  await go(p1, "/v3/club/space", p1.getByTestId("club-edit")); await p1.getByTestId("club-edit").click(); await vis(p1.locator("#club-pseudo"));
  ok("MODIFICATION : le formulaire est prérempli avec SON profil", (await p1.locator("#club-pseudo").inputValue()) === "Skylar" && (await p1.locator("#club-city").inputValue()) === "Paris");
  await p1.locator("#club-pseudo").fill("Skylar B"); await p1.locator("#club-bio").fill("Nouvelle bio"); await p1.getByTestId("club-save").click(); await p1.waitForFunction(() => document.querySelector("[data-testid=club-pseudo]")?.textContent === "Skylar B");
  st = await state(); ok("MODIFICATION : enregistrée, la visibilité n'a pas changé (reste masquée)", st.clubs.participant.pseudo === "Skylar B" && st.clubs.participant.bio === "Nouvelle bio" && st.clubs.participant.visible === false);
  await p1.getByTestId("club-edit").click(); await vis(p1.locator("#club-pseudo")); await p1.locator("#club-pseudo").fill("Nope"); await p1.getByRole("button", { name: "Annuler" }).click();
  ok("MODIFICATION : « Annuler » ne modifie rien", (await state()).clubs.participant.pseudo === "Skylar B");

  /* ===== 6. Photo ===== */
  await p1.getByTestId("club-edit").click(); await vis(p1.locator("#club-pseudo")); await p1.getByTestId("club-file").setInputFiles({ name: "p.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") });
  ok("PHOTO : format non pris en charge → refus", await vis(p1.getByText(/Format non pris en charge/)));
  await p1.getByTestId("club-file").setInputFiles({ name: "p.png", mimeType: "image/png", buffer: PNG });
  await p1.waitForFunction(() => document.querySelectorAll("[role=dialog] img").length > 0, null, { timeout: 10000 }).catch(() => {});
  st = await state(); const path = st.clubs.participant.avatar_path;
  ok("PHOTO : recompressée par le navigateur puis envoyée dans SON dossier privé ; chemin enregistré via la fonction", /^44444444-4444-4444-8444-444444444444\/avatar-[a-z0-9]+\.(webp|jpg)$/.test(path || "") && st.files[path] === true, String(path));
  ok("PHOTO : affichée via une URL signée (stockage privé)", (await p1.locator("[role=dialog] img").count()) > 0);
  await p1.getByRole("button", { name: "Retirer" }).click(); await p1.waitForFunction(() => document.querySelectorAll("[role=dialog] img").length === 0, null, { timeout: 8000 }).catch(() => {});
  st = await state(); ok("PHOTO : retrait → chemin effacé et fichier supprimé", st.clubs.participant.avatar_path === null && Object.keys(st.files).length === 0);
  await p1.getByRole("button", { name: "Annuler" }).click();

  /* ===== 7. Identité privée vs CLUB : écrans ===== */
  await go(p1, "/v3/profile", p1.getByTestId("profile-name")); ok("PROFIL : le nom affiché vient du COMPTE (jamais de pseudo de démonstration) ; pas de bloc de simulation", !FICTIVE.test(await p1.locator("body").innerText()) && (await p1.getByText("Communauté", { exact: true }).count()) === 0);
  await go(p1, "/v3/club", p1.getByRole("heading", { level: 1 })); ok("CLUB : tuiles réelles (My Space, Members) accessibles ; Messages « Bientôt » ; pas d'invitation simulée", (await vis(p1.getByText("Bientôt").first())) && (await p1.getByText(/Rejoindre|Join/i).count()) === 0);
  await go(p1, "/v3/flight", p1.getByRole("heading", { level: 1 })); ok("PASS : aucun QR code valide sans réservation vérifiée (emplacement « à la confirmation »)", (await p1.locator("svg[aria-label*=QR], canvas, img[alt*=QR]").count()) === 0 && (await vis(p1.getByText(/à la confirmation/))) && (await vis(p1.getByText(/Réservation à confirmer/))));

  /* ===== 8. Indisponible (migration non appliquée) ===== */
  await ctl({ clubTable: "missing" }); await go(p1, "/v3/club/space", p1.getByRole("alert")); ok("MIGRATION NON APPLIQUÉE : message clair « pas encore disponible », aucune erreur brute", (await vis(p1.getByText(/pas encore disponible/))) && !/PGRST|schema cache/.test(await p1.locator("body").innerText())); await ctl({ clubTable: "ok" });

  /* ===== 9. Changement de compte sur le même navigateur : aucune fuite ===== */
  await p1.goto(A + "/auth/signout", { waitUntil: "domcontentloaded" }).catch(() => {});
  await p1.evaluate(async () => { await fetch("/auth/signout", { method: "POST" }); }); await login(p1, "lea"); await go(p1, "/v3/club/space", p1.getByTestId("club-pseudo"));
  ok("CHANGEMENT DE COMPTE : le même navigateur, reconnecté en Léa, affiche Nova — aucune trace de « Skylar »", (await p1.getByTestId("club-pseudo").textContent()) === "Nova" && !/Skylar/.test(await p1.locator("body").innerText()));

  /* ===== 10. Ergonomie iPhone ===== */
  const sess = await mk(A); await login(sess.p, "participant");
  for (const [w, h] of [[320, 568], [375, 667], [390, 844], [430, 932]]) {
    await sess.p.setViewportSize({ width: w, height: h }); await go(sess.p, "/v3/club/space", sess.p.getByTestId("club-edit"));
    ok(`IPHONE ${w} px — My Space : sans débordement horizontal`, await sess.p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await sess.p.getByTestId("club-edit").click(); await vis(sess.p.locator("#club-pseudo"));
    const r = await sess.p.evaluate(() => { const d = document.querySelector("[role=dialog]"); const bad = []; d.querySelectorAll("input:not(.sr-only), select, textarea").forEach((el) => { const cs = getComputedStyle(el); const b = el.getBoundingClientRect(); if (b.width && parseFloat(cs.fontSize) < 16) bad.push(el.id + " font " + cs.fontSize); if (b.width && b.height < 43.5) bad.push(el.id + " h " + Math.round(b.height)); }); d.querySelectorAll("button").forEach((el) => { const b = el.getBoundingClientRect(); if (b.width && b.height < 43.5) bad.push((el.textContent || "").slice(0, 12) + " " + Math.round(b.height)); }); return { bad, hs: document.documentElement.scrollWidth > innerWidth }; });
    ok(`IPHONE ${w} px — formulaire CLUB : champs ≥ 16 px (pas de zoom iOS), cibles ≥ 44 px`, !r.bad.length && !r.hs, JSON.stringify(r));
    await sess.p.locator("#club-bio").focus(); await sess.p.locator("#club-bio").scrollIntoViewIfNeeded();
    const hit = await sess.p.evaluate(() => { const b = document.querySelector("[data-testid=club-save]"); const r = b.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { inView: r.bottom <= innerHeight && r.top >= 0, onTop: b.contains(top) }; });
    ok(`IPHONE ${w} px — bouton « Enregistrer » visible et non masqué par la navigation (barre collante)`, hit.inView && hit.onTop, JSON.stringify(hit));
    await sess.p.getByRole("button", { name: "Annuler" }).click();
    await go(sess.p, "/v3/club/members", sess.p.getByTestId("dir-closed")); ok(`IPHONE ${w} px — Members : sans débordement`, await sess.p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  }
  await sess.ctx.close(); await P1.ctx.close(); await P2.ctx.close();
  ok("AUCUNE erreur JavaScript", errs.length === 0, errs.slice(0, 3).join(" | "));
  await browser.close(); console.log(fails ? `\n${fails} ÉCHEC(S)` : "\nTous les tests E2E CLUB sont passés."); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
