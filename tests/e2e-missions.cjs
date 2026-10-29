/* eslint-disable */
// MISSIONS : création, modification, statuts, validation, filtres, suppression, persistance, retards, droits, mobiles.
// Persistance LOCALE : tous les rôles partagent le localStorage d'UN appareil (le test change de compte sur le même appareil).
const { chromium } = require("playwright");
const B = process.env.BASE || "http://localhost:3100";
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d ? " — " + d : ""}`); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch();
  const mk = async (o = {}) => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...o }); await ctx.addCookies([{ name: "sk_space", value: "staff", url: B }]); const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message)); return { ctx, p, errs }; };
  const login = (ctx, a) => ctx.request.post(B + "/api/demo-session", { form: { account: a, next: "/staff" }, maxRedirects: 0 });
  const open = async (p) => { await p.goto(B + "/staff/missions"); await p.waitForTimeout(1100); };
  const dialog = (p) => p.getByRole("dialog");
  const create = async (p, f) => {
    await p.getByRole("button", { name: /Nouvelle mission/ }).first().click(); await p.waitForTimeout(500);
    if (f.title !== undefined) await dialog(p).getByLabel("Titre *").fill(f.title);
    if (f.desc) await dialog(p).getByLabel("Description").fill(f.desc);
    if (f.assignee) await dialog(p).getByLabel("Responsable").selectOption({ label: f.assignee });
    if (f.validator) await dialog(p).getByLabel("Validation par").selectOption({ label: f.validator });
    if (f.due) await dialog(p).getByLabel("Échéance").fill(f.due);
    if (f.prio) await dialog(p).getByRole("radio", { name: f.prio }).click();
    if (f.status) await dialog(p).getByLabel("Statut").selectOption({ label: f.status });
    await dialog(p).getByRole("button", { name: "Enregistrer" }).click(); await p.waitForTimeout(500);
  };
  const closeSheet = async (p) => { await p.keyboard.press("Escape"); await p.waitForTimeout(500); };
  const card = (p, t) => p.getByRole("button", { name: new RegExp(t) }).filter({ hasNot: p.getByRole("dialog") });
  const counts = async (p) => (await p.getByLabel("Compteurs").innerText()).replace(/\s+/g, " ");

  /* A. Qafard : parcours complet */
  {
    const { ctx, p, errs } = await mk(); await login(ctx, "qafard"); await open(p);
    ok("MISSIONS : titre, compteurs à 0, « Mes missions », mention de persistance locale", (await p.getByRole("heading", { level: 1, name: "Missions" }).count()) === 1 && /0 À faire 0 En cours 0 Terminées/i.test(await counts(p)) && (await p.getByText(/Enregistré sur cet appareil uniquement/).count()) === 1 && (await p.getByText("Mes missions", { exact: true }).count()) >= 1);
    ok("MISSIONS : Qafard (non coordinateur) n'a pas la vue « Toutes » ni les exemples", (await p.getByRole("button", { name: "Toutes", exact: true }).count()) === 0 && (await p.getByText(/Charger 4 missions/).count()) === 0);
    ok("MISSIONS : état vide clair", (await p.getByText("Aucune mission pour le moment.").count()) === 1);
    await p.getByRole("button", { name: /Nouvelle mission/ }).first().click(); await p.waitForTimeout(500);
    await dialog(p).getByRole("button", { name: "Enregistrer" }).click(); await p.waitForTimeout(300);
    ok("CRÉATION : titre obligatoire (erreur affichée, rien créé)", (await dialog(p).getByRole("alert").filter({ hasText: "titre est obligatoire" }).count()) === 1);
    ok("CRÉATION : Qafard ne peut choisir que lui-même comme responsable ; « Terminée » absente du statut", (await dialog(p).getByLabel("Responsable").locator("option").allInnerTexts()).join() === "Qafard" && !(await dialog(p).getByLabel("Statut").locator("option").allInnerTexts()).includes("Terminée"));
    ok("CRÉATION : la validation ne peut pas être confiée à l'assigné", !(await dialog(p).getByLabel("Validation par").locator("option").allInnerTexts()).includes("Qafard"));
    await dialog(p).getByLabel("Titre *").fill("Repérage photo plage"); await dialog(p).getByLabel("Description").fill("Repérer trois spots.");
    await dialog(p).getByLabel("Échéance").fill("2099-05-20"); await dialog(p).getByRole("radio", { name: "Haute" }).click(); await dialog(p).getByLabel("Statut").selectOption({ label: "En cours" });
    await dialog(p).getByRole("button", { name: "Enregistrer" }).click(); await p.waitForTimeout(600);
    ok("CRÉATION : la fiche de la mission s'ouvre (responsable Qafard, validation Tom, historique « a créé »)", (await dialog(p).getByText("Repérage photo plage").count()) >= 1 && (await dialog(p).getByText("Validation par").count()) === 1 && (await dialog(p).getByText("Tom", { exact: true }).count()) >= 1 && (await dialog(p).getByText(/a créé la mission/).count()) === 1);
    await closeSheet(p);
    ok("SUIVI : compteurs mis à jour (1 en cours) et carte compacte visible", /0 À faire 1 En cours 0 Terminées/i.test(await counts(p)) && (await p.getByRole("button", { name: /Repérage photo plage/ }).count()) === 1);
    await p.reload(); await p.waitForTimeout(1300);
    ok("PERSISTANCE : la mission est toujours là après rechargement", (await p.getByRole("button", { name: /Repérage photo plage/ }).count()) === 1 && /1 En cours/i.test(await counts(p)));
    // Modification
    await p.getByRole("button", { name: /Repérage photo plage/ }).click(); await p.waitForTimeout(500);
    await dialog(p).getByRole("button", { name: "Modifier" }).click(); await p.waitForTimeout(400);
    await dialog(p).getByLabel("Titre *").fill("Repérage photo plage + calanque"); await dialog(p).getByRole("radio", { name: "Urgente" }).click(); await dialog(p).getByRole("button", { name: "Enregistrer" }).click(); await p.waitForTimeout(600);
    ok("MODIFICATION : titre et priorité mis à jour, historique « a modifié »", (await dialog(p).getByText("Repérage photo plage + calanque").count()) >= 1 && (await dialog(p).getByText(/Priorité urgente/).count()) === 1 && (await dialog(p).getByText(/a modifié la mission/).count()) === 1);
    // Statuts
    ok("STATUT : l'assigné peut envoyer en validation, mais n'a aucun bouton « Terminée »", (await dialog(p).getByRole("button", { name: "Envoyer en validation" }).count()) === 1 && (await dialog(p).getByRole("button", { name: "Terminée", exact: true }).count()) === 0);
    await dialog(p).getByRole("button", { name: "Envoyer en validation" }).click(); await p.waitForTimeout(500);
    ok("VALIDATION : envoyée « En validation » ≠ terminée (statut, historique, aucun bouton Valider pour l'assigné)", (await dialog(p).getByText("En validation", { exact: true }).count()) >= 1 && (await dialog(p).getByText(/a changé le statut : En cours → En validation/).count()) === 1 && (await dialog(p).getByRole("button", { name: /Valider/ }).count()) === 0);
    await closeSheet(p);
    ok("VALIDATION : le compteur « Terminées » reste à 0, « 1 en validation » signalé", /0 Terminées/i.test(await counts(p)) && (await p.getByText("1 en validation").count()) === 1);
    // Création directe refusée à Qafard pour un autre membre (UI : un seul choix) → déjà testé. Retard :
    const yesterday = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 3); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
    await create(p, { title: "Livrer les retouches", due: yesterday }); await closeSheet(p);
    ok("RETARD : mission échue identifiée « En retard · 3 j » et comptée", (await p.getByText(/En retard · 3 j/).count()) === 1 && (await p.getByText("1 en retard").count()) === 1);
    ok("TRI : la mission en retard passe avant les autres", (await p.getByRole("list", { name: "Liste des missions" }).count()) >= 0 && (await p.locator("section[aria-label='Liste des missions'] li").first().innerText()).includes("Livrer les retouches"));
    ok("MISSIONS : aucune erreur JS (Qafard)", errs.length === 0, errs.join("|"));
    await ctx.close();
  }

  /* B. Tom (coordinateur) sur le même appareil : validation, vue globale, filtres, suppression */
  {
    const { ctx, p, errs } = await mk(); await login(ctx, "qafard"); await open(p);
    await create(p, { title: "Photos équipe", due: "2099-06-01", status: "En cours" }); await closeSheet(p);
    await create(p, { title: "Repérage photo plage", status: "En cours" }); await closeSheet(p);
    await p.getByRole("button", { name: /Photos équipe/ }).click(); await p.waitForTimeout(400); await dialog(p).getByRole("button", { name: "Envoyer en validation" }).click(); await p.waitForTimeout(400); await closeSheet(p);
    await login(ctx, "tom"); await open(p);
    ok("COORDINATION : Tom voit « Mes missions » et « Toutes »", (await p.getByRole("button", { name: "Toutes", exact: true }).count()) === 1 && (await p.getByRole("button", { name: "Mes missions" }).count()) === 1);
    ok("COORDINATION : « Mes missions » de Tom est vide, « Toutes » montre celles de Qafard", (await p.getByText("Aucune mission dans cette vue.").count()) === 1);
    await p.getByRole("button", { name: "Toutes", exact: true }).click(); await p.waitForTimeout(400);
    ok("COORDINATION : vue globale avec toutes les missions de l'appareil", (await p.locator("section[aria-label='Liste des missions'] li").count()) >= 2);
    // création par Tom pour Graw
    await create(p, { title: "Brief identité visuelle", assignee: "Graw", validator: "Tom", prio: "Urgente", due: "2099-04-01" }); await closeSheet(p);
    await create(p, { title: "Maquette app staff", assignee: "Graw", validator: "Tom", status: "En cours" }); await closeSheet(p);
    // filtres
    const n = () => p.locator("section[aria-label='Liste des missions'] li").count();
    const total = await n();
    await p.getByLabel("Filtrer par membre").selectOption({ label: "Graw" }); await p.waitForTimeout(300);
    ok("FILTRE membre : uniquement les missions de Graw (2)", (await n()) === 2 && (await p.getByText(/2 missions · filtres actifs/).count()) === 1);
    await p.getByLabel("Filtrer par priorité").selectOption({ label: "Urgente" }); await p.waitForTimeout(300);
    ok("FILTRE membre + priorité : 1 mission", (await n()) === 1 && (await p.getByRole("button", { name: /Brief identité visuelle/ }).count()) === 1);
    await p.getByLabel("Filtrer par statut").selectOption({ label: "En cours" }); await p.waitForTimeout(300);
    ok("FILTRE combiné sans résultat : message + « Effacer les filtres »", (await p.getByText("Aucune mission ne correspond aux filtres.").count()) === 1);
    await p.getByRole("button", { name: "Effacer les filtres" }).click(); await p.waitForTimeout(300);
    ok("FILTRE : effacer les filtres restaure la liste complète", (await n()) === total);
    await p.getByLabel("Filtrer par statut").selectOption({ label: "En validation" }); await p.waitForTimeout(300);
    ok("FILTRE statut : missions en validation uniquement", (await n()) >= 1 && (await p.locator("section[aria-label='Liste des missions'] li").allInnerTexts()).every((t) => /en validation/i.test(t)));
    // validation par Tom
    await p.getByRole("button", { name: /Photos équipe/ }).click(); await p.waitForTimeout(500);
    ok("VALIDATION : Tom (validateur) voit « Valider · terminée » et « Renvoyer en cours »", (await dialog(p).getByRole("button", { name: "Valider · terminée" }).count()) === 1 && (await dialog(p).getByRole("button", { name: "Renvoyer en cours" }).count()) === 1);
    await dialog(p).getByPlaceholder("Note (facultative)").fill("Super travail"); await dialog(p).getByRole("button", { name: "Valider · terminée" }).click(); await p.waitForTimeout(500);
    ok("VALIDATION : mission validée → Terminée, historique + note", (await dialog(p).getByText("Terminée", { exact: true }).count()) >= 1 && (await dialog(p).getByText(/a validé la mission/).count()) === 1 && (await dialog(p).getByText(/Super travail/).count()) === 1);
    await closeSheet(p);
    await p.getByLabel("Filtrer par statut").selectOption(""); await p.waitForTimeout(300);
    ok("SUIVI : compteur « Terminées » incrémenté après validation", /1 Terminées/i.test(await counts(p)));
    // renvoi en cours
    await p.getByLabel("Filtrer par statut").selectOption({ label: "En validation" }); await p.waitForTimeout(300);
    if ((await n()) >= 1) { await p.locator("section[aria-label='Liste des missions'] li button").first().click(); await p.waitForTimeout(400); await dialog(p).getByRole("button", { name: "Renvoyer en cours" }).click(); await p.waitForTimeout(400); ok("VALIDATION : renvoi en cours enregistré dans l'historique", (await dialog(p).getByText(/a renvoyé la mission en cours/).count()) === 1); await closeSheet(p); }
    await p.getByLabel("Filtrer par statut").selectOption(""); await p.waitForTimeout(300);
    // suppression
    const before = await n();
    await p.getByRole("button", { name: /Maquette app staff/ }).click(); await p.waitForTimeout(500);
    await dialog(p).getByRole("button", { name: "Supprimer" }).click(); await p.waitForTimeout(400);
    ok("SUPPRESSION : confirmation demandée avant d'agir", (await dialog(p).getByText(/sera supprimée de cet appareil/).count()) === 1 && (await n()) === before);
    await dialog(p).getByRole("button", { name: "Annuler" }).click(); await p.waitForTimeout(400); await closeSheet(p);
    ok("SUPPRESSION : annuler conserve la mission", (await n()) === before);
    await p.getByRole("button", { name: /Maquette app staff/ }).click(); await p.waitForTimeout(500); await dialog(p).getByRole("button", { name: "Supprimer" }).click(); await p.waitForTimeout(300); await dialog(p).getByRole("button", { name: "Supprimer" }).click(); await p.waitForTimeout(500);
    ok("SUPPRESSION : confirmée → mission supprimée", (await n()) === before - 1 && (await p.getByRole("button", { name: /Maquette app staff/ }).count()) === 0);
    await p.reload(); await p.waitForTimeout(1200); await p.getByRole("button", { name: "Toutes", exact: true }).click(); await p.waitForTimeout(300);
    ok("PERSISTANCE : la suppression persiste après rechargement", (await n()) === before - 1);
    ok("MISSIONS : aucune erreur JS (Tom)", errs.length === 0, errs.join("|"));
    await ctx.close();
  }

  /* C. Droits : Qafard ne voit ni ne modifie ce qui ne le concerne pas ; exemples ; HQ ; navigation */
  {
    const { ctx, p } = await mk(); await login(ctx, "tom"); await open(p);
    await p.getByRole("button", { name: /Charger 4 missions/ }).click(); await p.waitForTimeout(600); await p.getByRole("button", { name: "Toutes", exact: true }).click(); await p.waitForTimeout(300);
    ok("EXEMPLES : 4 missions d'exemple (dont une en retard) chargées par un coordinateur", (await p.locator("section[aria-label='Liste des missions'] li").count()) === 4 && (await p.getByText(/En retard/).count()) >= 1 && (await p.getByText("[Exemple]").count()) >= 4);
    await login(ctx, "qafard"); await open(p);
    ok("DROITS : Qafard ne voit que ses missions (2 exemples) et pas celles de Tom / Graw", (await p.locator("section[aria-label='Liste des missions'] li").count()) === 2 && (await p.getByRole("button", { name: /Préparer le brief équipe/ }).count()) === 0);
    await p.getByRole("button", { name: /Repérage photo/ }).click(); await p.waitForTimeout(500);
    ok("DROITS : Qafard ne peut ni modifier ni supprimer une mission créée par Tom", (await dialog(p).getByRole("button", { name: "Modifier" }).count()) === 0 && (await dialog(p).getByRole("button", { name: "Supprimer" }).count()) === 0);
    ok("DROITS : il peut démarrer sa mission (statut) mais pas la terminer", (await dialog(p).getByRole("button", { name: "En cours" }).count()) === 1 && (await dialog(p).getByRole("button", { name: "Terminée" }).count()) === 0);
    await closeSheet(p);
    await p.goto(B + "/staff"); await p.waitForTimeout(1000);
    ok("HQ : aperçu « Missions » (mes missions) avec lien", (await p.getByRole("link", { name: /Missions/ }).filter({ hasText: /à suivre/ }).count()) === 1);
    await p.getByRole("link", { name: /Missions/ }).filter({ hasText: /à suivre/ }).click(); await p.waitForURL("**/staff/missions"); await p.waitForTimeout(700);
    const nav = p.getByRole("navigation", { name: "Navigation STAFF HQ" });
    ok("NAVIGATION : toujours 4 onglets, HQ actif sur MISSIONS", (await nav.getByRole("link").count()) === 4 && (await nav.getByRole("link", { name: "HQ", exact: true }).getAttribute("aria-current")) === "page");
    ok("NAVIGATION : MEMBERS et SKYLINE SOUND intacts", (await (await ctx.request.get(B + "/v3/explore/sound")).status()) === 200 && (await ctx.request.get(B + "/v3/flight")).status() === 200);
    await ctx.close();
  }

  /* D. Mobiles */
  for (const w of [375, 390, 430]) {
    const { ctx, p } = await mk({ viewport: { width: w, height: 812 } }); await login(ctx, "tom"); await open(p);
    await p.getByRole("button", { name: /Charger 4 missions/ }).click(); await p.waitForTimeout(500); await p.getByRole("button", { name: "Toutes", exact: true }).click(); await p.waitForTimeout(300);
    const ov1 = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    await p.locator("section[aria-label='Liste des missions'] li button").first().click(); await p.waitForTimeout(500);
    const ov2 = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(`MOBILE ${w} px : liste et fiche sans débordement horizontal`, ov1 <= 0 && ov2 <= 0);
    if (w === 375) {
      const check = () => p.evaluate(() => { const bad = []; const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { const x = n.textContent.trim(); if (!x) continue; const e = n.parentElement; const r = e.getBoundingClientRect(); if (r.width && !e.closest("[aria-hidden='true'], .sr-only") && parseFloat(getComputedStyle(e).fontSize) < 11) bad.push(x.slice(0, 16)); } document.querySelectorAll("button, a, select, input").forEach((e) => { const r = e.getBoundingClientRect(); if (r.width && r.height && !e.closest("[aria-hidden='true']") && !e.classList.contains("sr-only") && r.height < 40 && !(e.textContent || "").startsWith("Aller au contenu")) bad.push("cible " + (e.textContent || e.getAttribute("aria-label") || e.tagName).trim().slice(0, 14) + " " + Math.round(r.height)); }); return bad; });
      const b1 = await check(); await p.keyboard.press("Escape"); await p.waitForTimeout(400); const b2 = await check();
      await p.getByRole("button", { name: /Nouvelle mission/ }).first().click(); await p.waitForTimeout(500); const b3 = await check();
      ok("MOBILE 375 px : textes ≥ 11 px et cibles ≥ 40 px (fiche, liste, formulaire)", b1.length + b2.length + b3.length === 0, JSON.stringify([b1, b2, b3]).slice(0, 300));
    }
    await ctx.close();
  }
  await browser.close(); console.log(fails ? `${fails} ÉCHEC(S)` : "TOUT PASSE"); process.exit(fails ? 1 : 0);
})();
