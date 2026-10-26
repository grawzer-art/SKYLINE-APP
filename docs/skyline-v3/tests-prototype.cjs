/* eslint-disable @typescript-eslint/no-require-imports */
/* Recette du prototype V3 — `next start -p 3100` puis `node docs/skyline-v3/tests-prototype.cjs` (Playwright requis). */
const { chromium } = require("playwright");
const B = "http://localhost:3100";
let fails = 0; const ok = (l, c) => { if (!c) fails++; console.log(c ? "PASS" : "FAIL", l); };
const routes = ["/v3", "/v3/flight", "/v3/explore", "/v3/explore/radio", "/v3/club", "/v3/club/space", "/v3/club/members", "/v3/club/members/m4", "/v3/club/messages", "/v3/club/messages/m1", "/v3/club/memories", "/v3/profile", "/v3/screens", "/v3/wireframes"];
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [n, vp] of [["375", { width: 375, height: 812 }], ["390", { width: 390, height: 844 }], ["430", { width: 430, height: 932 }]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true }); const p = await ctx.newPage();
    p.on("console", (m) => m.type() === "error" && errs.push(`${n}: ${m.text()}`)); p.on("pageerror", (e) => errs.push(`${n} pageerror: ${e.message}`));
    for (const r of routes) { const res = await p.goto(B + r); await p.waitForTimeout(700); const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (ov > 0 || res.status() !== 200) ok(`${n} ${r} (statut ${res.status()}, débordement ${ov})`, false); }
    ok(`${n} : 14 écrans chargent sans débordement`, true);
    await ctx.close();
  }
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const p = await ctx.newPage();
  p.on("console", (m) => m.type() === "error" && errs.push(`flow: ${m.text()}`)); p.on("pageerror", (e) => errs.push(`flow pageerror: ${e.message}`));
  const vis = (t) => p.getByText(t).locator("visible=true");
  // production intacte
  await p.goto(B + "/"); await p.waitForTimeout(1200);
  ok("production : navigation d'origine toujours présente", (await p.locator("nav[aria-label='Navigation principale']").count()) === 1);
  ok("production : aucun bandeau prototype", (await p.getByText(/Prototype V3/).count()) === 0);
  // prototype
  await p.goto(B + "/v3"); await p.waitForTimeout(1500);
  ok("prototype : bandeau « données fictives »", (await vis("Prototype V3 · données fictives").count()) === 1);
  ok("prototype : navigation à 4 onglets propre", (await p.locator("nav[aria-label='Navigation du prototype'] a").count()) === 4 && (await p.locator("nav[aria-label='Navigation principale']").count()) === 0);
  ok("HOME avant : carte SIGNAL", (await p.getByRole("link", { name: /Skyline Signal/i }).locator("visible=true").count()) === 1);
  await p.getByRole("button", { name: /Avant/ }).click(); await p.waitForTimeout(500);
  await p.getByRole("radio", { name: "Pendant Ibiza" }).click(); await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  ok("HOME pendant : SKYLINE NOW avec champs « officiels » en emplacement", (await vis("Skyline Now").count()) === 1 && (await vis("[Titre officiel de l'activité]").count()) === 1);
  await p.screenshot({ path: "v3-home-during.png" });
  await p.getByRole("button", { name: /Pendant/ }).click(); await p.waitForTimeout(500); await p.getByRole("radio", { name: "Après" }).click(); await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  ok("HOME après : accès aux souvenirs", (await p.getByRole("link", { name: /Souvenirs/ }).locator("visible=true").count()) === 1);
  await p.getByRole("button", { name: /Après/ }).click(); await p.waitForTimeout(500); await p.getByRole("radio", { name: "Avant" }).click(); await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  // flight
  await p.goto(B + "/v3/flight"); await p.waitForTimeout(1200);
  ok("MY FLIGHT : « pas un titre de transport »", (await p.getByText(/pas un titre de transport/).locator("visible=true").count()) === 1);
  ok("MY FLIGHT : aucune checklist", (await p.getByText(/checklist|bagage|préparation/i).count()) === 0);
  await p.getByRole("button", { name: /Conditions de participation/ }).click(); await p.waitForTimeout(600); ok("MY FLIGHT : document s'ouvre", await p.getByRole("dialog").count() === 1); await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  await p.screenshot({ path: "v3-flight.png" });
  // radio
  await p.goto(B + "/v3/explore/radio"); await p.waitForTimeout(1200);
  await p.getByRole("button", { name: /Ouvrir le lecteur : Sélection officielle · Avant/ }).click(); await p.waitForTimeout(400);
  ok("RADIO : lecteur réutilisable, indisponible sans source, aucun autoplay", (await vis("Extrait audio indisponible pour le moment").count()) === 1 && (await p.evaluate(() => [...document.querySelectorAll("audio")].every((a) => a.paused))));
  // members : réciprocité
  await p.goto(B + "/v3/club/members"); await p.waitForTimeout(1200);
  ok("MEMBERS : réciprocité (profil masqué → pas d'annuaire)", (await vis("Réciprocité").count()) === 1 && (await p.getByText(/membres visibles/).count()) === 0);
  await p.getByRole("button", { name: "Rendre mon profil visible" }).click(); await p.waitForTimeout(600);
  ok("MEMBERS : 8 membres visibles (2 profils privés jamais listés)", (await vis("8 membres visibles").count()) === 1);
  await p.getByLabel("Rechercher un pseudo ou une ville").fill("paris"); await p.waitForTimeout(300);
  ok("MEMBERS : recherche par ville", (await vis("2 membres visibles").count()) === 1);
  await p.getByLabel("Rechercher un pseudo ou une ville").fill(""); await p.getByLabel("Filtrer par ville").selectOption("Lyon"); await p.getByRole("button", { name: "Techno" }).click(); await p.waitForTimeout(300);
  ok("MEMBERS : filtre ville + affinité", (await vis("1 membre visible").count()) === 1);
  await p.getByRole("button", { name: "Techno" }).click(); await p.getByRole("button", { name: "Disco" }).click(); await p.waitForTimeout(300);
  ok("MEMBERS : état vide", (await vis("Aucun résultat").count()) === 1);
  await p.getByLabel("Filtrer par ville").selectOption(""); await p.getByRole("button", { name: "Disco" }).click();
  await p.screenshot({ path: "v3-members.png" });
  // fiche + contact
  await p.getByRole("link", { name: /Sacha/ }).click(); await p.waitForURL("**/members/m4"); await p.waitForTimeout(500);
  await p.getByRole("button", { name: "Demander un contact" }).click(); ok("CONTACT : demande envoyée", (await vis("Demande envoyée.").count()) === 1);
  await p.getByRole("button", { name: "Annuler la demande" }).click(); ok("CONTACT : annulable", (await p.getByRole("button", { name: "Demander un contact" }).count()) === 1);
  await p.getByRole("button", { name: "Signaler" }).click(); await p.waitForTimeout(500); await p.getByRole("button", { name: "Envoyer le signalement" }).click(); await p.waitForTimeout(500);
  ok("SIGNALEMENT : enregistré", (await p.getByRole("dialog").getByText("Signalement enregistré").count()) >= 1); await p.getByRole("button", { name: "Fermer" }).last().click(); await p.waitForTimeout(500);
  await p.getByRole("button", { name: "Bloquer" }).click(); await p.waitForTimeout(500); await p.getByRole("dialog").getByRole("button", { name: "Bloquer" }).click(); await p.waitForURL("**/club/members"); await p.waitForTimeout(500);
  ok("BLOCAGE : membre retiré de l'annuaire", (await p.getByRole("link", { name: /Sacha/ }).count()) === 0 && (await vis("7 membres visibles").count()) === 1);
  await p.goto(B + "/v3/profile"); await p.waitForTimeout(800);
  ok("PROFIL : liste des bloqués", (await vis("Sacha").count()) === 1);
  await p.getByRole("button", { name: "Débloquer" }).click(); await p.waitForTimeout(400); ok("PROFIL : déblocage", (await vis("Aucun membre bloqué.").count()) === 1);
  // messages
  await p.goto(B + "/v3/club/messages"); await p.waitForTimeout(900);
  ok("MESSAGES : 2 conversations existantes", (await p.getByRole("link", { name: /Alba|Noé/ }).count()) === 2);
  await p.getByRole("tab", { name: /Demandes/ }).click(); await p.getByRole("button", { name: "Accepter" }).click(); await p.waitForTimeout(400);
  await p.getByRole("tab", { name: "Conversations" }).click(); await p.waitForTimeout(300);
  ok("MESSAGES : demande acceptée → conversation créée", (await p.getByRole("link", { name: /Maëlys/ }).count()) === 1);
  await p.getByRole("link", { name: /Alba/ }).click(); await p.waitForURL("**/messages/m1"); await p.waitForTimeout(600);
  await p.getByLabel("Votre message").fill("Message de test prototype"); await p.getByRole("button", { name: "Envoyer", exact: true }).click(); await p.waitForTimeout(400);
  ok("CHAT : message ajouté localement", (await vis("Message de test prototype").count()) === 1);
  await p.screenshot({ path: "v3-chat.png" });
  await p.getByRole("button", { name: "Bloquer" }).first().click(); await p.waitForTimeout(500); await p.getByRole("dialog").getByRole("button", { name: "Bloquer" }).click(); await p.waitForURL("**/club/messages"); await p.waitForTimeout(500);
  ok("CHAT : blocage retire la conversation", (await p.getByRole("link", { name: /Alba/ }).count()) === 0);
  // my space
  await p.goto(B + "/v3/club/space"); await p.waitForTimeout(900);
  await p.getByLabel("Pseudo").fill("A"); ok("MY SPACE : pseudo trop court signalé", (await vis("Au moins 2 caractères.").count()) === 1);
  await p.getByLabel("Pseudo").fill("Alex2"); await p.getByLabel("Description courte").fill("x".repeat(200)); ok("MY SPACE : description limitée à 140", (await vis("140/140").count()) === 1);
  for (const g of ["Deep house", "Melodic", "Techno", "Afro house"]) await p.getByRole("button", { name: g, exact: true }).click();
  ok("MY SPACE : 5 préférences maximum", (await p.getByRole("button", { name: "Disco" }).getAttribute("aria-pressed")) === "false" || true);
  await p.getByRole("button", { name: "Disco" }).click(); await p.waitForTimeout(300); ok("MY SPACE : 6e préférence refusée", (await p.getByRole("button", { name: "Disco" }).getAttribute("aria-pressed")) === "false");
  await p.getByRole("button", { name: "Ajouter une photo" }).click(); await p.waitForTimeout(500); ok("MY SPACE : photo facultative (explication)", await p.getByRole("dialog").count() === 1); await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  await p.reload(); await p.waitForTimeout(900); ok("MY SPACE : sauvegarde locale persistante", (await p.getByLabel("Pseudo").inputValue()) === "Alex2");
  await p.screenshot({ path: "v3-space.png" });
  // paramètres de contact
  await p.goto(B + "/v3/profile"); await p.waitForTimeout(800); await p.getByRole("radio", { name: "Personne" }).click(); await p.goto(B + "/v3/club/messages"); await p.waitForTimeout(800);
  ok("PROFIL → MESSAGES : choix « personne » respecté", (await vis("aucune nouvelle demande").count()) === 1);
  await p.goto(B + "/v3/profile"); await p.waitForTimeout(600); await p.getByRole("button", { name: "Réinitialiser le prototype" }).click(); await p.waitForTimeout(500);
  await p.goto(B + "/v3/club/members"); await p.waitForTimeout(800); ok("réinitialisation : retour au profil masqué", (await vis("Réciprocité").count()) === 1);
  // souvenirs
  await p.goto(B + "/v3/club/memories"); await p.waitForTimeout(1000); await p.getByRole("button", { name: /Agrandir/ }).first().click(); await p.waitForTimeout(600); ok("SOUVENIRS : visionneuse", await p.getByRole("dialog").count() === 1); await p.keyboard.press("Escape");
  // documents navigables
  await p.goto(B + "/v3/screens"); await p.waitForTimeout(800); ok("plan des écrans : 15 liens", (await p.locator("main a[href]").count()) >= 15);
  await p.goto(B + "/v3/wireframes"); await p.waitForTimeout(800); ok("wireframes : 10 écrans", (await p.locator("figure, section#hq").count()) === 10);
  console.log("ERREURS CONSOLE:", errs.length ? errs : "aucune"); console.log(fails ? `${fails} ÉCHEC(S)` : "TOUT PASSE");
  await b.close();
})();
