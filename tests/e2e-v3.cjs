/* eslint-disable @typescript-eslint/no-require-imports */
/* Recette bout en bout du prototype V3 (Playwright). `npm run build && npx next start -p 3100`, puis `npm run test:e2e`. */
const { chromium } = require("playwright");
const fs = require("fs"); const os = require("os"); const path = require("path");
const B = process.env.BASE || "http://localhost:3100";
const KEY = "skyline.v3.proto.v2";
let fails = 0; const ok = (l, c) => { if (!c) fails++; console.log(c ? "PASS" : "FAIL", l); };
const routes = ["/v3", "/v3/flight", "/v3/explore", "/v3/explore/sound", "/v3/explore/radio/dj/dj1", "/v3/explore/radio/sel/sel1", "/v3/club", "/v3/club/community", "/v3/club/space", "/v3/club/members", "/v3/club/members/m4", "/v3/club/messages", "/v3/club/messages/m1", "/v3/club/memories", "/v3/profile", "/v3/screens", "/v3/wireframes"];
const png = path.join(os.tmpdir(), "photo-test.png"); const txt = path.join(os.tmpdir(), "note.txt");
fs.writeFileSync(png, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64")); fs.writeFileSync(txt, "pas une image");

(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async (opts = {}) => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, ...opts }); const p = await ctx.newPage(); p.on("console", (m) => m.type() === "error" && !/status of 404/.test(m.text()) && errs.push(m.text())); p.on("pageerror", (e) => errs.push("pageerror: " + e.message)); return { ctx, p }; };
  const seed = (p, patch) => p.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(v)); }, [KEY, patch]);
  const eligible = { community: { adult: true, charter: true, consent: true } };

  /* 1. Écrans, largeurs, débordements */
  for (const [n, vp] of [["375", { width: 375, height: 812 }], ["390", { width: 390, height: 844 }], ["430", { width: 430, height: 932 }]]) {
    const { ctx, p } = await mk({ viewport: vp }); await seed(p, { ...eligible, me: { visible: true } });
    let bad = 0; for (const r of routes) { const res = await p.goto(B + r); await p.waitForTimeout(500); const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (ov > 0 || res.status() !== 200) { bad++; console.log("  ↳", n, r, res.status(), ov); } }
    ok(`${n} px : ${routes.length} écrans sans débordement`, bad === 0); await ctx.close();
  }

  /* 2. Accès conditionnel */
  {
    const { ctx, p } = await mk(); const vis = (t) => p.getByText(t).locator("visible=true");
    await p.goto(B + "/v3/club/members"); await p.waitForTimeout(900);
    ok("ACCÈS : annuaire verrouillé par défaut", (await vis("Accès à la communauté").count()) === 1 && (await p.getByText(/membres visibles/).locator("visible=true").count()) === 0);
    await p.goto(B + "/v3/club/messages"); await p.waitForTimeout(700); ok("ACCÈS : messagerie verrouillée par défaut", (await vis("Accès à la communauté").count()) === 1);
    await p.goto(B + "/v3/club/messages/m1"); await p.waitForTimeout(700); ok("ACCÈS : conversation inaccessible par lien direct", (await p.getByLabel("Votre message").count()) === 0);
    await p.goto(B + "/v3/club/community"); await p.waitForTimeout(900);
    const cta = p.getByRole("button", { name: "Activer la communauté" });
    ok("ACTIVATION : bouton désactivé sans attestations", await cta.isDisabled());
    await p.locator("label").filter({ hasText: /18 ans/ }).first().click(); await p.locator("label").filter({ hasText: /charte/ }).first().click(); ok("ACTIVATION : encore désactivé sans consentement", await cta.isDisabled());
    await p.locator("label").filter({ hasText: /fonctions communautaires/ }).first().click(); ok("ACTIVATION : actif quand tout est validé", !(await cta.isDisabled()));
    await p.getByRole("button", { name: /Lire la charte/ }).click(); await p.waitForTimeout(500); ok("ACTIVATION : charte lisible", (await p.getByRole("dialog").getByText(/consentement/).count()) >= 1); await p.keyboard.press("Escape"); await p.waitForTimeout(400);
    // réservation en attente : activation impossible
    await p.getByRole("button", { name: /Avant|Pendant|Après/ }).click(); await p.waitForTimeout(400); await p.getByRole("radio", { name: "En attente" }).click(); await p.keyboard.press("Escape"); await p.waitForTimeout(500);
    ok("ACTIVATION : impossible tant que la réservation n'est pas confirmée", (await p.getByRole("button", { name: /En attente de la confirmation/ }).isDisabled()));
    await p.getByRole("button", { name: /Avant|Pendant|Après/ }).click(); await p.waitForTimeout(400); await p.getByRole("radio", { name: "Confirmée" }).click(); await p.keyboard.press("Escape"); await p.waitForTimeout(500);
    await cta.click(); await p.waitForTimeout(500); ok("ACTIVATION : communauté activée", (await vis("Communauté activée").count()) >= 1);
    await p.goto(B + "/v3/club/messages"); await p.waitForTimeout(900); ok("ACCÈS : messagerie ouverte AVANT le voyage une fois activée", (await p.getByRole("link", { name: /Alba/ }).count()) === 1);
    await p.goto(B + "/v3/club/members"); await p.waitForTimeout(800); ok("ANNUAIRE : réciprocité même activé (profil privé par défaut)", (await vis("Réciprocité").count()) === 1);
    // retrait
    await p.goto(B + "/v3/club/community"); await p.waitForTimeout(700); await p.getByRole("button", { name: "Quitter la communauté" }).click(); await p.waitForTimeout(500); await p.getByRole("dialog").getByRole("button", { name: "Quitter la communauté" }).click(); await p.waitForTimeout(500);
    await p.goto(B + "/v3/club/messages"); await p.waitForTimeout(700); ok("RETRAIT : messagerie de nouveau verrouillée", (await vis("Accès à la communauté").count()) === 1);
    await ctx.close();
  }

  /* 3. MY SPACE */
  {
    const { ctx, p } = await mk(); await seed(p, eligible); const vis = (t) => p.getByText(t).locator("visible=true");
    await p.goto(B + "/v3/club/space"); await p.waitForTimeout(900);
    await p.getByRole("button", { name: "Modifier" }).first().click(); await p.waitForTimeout(500);
    await p.getByLabel("Pseudo").fill("A"); ok("SPACE : pseudo trop court signalé", (await vis("Au moins 2 caractères.").count()) === 1);
    await p.getByLabel("Pseudo").fill("dj.fan.com"); ok("SPACE : pseudo avec lien refusé", (await vis(/Pas de lien ni d'identifiant/).count()) === 1);
    await p.getByLabel("Pseudo").fill("Alex2"); await p.getByLabel("Description courte").fill("x".repeat(200)); ok("SPACE : description limitée à 140", (await vis("140/140").count()) === 1);
    for (const g of ["Deep house", "Melodic", "Techno", "Afro house"]) await p.getByRole("button", { name: g, exact: true }).click();
    await p.getByRole("button", { name: "Disco", exact: true }).click(); ok("SPACE : 6e préférence refusée", (await p.getByRole("button", { name: "Disco", exact: true }).getAttribute("aria-pressed")) === "false");
    await p.locator("input[type=file]").setInputFiles(txt); await p.waitForTimeout(300); ok("PHOTO : fichier non image refusé", (await p.getByRole("alert").filter({ hasText: /Choisissez une image/ }).count()) === 1);
    await p.locator("input[type=file]").setInputFiles(png); await p.waitForTimeout(400);
    ok("PHOTO : aperçu local + « en cours de vérification »", (await p.locator("img[src^='blob:']").count()) >= 1 && (await vis(/En cours de vérification/).count()) === 1);
    await p.getByRole("button", { name: "Retirer la photo" }).click(); ok("PHOTO : retrait", (await p.locator("img[src^='blob:']").count()) === 0);
    await p.getByRole("button", { name: "Terminé" }).click(); await p.waitForTimeout(500);
    ok("VISIBILITÉ : désactivée par défaut", !(await p.getByRole("switch", { name: /Profil (privé|visible)/ }).isChecked()));
    await p.locator("label").filter({ hasText: /Profil (privé|visible)/ }).first().click(); await p.waitForTimeout(300); ok("VISIBILITÉ : activable (éligible)", await p.getByRole("switch", { name: /Profil (privé|visible)/ }).isChecked());
    ok("APERÇU : reflète le profil", (await p.getByText("Alex2").locator("visible=true").count()) >= 1);
    ok("ÉDITIONS : l'espace persiste (Ibiza 2027 + prochaines)", (await vis("Ibiza 2027").count()) >= 1 && (await vis(/prochaines éditions/).count()) === 1);
    await p.reload(); await p.waitForTimeout(900); await p.getByRole("button", { name: "Modifier" }).first().click(); await p.waitForTimeout(500); ok("SPACE : sauvegarde locale persistante", (await p.getByLabel("Pseudo").inputValue()) === "Alex2");
    await ctx.close();
    const c2 = await mk(); await c2.p.goto(B + "/v3/club/space"); await c2.p.waitForTimeout(800);
    ok("VISIBILITÉ : refusée sans éligibilité (lien vers l'activation)", !(await c2.p.locator("label").filter({ hasText: /Profil (privé|visible)/ }).first().click().then(() => c2.p.waitForTimeout(300)).then(() => c2.p.getByRole("switch", { name: /Profil (privé|visible)/ }).isChecked())) && (await c2.p.getByRole("link", { name: /conditions/ }).count()) === 1);
    await c2.ctx.close();
  }

  /* 3b. MY FLIGHT */
  {
    const { ctx, p } = await mk(); await seed(p, { sim: { reservation: "pending", tone: false, trip: false } }); const vis = (t) => p.getByText(t).locator("visible=true");
    await p.goto(B + "/v3/flight"); await p.waitForTimeout(1500);
    ok("FLIGHT : pass (nom, édition, statut réel)", (await vis("Ibiza 2027").count()) >= 1 && (await vis("En attente de confirmation").count()) === 1);
    ok("FLIGHT : aucun faux QR (emplacement uniquement)", (await p.locator("canvas, img[alt*='QR' i], svg[aria-label*='QR' i]").count()) === 0 && (await p.getByRole("img", { name: /Emplacement du QR/ }).count()) === 1);
    ok("FLIGHT : message unique quand rien n'est confirmé", (await vis("Les détails de votre voyage apparaîtront ici dès leur confirmation.").count()) === 1 && (await vis("À confirmer").count()) === 0);
    await p.getByRole("tab", { name: /Séjour/ }).click(); await p.waitForTimeout(500);
    ok("FLIGHT : onglet séjour", (await vis(/Hébergement, transferts et programme/).count()) === 1);
    await p.getByRole("tab", { name: /Infos/ }).click(); await p.waitForTimeout(500);
    ok("FLIGHT : onglet annonces", (await vis(/annonces officielles/).count()) === 1);
    await p.getByRole("button", { name: /Informations importantes/ }).click(); await p.waitForTimeout(500);
    ok("FLIGHT : informations importantes accessibles", (await p.getByRole("dialog").getByText(/pas un titre de transport/i).count()) === 1);
    await p.keyboard.press("Escape"); await p.waitForTimeout(400);
    ok("FLIGHT : pas de défilement horizontal", (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
    await ctx.close();
    const c2 = await mk(); await seed(c2.p, { phase: "during", sim: { reservation: "confirmed", tone: false, trip: true } });
    await c2.p.goto(B + "/v3/flight"); await c2.p.waitForTimeout(1500);
    ok("FLIGHT : pendant Ibiza → annonces d'abord, aperçu signalé fictif", (await c2.p.getByRole("tab", { name: /Infos/ }).getAttribute("aria-selected")) === "true" && (await c2.p.getByText("Annonce fictive").locator("visible=true").count()) === 1);
    await c2.ctx.close();
    const c3 = await mk(); await seed(c3.p, { phase: "after" });
    await c3.p.goto(B + "/v3/flight"); await c3.p.waitForTimeout(1500);
    ok("FLIGHT : après Ibiza → historique et souvenirs", (await c3.p.getByRole("link", { name: /Mes souvenirs/ }).count()) === 1 && (await c3.p.getByRole("tablist").count()) === 0);
    await c3.ctx.close();
  }

  /* 4. MEMBERS */
  {
    const { ctx, p } = await mk(); await seed(p, { ...eligible, me: { pseudo: "Alex", city: "Paris", bio: "", genres: ["House", "Melodic"], visible: true } }); const vis = (t) => p.getByText(t).locator("visible=true");
    await p.goto(B + "/v3/club/members"); await p.waitForTimeout(1000);
    ok("MEMBERS : 8 membres visibles, profils privés jamais listés", (await vis("8 membres visibles").count()) === 1);
    ok("MEMBERS : pagination (6 puis plus)", (await p.locator("main ul li a[href*='/members/']").count()) === 6);
    await p.getByRole("button", { name: "Voir plus" }).click(); await p.waitForTimeout(300); ok("MEMBERS : « Voir plus » affiche les 8", (await p.locator("main ul li a[href*='/members/']").count()) === 8);
    const names = await p.locator("main ul li a[href*='/members/']").evaluateAll((as) => as.map((a) => a.querySelector("span span").textContent));
    ok("MEMBERS : ordre alphabétique (aucun classement)", JSON.stringify(names) === JSON.stringify([...names].sort((x, y) => x.localeCompare(y, "fr"))));
    ok("MEMBERS : affinités communes affichées", (await vis(/En commun : House/).count()) >= 1);
    await p.getByLabel("Rechercher un pseudo ou une ville").fill("paris"); await p.waitForTimeout(300); ok("MEMBERS : recherche par ville", (await vis("2 membres visibles").count()) === 1);
    await p.getByLabel("Rechercher un pseudo ou une ville").fill(""); await p.getByLabel("Filtrer par ville").selectOption("Lyon"); await p.getByRole("button", { name: "Disco", exact: true }).click(); await p.waitForTimeout(300); ok("MEMBERS : état vide", (await vis("Aucun résultat").count()) === 1);
    await p.getByLabel("Filtrer par ville").selectOption(""); await p.getByRole("button", { name: "Disco", exact: true }).click();
    ok("MEMBERS : quota affiché (10/10)", (await vis(/Demandes restantes aujourd'hui : 10\/10/).count()) === 1);
    // demande avec mot d'introduction
    await p.goto(B + "/v3/club/members/m4"); await p.waitForTimeout(900);
    await p.getByRole("button", { name: "Demander un contact" }).click(); await p.waitForTimeout(500);
    await p.getByLabel("Un petit mot (facultatif)").fill("Regarde www.exemple.fr"); await p.getByRole("button", { name: "Envoyer la demande" }).click(); ok("DEMANDE : lien refusé dans le mot d'introduction", (await p.getByRole("alert").filter({ hasText: /liens/ }).count()) === 1);
    await p.getByLabel("Un petit mot (facultatif)").fill("Salut, même vol que toi !"); await p.getByRole("button", { name: "Envoyer la demande" }).click(); await p.waitForTimeout(600);
    ok("DEMANDE : envoyée (en attente)", (await vis(/Demande envoyée/).count()) === 1);
    await p.getByRole("button", { name: "Annuler la demande" }).click(); ok("DEMANDE : annulable", (await p.getByRole("button", { name: "Demander un contact" }).count()) === 1);
    await p.getByRole("button", { name: "Signaler", exact: true }).click(); await p.waitForTimeout(500); await p.getByRole("button", { name: "Envoyer le signalement" }).click(); await p.waitForTimeout(500);
    ok("SIGNALEMENT : enregistré (une seule modale)", (await p.getByRole("dialog").getByText("Signalement enregistré").count()) >= 1); await p.getByRole("dialog").getByRole("button", { name: "Fermer" }).last().click(); await p.waitForTimeout(500);
    await p.getByRole("button", { name: "Bloquer", exact: true }).click(); await p.waitForTimeout(500); await p.getByRole("dialog").getByRole("button", { name: "Bloquer" }).click(); await p.waitForURL("**/club/members"); await p.waitForTimeout(600);
    ok("BLOCAGE : retiré de l'annuaire", (await vis("7 membres visibles").count()) === 1);
    await p.goto(B + "/v3/profile"); await p.waitForTimeout(700); await p.getByRole("button", { name: "Débloquer" }).click(); await p.waitForTimeout(300); ok("PROFIL : déblocage", (await vis("Aucun membre bloqué.").count()) === 1);
    await ctx.close();
    // quota atteint
    const q = await mk(); const t0 = Date.now(); const outgoing = {}; for (let i = 0; i < 10; i++) outgoing["x" + i] = { state: "sent", at: t0 - i * 1000, intro: "" };
    await seed(q.p, { ...eligible, me: { pseudo: "Alex", city: "Paris", bio: "", genres: ["House"], visible: true }, outgoing: { m1: { state: "accepted", at: 0, intro: "" }, m2: { state: "accepted", at: 0, intro: "" }, ...outgoing } });
    await q.p.goto(B + "/v3/club/members/m4"); await q.p.waitForTimeout(900); await q.p.getByRole("button", { name: "Demander un contact" }).click(); await q.p.waitForTimeout(400); await q.p.getByRole("button", { name: "Envoyer la demande" }).click();
    ok("QUOTA : 11e demande du jour refusée", (await q.p.getByRole("alert").filter({ hasText: /limite de demandes/ }).count()) === 1); await q.ctx.close();
  }

  /* 5. MESSAGES */
  {
    const { ctx, p } = await mk(); await seed(p, eligible); const vis = (t) => p.getByText(t).locator("visible=true");
    await p.goto(B + "/v3/club/messages"); await p.waitForTimeout(1000);
    ok("MESSAGES : 2 conversations, 1 non lu", (await p.getByRole("link", { name: /Alba|Noé/ }).count()) === 2 && (await vis("1 non lu").count()) === 1);
    await p.getByRole("tab", { name: /Demandes/ }).click(); await p.waitForTimeout(300);
    ok("DEMANDES : mot d'introduction affiché", (await vis(/même musique/).count()) === 1);
    await p.getByRole("button", { name: "Accepter" }).click(); await p.getByRole("tab", { name: "Conversations" }).click(); await p.waitForTimeout(300); ok("DEMANDES : acceptée → conversation", (await p.getByRole("link", { name: /Maëlys/ }).count()) === 1);
    await p.getByRole("link", { name: /Alba/ }).click(); await p.waitForURL("**/messages/m1"); await p.waitForTimeout(700);
    ok("CHAT : conseil de sécurité à la première conversation", (await vis("Bien commencer").count()) === 1); await p.getByRole("button", { name: "Fermer" }).first().click(); await p.waitForTimeout(300); ok("CHAT : conseil masquable", (await vis("Bien commencer").count()) === 0);
    const box = p.getByLabel("Votre message"); const send = p.getByRole("button", { name: "Envoyer", exact: true });
    const trySend = async (s) => { await box.fill(s); await send.click(); await p.waitForTimeout(200); };
    await trySend("regarde https://exemple.com"); ok("CHAT : lien refusé", (await p.getByRole("alert").filter({ hasText: /liens/ }).count()) === 1);
    await trySend("appelle-moi 06 12 34 56 78"); ok("CHAT : numéro de téléphone refusé", (await p.getByRole("alert").filter({ hasText: /numéros de téléphone/ }).count()) === 1);
    await trySend("suis-moi @dj_fan_2027"); ok("CHAT : identifiant de réseau refusé", (await p.getByRole("alert").filter({ hasText: /liens/ }).count()) === 1);
    await trySend("Salut, on se retrouve au départ ?"); ok("CHAT : message valide envoyé", (await vis("Salut, on se retrouve au départ ?").count()) === 1);
    for (let i = 2; i <= 5; i++) await trySend("message " + i);
    await trySend("message 6"); ok("CHAT : limite de débit (5 messages en 10 s)", (await p.getByRole("alert").filter({ hasText: /Doucement/ }).count()) === 1);
    await p.screenshot({ path: "e2e-chat.png" });
    await p.getByRole("button", { name: "Signaler ce message" }).first().click(); await p.waitForTimeout(500);
    ok("SIGNALEMENT d'un message : citation jointe", (await p.getByRole("dialog").getByText(/Message signalé/).count()) === 1); await p.keyboard.press("Escape"); await p.waitForTimeout(400);
    await p.getByRole("button", { name: "Options de la conversation" }).click(); await p.waitForTimeout(500); await p.getByRole("button", { name: "Mettre en silencieux" }).click(); await p.waitForTimeout(500);
    await p.goto(B + "/v3/club/messages"); await p.waitForTimeout(800); ok("SILENCIEUX : indiqué dans la liste", (await p.getByLabel("Silencieux").count()) === 1);
    await p.goto(B + "/v3/club/messages/m2"); await p.waitForTimeout(800);
    await p.getByRole("button", { name: "Options de la conversation" }).click(); await p.waitForTimeout(500); await p.getByRole("button", { name: "Supprimer la conversation" }).first().click(); await p.waitForTimeout(400); await p.getByRole("dialog").getByRole("button", { name: "Supprimer la conversation" }).click(); await p.waitForURL("**/club/messages"); await p.waitForTimeout(600);
    ok("SUPPRESSION : conversation retirée de ma liste", (await p.getByRole("link", { name: /Noé/ }).count()) === 0);
    await p.goto(B + "/v3/club/messages/m1"); await p.waitForTimeout(800);
    await p.getByRole("button", { name: "Options de la conversation" }).click(); await p.waitForTimeout(500); await p.getByRole("dialog").getByRole("button", { name: "Bloquer" }).click(); await p.waitForTimeout(400); await p.getByRole("dialog").getByRole("button", { name: "Bloquer" }).click(); await p.waitForURL("**/club/messages"); await p.waitForTimeout(600);
    ok("BLOCAGE depuis la conversation", (await p.getByRole("link", { name: /Alba/ }).count()) === 0);
    await ctx.close();
    // hors ligne
    const o = await mk(); await seed(o.p, eligible); await o.p.goto(B + "/v3/club/messages/m1"); await o.p.waitForTimeout(900); await o.ctx.setOffline(true); await o.p.waitForTimeout(500);
    ok("HORS LIGNE : composeur désactivé + explication", (await o.p.getByLabel("Votre message").isDisabled()) && (await o.p.getByText(/hors ligne/).locator("visible=true").count()) >= 1); await o.ctx.setOffline(false); await o.ctx.close();
  }

  /* 7. Anglais */
  {
    const { ctx, p } = await mk(); await seed(p, { ...eligible, me: { pseudo: "Alex", city: "Paris", bio: "", genres: ["House"], visible: true }, locale: "en" }); const vis = (t) => p.getByText(t).locator("visible=true");
    await p.goto(B + "/v3/club/members"); await p.waitForTimeout(1000);
    ok("EN : annuaire traduit", (await vis("8 visible members").count()) === 1 && (await vis(/Alphabetical order/).count()) === 1);
    await p.goto(B + "/v3/club/space"); await p.waitForTimeout(800); ok("EN : My Space traduit", (await p.getByRole("button", { name: "Edit" }).first().count()) === 1);
    await p.goto(B + "/v3/club/messages"); await p.waitForTimeout(800); ok("EN : messages traduits", (await vis("Conversations").count()) >= 1 && (await vis(/1 unread/).count()) === 1);
    await ctx.close();
  }

  /* 8. Production intacte */
  {
    const { ctx, p } = await mk(); await p.goto(B + "/"); await p.waitForTimeout(1200);
    ok("PRODUCTION : navigation d'origine, sans bandeau prototype", (await p.locator("nav[aria-label='Navigation principale']").count()) === 1 && (await p.getByText(/Prototype V3/).count()) === 0);
    await p.goto(B + "/explore"); await p.waitForTimeout(800); ok("PRODUCTION : EXPLORE d'origine", (await p.getByText("Révélations").locator("visible=true").count()) >= 1);
    const r = await p.goto(B + "/signal/un-lieu-a-ibiza-se-devoile"); ok("PRODUCTION : SKYLINE SIGNAL intact", r.status() === 200);
    await ctx.close();
  }

  /* 9. Accès depuis l'application (onglets de production) */
  {
    const { ctx, p } = await mk(); const vis = (t) => p.getByText(t).locator("visible=true");
    await p.goto(B + "/"); await p.waitForTimeout(1200);
    await p.locator("nav[aria-label='Navigation principale']").getByRole("link", { name: "Club" }).click(); await p.waitForURL("**/v3/club"); await p.waitForTimeout(900);
    ok("APPLICATION : l'onglet Club mène au nouveau Club", (await p.getByRole("link", { name: /Rejoindre la communauté/ }).count()) === 1);
    await p.getByRole("link", { name: /Rejoindre la communauté/ }).click(); await p.waitForURL("**/v3/club/community"); await p.waitForTimeout(700);
    ok("APPLICATION : Club → Rejoindre la communauté", (await vis("Rejoindre la communauté").count()) >= 1);
    await p.locator("nav[aria-label='Navigation du prototype']").getByRole("link", { name: "Home" }).click(); await p.waitForURL(B + "/"); await p.waitForTimeout(800);
    ok("APPLICATION : l'onglet Home ramène à l'accueil", (await p.locator("nav[aria-label='Navigation principale']").count()) === 1);
    await p.locator("nav[aria-label='Navigation principale']").getByRole("link", { name: "My Flight" }).click(); await p.waitForURL("**/v3/flight"); await p.waitForTimeout(700);
    ok("APPLICATION : l'onglet My Flight mène au nouveau My Flight", (await vis(/pas un titre de transport/i).count()) === 1);
    await p.goto(B + "/explore"); await p.waitForTimeout(900);
    await p.getByRole("link", { name: /Skyline Sound/ }).click(); await p.waitForURL("**/v3/explore/sound"); await p.waitForTimeout(700);
    ok("APPLICATION : Explore → Skyline Sound", (await vis("Quatre ambiances pour accompagner le voyage.").count()) === 1);
    const r1 = await ctx.request.get(B + "/club", { maxRedirects: 0 }); ok("ANCIENNE ROUTE /club redirigée", r1.status() === 307 || r1.status() === 308);
    await ctx.close();
  }

  console.log("ERREURS CONSOLE:", errs.length ? [...new Set(errs)] : "aucune"); console.log(fails ? `${fails} ÉCHEC(S)` : "TOUT PASSE");
  await b.close(); process.exit(fails ? 1 : 0);
})();
