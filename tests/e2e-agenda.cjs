/* eslint-disable */
// B3 phase 1 — Agenda, notifications STAFF, notifications participants (mode LOCAL / démonstration, serveur sur le port 3100).
// Vérifie les parcours, l'absence de demande d'autorisation push, la séparation STAFF / participants et l'ergonomie iPhone (320 → 430 px).
const { chromium } = require("playwright");
const B = process.env.BASE || "http://localhost:3100";
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d ? " — " + d : ""}`); if (!c) fails++; };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
(async () => {
  const browser = await chromium.launch(); const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const spy = () => { window.__push = { req: 0, sub: 0, reg: 0 }; try { if ("Notification" in window) { const o = Notification.requestPermission; Notification.requestPermission = function () { window.__push.req++; return o.apply(this, arguments); }; } } catch {} try { if (navigator.serviceWorker) { const r = navigator.serviceWorker.register; navigator.serviceWorker.register = function () { window.__push.reg++; return r.apply(this, arguments); }; } } catch {} try { if (window.PushManager) { const sub = PushManager.prototype.subscribe; PushManager.prototype.subscribe = function () { window.__push.sub++; return sub.apply(this, arguments); }; } } catch {} };
  await ctx.addInitScript(spy);
  const p = await ctx.newPage(); p.setDefaultTimeout(15000); p.on("pageerror", (e) => errs.push(e.message));
  const btn = (n) => p.getByRole("button", { name: n }); const dlg = () => p.getByRole("dialog");
  const vis = async (loc, t = 6000) => { try { await loc.first().waitFor({ state: "visible", timeout: t }); return true; } catch { return false; } };
  const login = async (who) => { await p.goto(B + "/staff/access"); await p.getByRole("button", { name: new RegExp("^" + who) }).click(); await p.waitForURL(B + "/staff"); await p.waitForTimeout(400); };
  const closeSheet = async () => { await p.keyboard.press("Escape"); await p.waitForTimeout(450); if (await dlg().count()) { await p.keyboard.press("Escape"); await p.waitForTimeout(400); } };
  const ergo = (page) => page.evaluate(() => {
    const root = document.querySelector("[role=dialog]") || document.body; const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
    const small = [], zoom = []; root.querySelectorAll("button, a[href], select, input:not([type=hidden]), textarea, [role=radio]").forEach((el) => { if (!vis(el)) return; const r = el.getBoundingClientRect(); if (r.width <= 2 && r.height <= 2) return;
      const name = ((el.getAttribute("aria-label") || el.textContent || el.tagName) + "").trim().slice(0, 28); if (el.hasAttribute("disabled") && el.tagName === "BUTTON") { if (r.height < 43.5) small.push(`${name} ${Math.round(r.width)}x${Math.round(r.height)}`); return; }
      if (r.height < 43.5 || r.width < 43.5) small.push(`${name} ${Math.round(r.width)}x${Math.round(r.height)}`); if (/INPUT|SELECT|TEXTAREA/.test(el.tagName) && el.type !== "checkbox" && parseFloat(getComputedStyle(el).fontSize) < 16) zoom.push(name); });
    const d = document.querySelector("[role=dialog]"); return { small, zoom, hscroll: document.documentElement.scrollWidth > window.innerWidth || (d ? d.scrollWidth > d.clientWidth + 1 : false) };
  });

  /* ---------- 1. Agenda : structure ---------- */
  await login("Tom"); await p.goto(B + "/staff/schedule"); await vis(p.getByText(/Votre agenda est vide/));
  ok("AGENDA : « Mon agenda » affiché par défaut ; vue « Équipe » proposée", (await btn(/^Mon agenda$/).getAttribute("aria-pressed")) === "true" && (await btn(/^Équipe$/).count()) === 1);
  ok("AGENDA : semaine de 7 jours, aujourd'hui repéré, navigation par semaine", (await p.getByRole("group", { name: "Jours de la semaine" }).getByRole("button").count()) === 7 && (await p.getByRole("button", { name: /aujourd'hui/ }).count()) === 1 && (await btn(/Semaine précédente/).count()) === 1 && (await btn(/Semaine suivante/).count()) === 1);
  ok("AGENDA : état vide soigné + section « À planifier » + un seul bouton principal « Ajouter »", (await p.getByText(/Votre agenda est vide/).count()) === 1 && (await p.getByText("Toutes vos tâches ont une date.").count()) === 1 && (await btn(/^Ajouter$/).count()) === 1);
  await p.screenshot({ path: "/tmp/agenda-empty.png" });

  /* ---------- 2. Tâche = MISSION B2 (même système) ---------- */
  await btn(/^Ajouter$/).click(); ok("AJOUT : un seul bouton principal ; choix simple et discret entre « Tâche » et « Réunion »", (await vis(btn(/^Tâche/))) && (await btn(/^Réunion/).count()) === 1);
  await btn(/^Tâche/).click(); await p.waitForTimeout(700); await vis(p.locator("#f-title"));
  ok("TÂCHE : la date du jour sélectionné est pré-remplie ; heure facultative proposée (mode local)", (await p.locator("#f-due").inputValue()) === plus(0) && (await p.locator("#f-time").count()) === 1);
  await p.locator("#f-title").fill("Préparer le briefing"); await p.locator("#f-time").fill("09:30"); await btn(/^Créer la mission$/).click();
  ok("TÂCHE : créée → la fiche mission s'ouvre (mêmes écrans que Missions)", (await vis(dlg().getByText("Préparer le briefing"))) && (await dlg().getByText(/à 09h30/).count()) === 1);
  await closeSheet();
  ok("AGENDA : la tâche apparaît le jour même avec son heure (09h30)", (await vis(p.getByText("Préparer le briefing"))) && (await p.getByText("09h30").count()) >= 1);
  await p.goto(B + "/staff/missions"); await vis(p.getByText("Préparer le briefing"));
  ok("MÊME SYSTÈME : la tâche de l'agenda est bien une mission (visible dans Missions, sans second système)", (await p.getByText("Préparer le briefing").count()) >= 1);

  /* ---------- 3. À planifier ---------- */
  await p.goto(B + "/staff/schedule"); await vis(btn(/^Ajouter$/)); await btn(/^Ajouter$/).click(); await btn(/^Tâche/).click(); await p.waitForTimeout(700); await vis(p.locator("#f-title"));
  await p.locator("#f-due").fill(""); await p.locator("#f-title").fill("Sans date"); await btn(/^Créer la mission$/).click(); await vis(dlg().getByText("Sans date")); await closeSheet();
  ok("À PLANIFIER : une tâche sans date est listée dans « À planifier »", await vis(p.getByRole("region", { name: "À planifier" }).getByText("Sans date")));
  await p.getByRole("region", { name: "À planifier" }).getByText("Sans date").click(); await btn(/Modifier les informations/).click(); await p.locator("#f-due").fill(plus(1)); await btn(/Enregistrer les informations/).click(); await vis(dlg().getByText("Sans date")); await closeSheet();
  ok("À PLANIFIER : une fois datée, elle quitte la section et rejoint le jour choisi (demain)", !(await vis(p.getByRole("region", { name: "À planifier" }).getByText("Sans date"), 1200)));

  /* ---------- 4. Réunions et événements (type distinct) ---------- */
  await btn(/^Ajouter$/).click(); await btn(/^Réunion/).click(); await p.waitForTimeout(700); await vis(p.locator("#ev-title"));
  await p.locator("#ev-title").fill("Point équipe"); await p.locator("#ev-start").fill("10:00"); await p.locator("#ev-end").fill("11:00"); await p.locator("#ev-place").fill("Salle A"); await btn(/^Créer l'événement$/).click();
  ok("ÉVÉNEMENT : créé, affiché avec le libellé « Réunion », distinct des missions", (await vis(p.getByText("Point équipe"))) && (await p.getByText(/^Réunion$/).count()) >= 1 && (await p.getByText("10h00").count()) >= 1);
  await p.getByText("Point équipe").first().click(); ok("ÉVÉNEMENT : la fiche indique horaire, lieu et visibilité ; mention « sur cet appareil » (aperçu)", (await vis(dlg().getByText("10h00 – 11h00"))) && (await dlg().getByText("Salle A").count()) === 1 && (await dlg().getByText(/uniquement/).count()) === 1);
  await dlg().getByRole("button", { name: /^Modifier$/ }).click(); await p.locator("#ev-title").fill("Point équipe v2"); await btn(/^Enregistrer$/).click(); ok("ÉVÉNEMENT : modifiable par son créateur", await vis(dlg().getByText("Point équipe v2")));
  await dlg().getByRole("button", { name: /^Supprimer$/ }).click(); await dlg().getByRole("button", { name: /^Supprimer$/ }).click(); await p.waitForTimeout(900); ok("ÉVÉNEMENT : suppression confirmée", (await p.getByText("Point équipe v2").count()) === 0);

  /* ---------- 5. Navigation jours / semaines ---------- */
  const label = () => p.locator("[aria-label='Semaine'] [role=status]").innerText();
  const w0 = await label(); await btn(/Semaine suivante/).click(); const w1 = await label();
  ok("NAVIGATION : semaine suivante change la période ; « Revenir à aujourd'hui » apparaît", w0 !== w1 && (await vis(btn(/Revenir à aujourd'hui/))));
  await p.getByRole("group", { name: "Jours de la semaine" }).getByRole("button").nth(2).click(); ok("NAVIGATION : un jour sans rien affiche « Rien de prévu ce jour-là »", await vis(p.getByText("Rien de prévu ce jour-là.")));
  await btn(/Revenir à aujourd'hui/).click(); ok("NAVIGATION : retour au jour courant", (await label()) === w0);

  /* ---------- 6. Vue Équipe ---------- */
  await btn(/^Ajouter$/).click(); await btn(/^Tâche/).click(); await p.waitForTimeout(700); await vis(p.locator("#f-title")); await p.locator("#f-title").fill("Mission de Graw"); await p.locator("#f-assignee").selectOption({ label: "Graw" }); await p.locator("#f-validator").selectOption({ label: "Tom" }); await btn(/^Créer la mission$/).click(); await vis(dlg().getByText("Mission de Graw")); await closeSheet();
  ok("MON AGENDA : n'affiche pas la mission d'un autre membre", !(await vis(p.getByText("Mission de Graw"), 1200)));
  await btn(/^Équipe$/).click(); ok("ÉQUIPE : la mission de Graw apparaît, avec son responsable", (await vis(p.getByText("Mission de Graw"))) && (await p.getByText("Graw").count()) >= 1);

  /* ---------- 7. Proposition (Qafard) puis acceptation (Tom) ---------- */
  await login("Qafard"); await p.goto(B + "/staff/schedule"); await vis(btn(/^Ajouter$/)); await btn(/^Ajouter$/).click(); await btn(/^Tâche/).click(); await p.waitForTimeout(700); await vis(p.locator("#f-title"));
  await p.locator("#f-title").fill("Idée de Qafard"); await p.locator("#f-assignee").selectOption({ label: "Tom" }); ok("PROPOSITION : un membre propose une tâche à un autre (message explicite)", await vis(p.getByText(/Proposition : vous restez responsable/)));
  await btn(/^Créer la mission$/).click(); await vis(dlg().getByText("Proposition en attente")); ok("PROPOSITION : aucun bouton Approuver pour le membre", (await dlg().getByRole("button", { name: /^Approuver$/ }).count()) === 0); await closeSheet();
  await login("Tom"); await p.goto(B + "/staff/schedule"); ok("PROPOSITION : l'administrateur voit « Propositions à traiter » dans l'agenda", await vis(p.getByRole("region", { name: "Propositions à traiter" }).getByText("Idée de Qafard")));
  ok("NOTIFICATIONS : la cloche signale des notifications non lues", (await vis(p.getByRole("link", { name: /Notifications — \d+ non lue/ }))));
  await p.getByRole("region", { name: "Propositions à traiter" }).getByText("Idée de Qafard").click(); await btn(/^Approuver$/).click(); ok("PROPOSITION : acceptation par l'administrateur → « Décision enregistrée. »", await vis(dlg().getByText("Décision enregistrée.")));
  await closeSheet();

  /* ---------- 8. Notifications STAFF ---------- */
  await login("Qafard"); await p.goto(B + "/staff/notifications"); await vis(p.getByText(/non lue|Tout est lu/));
  ok("NOTIFICATIONS STAFF : Qafard est prévenu que sa proposition a été acceptée (dérivé de l'historique réel)", await vis(p.getByText("Proposition acceptée")));
  const unreadBefore = await p.getByRole("status").first().innerText(); await p.getByText("Proposition acceptée").first().click({ trial: true }).catch(() => {});
  ok("NOTIFICATIONS STAFF : compteur de non lues, lien « Tout lire »", /non lue/i.test(unreadBefore) && (await btn(/Tout lire/).count()) === 1, JSON.stringify({ unreadBefore, tout: await btn(/Tout lire/).count() }));
  await btn(/Tout lire/).click(); ok("NOTIFICATIONS STAFF : « Tout lire » → « Tout est lu »", await vis(p.getByText("Tout est lu")));
  await btn(/^Non lues$/).click(); ok("NOTIFICATIONS STAFF : filtre « Non lues » vide → message explicite", await vis(p.getByText("Tout est lu.")));
  await btn(/^Toutes$/).click();
  await btn(/Préférences de notifications/).click(); ok("PRÉFÉRENCES : catégories (missions, propositions, validations, commentaires, rappels, annonces) + délai de rappel", (await dlg().getByRole("switch").count()) === 6 && (await dlg().getByRole("radio").count()) === 3);
  await dlg().getByRole("switch", { name: /Propositions/ }).evaluate((el) => el.click()); await closeSheet(); ok("PRÉFÉRENCES : désactiver « Propositions » masque ces notifications", !(await vis(p.getByText("Proposition acceptée"), 1200)));
  await btn(/Préférences de notifications/).click(); await dlg().getByRole("switch", { name: /Propositions/ }).evaluate((el) => el.click()); await closeSheet();
  ok("NOTIFICATIONS STAFF : Qafard (membre) n'a PAS l'envoi d'annonce", (await p.getByText("Écrire une annonce").count()) === 0);
  await login("Tom"); await p.goto(B + "/staff/notifications"); await vis(p.getByText("Écrire une annonce"));
  // rappel : tâche à échéance demain assignée à Tom
  await p.goto(B + "/staff/missions"); await btn(/Nouvelle mission/).click(); await p.locator("#f-title").fill("Rendre le plan"); await p.locator("#f-due").fill(plus(1)); await btn(/^Créer la mission$/).click(); await vis(dlg().getByText("Rendre le plan")); await closeSheet();
  await p.goto(B + "/staff/notifications"); ok("RAPPELS : « Échéance demain » généré pour mes missions", await vis(p.getByText("Échéance demain")));
  await p.getByRole("link", { name: /Rendre le plan/ }).first().click(); await p.waitForURL(/\/staff\/missions\?mission=/); ok("LIEN PROFOND : la notification ouvre directement la fiche de la mission concernée", await vis(dlg().getByText("Rendre le plan")));
  await closeSheet();
  await p.goto(B + "/staff/notifications"); await vis(p.getByText("Écrire une annonce")); await p.getByText("Écrire une annonce").click();
  ok("ANNONCE : aperçu annoncé « aucun message n'est envoyé » ; audiences Équipe STAFF / Tous les participants", (await vis(dlg().getByText(/aucun message n.est envoyé/))) && (await dlg().getByRole("radio").count()) === 2);
  await dlg().getByRole("radio", { name: /Tous les participants/ }).click(); await p.locator("#an-title").fill("Information importante"); await p.locator("#an-body").fill("Merci de lire le message.");
  await dlg().getByRole("button", { name: /^Vérifier$/ }).click(); ok("ANNONCE : l'envoi global exige une confirmation explicite (case à cocher, bouton inactif)", (await vis(dlg().getByText(/Envoi global/))) && (await dlg().getByRole("button", { name: /Confirmer/ }).isDisabled()));
  await dlg().getByRole("checkbox").check(); await dlg().getByRole("button", { name: /Confirmer/ }).click(); ok("ANNONCE : après confirmation, « Rien n'a été envoyé » (aucun envoi réel en phase 1)", await vis(dlg().getByText(/Rien n.a été envoyé/)));
  await closeSheet();
  // exemples de démonstration (toujours étiquetés)
  await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("skyline.staff.notifs")).forEach((k) => localStorage.removeItem(k))); await p.reload(); await vis(p.getByText(/non lue|Tout est lu/));
  /* ---------- 9. Push : aucune autorisation, aucun service worker ---------- */
  await btn(/Préférences de notifications/).click(); await vis(p.getByTestId("push-card"));
  const push = await p.evaluate(async () => ({ calls: window.__push, sw: "serviceWorker" in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0, perm: Notification.permission }));
  ok("PUSH : aucune demande d'autorisation, aucun abonnement, aucun service worker (appels espionnés = 0)", push.calls.req === 0 && push.calls.sub === 0 && push.calls.reg === 0 && push.sw === 0 && push.perm !== "granted", JSON.stringify(push));
  ok("PUSH : carte contextuelle dans les préférences, bouton d'activation inactif, texte explicatif", (await p.getByTestId("push-card").getByRole("button").isDisabled()) && (await p.getByTestId("push-card").getByText(/maître de l.activation/).count()) === 1);
  await closeSheet();

  /* ---------- 10. Notifications participants (expérience distincte) ---------- */
  const pp = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await pp.addInitScript(spy); const q = await pp.newPage(); q.setDefaultTimeout(15000); q.on("pageerror", (e) => errs.push(e.message));
  await q.goto(B + "/v3/notifications"); await vis(q.getByText("Rien pour le moment."));
  ok("PARTICIPANTS : boîte vide par défaut (aucun faux événement), explication des contenus à venir", (await q.getByText(/annonces d'artistes, les informations de vol/).count()) === 1 && (await q.getByText(/Exemple/).count()) === 0);
  ok("PARTICIPANTS : aucune donnée STAFF (pas de mission, ni de lien /staff)", (await q.locator("a[href^='/staff']").count()) === 0 && (await q.getByText(/mission|STAFF/i).count()) === 0);
  await q.getByRole("button", { name: /Voir des exemples/ }).click(); ok("PARTICIPANTS : exemples de démonstration, tous étiquetés « Exemple »", (await vis(q.getByText("Exemple de communication officielle"))) && (await q.getByText(/^Exemple$/).count()) === 5);
  ok("PARTICIPANTS : catégories propres (artistes, vol, programme, rappels, officielles)", (await q.getByText("Informations de vol").count()) >= 1 && (await q.getByText("Annonces d'artistes").count()) >= 1);
  await q.getByRole("button", { name: /Exemple de communication officielle/ }).click({ trial: true }).catch(() => {}); await q.getByRole("button", { name: /Tout lire/ }).click(); ok("PARTICIPANTS : « Tout lire »", await vis(q.getByText("Tout est lu")));
  await q.getByRole("button", { name: "Préférences" }).click(); ok("PARTICIPANTS : préférences par catégorie + carte push contextuelle (inactive)", (await vis(q.getByRole("dialog").getByRole("switch").first())) && (await q.getByRole("dialog").getByRole("switch").count()) === 5 && (await q.getByTestId("push-card").getByRole("button").isDisabled()));
  await q.getByRole("dialog").getByRole("switch", { name: /Informations de vol/ }).evaluate((el) => el.click()); await q.keyboard.press("Escape"); await q.waitForTimeout(500); ok("PARTICIPANTS : désactiver « Informations de vol » masque cette catégorie", (await q.getByText("Exemple d'information de vol").count()) === 0);
  const ppush = await q.evaluate(async () => ({ calls: window.__push, sw: (await navigator.serviceWorker.getRegistrations()).length })); ok("PARTICIPANTS : aucune demande d'autorisation, aucun abonnement, aucun service worker (appels espionnés = 0)", ppush.calls.req === 0 && ppush.calls.sub === 0 && ppush.calls.reg === 0 && ppush.sw === 0, JSON.stringify(ppush));
  await q.goto(B + "/v3/profile"); await q.getByRole("link", { name: /Ouvrir mes notifications/ }).click(); await q.waitForURL("**/v3/notifications"); ok("PARTICIPANTS : accès depuis Profil → Notifications", await vis(q.getByRole("heading", { level: 1, name: "Notifications" })));
  await q.goto(B + "/v3"); ok("PARTICIPANTS : cloche dans l'en-tête, vers la boîte", (await q.getByRole("link", { name: "Notifications" }).count()) >= 1);
  await q.goto(B + "/v3/profile"); await q.getByRole("radio", { name: "English" }).click(); await q.goto(B + "/v3/notifications"); ok("PARTICIPANTS : interface traduite en anglais", await vis(q.getByText(/Nothing yet|You are up to date|All caught up/)));
  await q.goto(B + "/v3/profile"); await q.getByRole("radio", { name: "Français" }).click();
  // STAFF → les participants n'ont aucun accès à la boîte STAFF
  const anon = await (await browser.newContext()).request.get(B + "/staff/notifications", { maxRedirects: 0 }); ok("SÉPARATION : la boîte STAFF est inaccessible sans session STAFF (redirection)", anon.status() === 307);

  /* ---------- 11. Ergonomie 320 / 375 / 390 / 430 ---------- */
  await login("Tom");
  for (const [w, h] of [[320, 568], [375, 667], [390, 844], [430, 932]]) {
    await p.setViewportSize({ width: w, height: h }); const rec = async (l, page = p) => { const r = await ergo(page); ok(`IPHONE ${w} px — ${l} : cibles ≥ 44 px, champs ≥ 16 px, sans débordement`, !r.small.length && !r.zoom.length && !r.hscroll, JSON.stringify(r)); };
    await p.goto(B + "/staff/schedule"); await vis(btn(/^Ajouter$/)); await rec("Agenda");
    await btn(/^Ajouter$/).click(); await vis(btn(/^Tâche/)); await rec("choix d'ajout"); await btn(/^Réunion/).click(); await p.waitForTimeout(700); await vis(p.locator("#ev-title")); await rec("formulaire d'événement"); await closeSheet();
    await p.goto(B + "/staff/notifications"); await vis(p.getByText(/non lue|Tout est lu/)); await rec("Notifications STAFF");
    await btn(/Préférences de notifications/).click(); await vis(p.getByTestId("push-card")); await rec("préférences STAFF"); await closeSheet();
    await q.setViewportSize({ width: w, height: h }); await q.goto(B + "/v3/notifications"); await vis(q.getByRole("heading", { level: 1 })); await rec("Notifications participants", q);
    await q.getByRole("button", { name: "Préférences" }).click(); await vis(q.getByTestId("push-card")); await rec("préférences participants", q); await q.keyboard.press("Escape"); await q.waitForTimeout(400);
    await q.goto(B + "/v3"); const hs = await q.evaluate(() => document.documentElement.scrollWidth > window.innerWidth); ok(`IPHONE ${w} px — en-tête participants (avec cloche) sans débordement`, !hs);
  }
  ok("AUCUNE erreur JavaScript", errs.length === 0, errs.slice(0, 3).join(" | "));
  await browser.close(); console.log(fails ? `\n${fails} ÉCHEC(S)` : "\nTous les tests E2E B3 (mode local) sont passés."); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
