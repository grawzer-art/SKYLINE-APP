/* eslint-disable */
// B3 — schéma « b3 » (migration appliquée, STAFF_DB_SCHEMA=b3) : heure des missions (create/update_mission_v2) et AGENDA COLLECTIF (list_team_agenda).
// Faux serveur Supabase local (tests/mock-supabase.cjs) : aucun vrai projet. Voir tests/run-db.sh (serveur b3 sur le port 3104).
const { chromium } = require("playwright");
const APP = process.env.BASE_B3 || "http://localhost:3104"; const MOCK = process.env.MOCK || "http://127.0.0.1:3199";
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d ? " — " + d : ""}`); if (!c) fails++; };
const ctl = (b) => fetch(MOCK + "/__control", { method: "POST", body: JSON.stringify(b) }).then((r) => r.json());
const rpc = (who, fn, args) => fetch(`${MOCK}/rest/v1/rpc/${fn}`, { method: "POST", headers: { authorization: "Bearer tok-" + who, "content-type": "application/json" }, body: JSON.stringify(args) }).then((r) => r.json());
const cookieFor = (who) => { const s = { access_token: "tok-" + who, refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: who, aud: "authenticated", role: "authenticated", email: who + "@example.test" } }; return "base64-" + Buffer.from(JSON.stringify(s)).toString("base64url"); };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; const TODAY = iso(new Date());
(async () => {
  const browser = await chromium.launch(); await ctl({ reset: true, delay: 0, fail: {} });
  const mk = async (who) => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await ctx.addCookies([{ name: "sb-127-auth-token", value: cookieFor(who), url: APP }]); const p = await ctx.newPage(); p.setDefaultTimeout(15000); return { ctx, p }; };
  const vis = async (loc, t = 8000) => { try { await loc.first().waitFor({ state: "visible", timeout: t }); return true; } catch { return false; } };
  const T = (await mk("tom")).p; const Q = (await mk("qafard")).p; const btn = (p, n) => p.getByRole("button", { name: n }); const dlg = (p) => p.getByRole("dialog");
  const s = await (await fetch(APP + "/api/staff/session", { headers: { cookie: `sb-127-auth-token=${cookieFor("tom")}` } })).json();
  ok("CONFIG : le serveur annonce le schéma « b3 » (réglage serveur explicite)", s.dbSchema === "b3" && s.dataSource === "db", JSON.stringify(s).slice(0, 200));

  /* 1. Heure des missions (fonctions _v2) */
  await T.goto(APP + "/staff/schedule", { waitUntil: "domcontentloaded" }); await vis(btn(T, /^Ajouter$/), 10000); await btn(T, /^Ajouter$/).click(); await vis(T.locator("#f-title"));
  ok("B3 · AGENDA : l'heure facultative est proposée (champ Heure) quand la base la sait enregistrer", (await T.locator("#f-time").count()) === 1);
  await T.locator("#f-title").fill("Briefing avec heure"); await T.locator("#f-time").fill("09:30"); await btn(T, /^Créer la mission$/).click(); await vis(dlg(T).getByText("Briefing avec heure"));
  ok("B3 · HEURE : la mission est créée via create_mission_v2 avec son heure (09h30) — relue depuis la base", (await vis(dlg(T).getByText(/à 09h30/))) && (await (await fetch(MOCK + "/__state")).json()).missions.some((m) => m.title === "Briefing avec heure" && m.due_time === "09:30"));
  await btn(T, /Modifier les informations/).click(); await vis(T.locator("#f-time")); await T.locator("#f-time").fill("14:15"); await btn(T, /Enregistrer les informations/).click();
  ok("B3 · HEURE : modification de l'heure dans « Informations » (update_mission_v2)", await vis(dlg(T).getByText(/à 14h15/)));
  await btn(T, /Modifier les informations/).click(); await vis(T.locator("#f-due")); await T.locator("#f-due").fill(""); ok("B3 · HEURE : sans date, le champ Heure est désactivé (jamais d'heure sans date)", await T.locator("#f-time").isDisabled());
  await btn(T, /Enregistrer les informations/).click(); await vis(dlg(T).getByText("Briefing avec heure")); await T.waitForTimeout(500);
  ok("B3 · HEURE : effacer la date efface l'heure (état cohérent en base)", (await (await fetch(MOCK + "/__state")).json()).missions.some((m) => m.title === "Briefing avec heure" && m.due_date === null && m.due_time === null));
  await T.keyboard.press("Escape"); await T.waitForTimeout(500);

  /* 2. Agenda collectif : un membre voit le planning de l'équipe */
  await T.goto(APP + "/staff/schedule", { waitUntil: "domcontentloaded" }); await vis(btn(T, /^Ajouter$/), 10000); await btn(T, /^Ajouter$/).click(); await vis(T.locator("#f-title"));
  await T.locator("#f-title").fill("Planning de Tom"); await T.locator("#f-desc").fill("DESCRIPTION CONFIDENTIELLE"); await T.locator("#f-time").fill("08:00"); await btn(T, /^Créer la mission$/).click(); await vis(dlg(T).getByText("Planning de Tom")); await T.keyboard.press("Escape"); await T.waitForTimeout(500);
  await btn(T, /^Ajouter$/).click(); await vis(T.locator("#f-title")); await T.locator("#f-title").fill("Négociation privée"); await T.locator("#f-time").fill("11:00"); await btn(T, /^Créer la mission$/).click(); await vis(dlg(T).getByText("Négociation privée")); await T.keyboard.press("Escape"); await T.waitForTimeout(500);
  const priv = (await (await fetch(MOCK + "/__state")).json()).missions.find((m) => m.title === "Négociation privée"); await rpc("tom", "set_mission_private", { p_id: priv.id, p_private: true });
  const bodies = []; Q.on("response", async (r) => { if (/rpc\/list_team_agenda/.test(r.url()) && r.request().method() === "POST") { try { bodies.push(await r.text()); } catch {} } });
  await Q.goto(APP + "/staff/schedule", { waitUntil: "domcontentloaded" }); await vis(btn(Q, /^Ajouter$/), 10000);
  ok("B3 · AGENDA : « Mon agenda » de Qafard ne montre pas la mission de Tom", (await Q.getByText("Planning de Tom").count()) === 0);
  await btn(Q, /^Équipe$/).click();
  ok("B3 · AGENDA COLLECTIF : Qafard (membre) voit le planning de l'équipe — mission de Tom, heure, responsable", (await vis(Q.getByTestId("shared-row").filter({ hasText: "Planning de Tom" }))) && (await Q.getByTestId("shared-row").filter({ hasText: "Planning de Tom" }).getByText("08h00").count()) === 1 && (await Q.getByTestId("shared-row").filter({ hasText: "Planning de Tom" }).getByText("Tom", { exact: true }).count()) >= 1);
  ok("B3 · AGENDA COLLECTIF : mention explicite « le détail reste réservé aux personnes concernées »", await vis(Q.getByText(/détail d.une mission reste réservé/)));
  ok("B3 · CONFIDENTIALITÉ : la mission marquée privée n'apparaît PAS dans le planning collectif", (await Q.getByText("Négociation privée").count()) === 0);
  const row = Q.getByTestId("shared-row").filter({ hasText: "Planning de Tom" }); await row.click({ force: true }).catch(() => {}); await Q.waitForTimeout(500);
  ok("B3 · CONFIDENTIALITÉ : aucune fiche ne s'ouvre (lecture seule, pas de détail)", (await dlg(Q).count()) === 0);
  const txt = await Q.locator("body").innerText(); ok("B3 · CONFIDENTIALITÉ : la description confidentielle n'est affichée nulle part", !txt.includes("DESCRIPTION CONFIDENTIELLE") && !txt.includes("CONFIDENTIELLE"));
  ok("B3 · CONFIDENTIALITÉ (réseau) : la réponse de list_team_agenda ne contient que les 7 champs prévus, jamais de description", bodies.length >= 1 && bodies.every((b) => { const rows = JSON.parse(b); return rows.every((r) => Object.keys(r).sort().join() === "assignee_id,due_date,due_time,id,priority,status,title") && !/CONFIDENTIELLE|description/.test(b); }), String(bodies[0]).slice(0, 200));
  ok("B3 · RLS B2 intacte : Qafard ne peut toujours pas ouvrir la mission de Tom (Missions)", await (async () => { await Q.goto(APP + "/staff/missions", { waitUntil: "domcontentloaded" }); await vis(Q.getByText(/Repérage photo/), 10000); return (await Q.getByText("Planning de Tom").count()) === 0; })());

  /* 3. États : erreur du planning collectif, nouvel essai */
  await ctl({ fail: { list_team_agenda: { status: 500, body: { message: "x" }, once: false } } });
  await Q.goto(APP + "/staff/schedule", { waitUntil: "domcontentloaded" }); await vis(btn(Q, /^Ajouter$/), 10000); await btn(Q, /^Équipe$/).click();
  ok("B3 · ÉTAT : échec du planning collectif → « Planning de l'équipe indisponible » + Réessayer (le reste de l'agenda reste utilisable)", (await vis(Q.getByText("Planning de l'équipe indisponible"))) && await vis(btn(Q, /^Réessayer$/)));
  await ctl({ fail: {} }); await btn(Q, /^Réessayer$/).click(); ok("B3 · ÉTAT : « Réessayer » recharge le planning de l'équipe", await vis(Q.getByTestId("shared-row").filter({ hasText: "Planning de Tom" })));

  /* 4. Ergonomie : 320 → 430 px (agenda collectif et formulaire avec heure) */
  const ergo = (p) => p.evaluate(() => { const root = document.querySelector("[role=dialog]") || document.body; const v = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; }; const small = [], zoom = [];
    root.querySelectorAll("button, a[href], select, input:not([type=hidden]), textarea, [role=radio]").forEach((el) => { if (!v(el)) return; const r = el.getBoundingClientRect(); if (r.width <= 2 && r.height <= 2) return; const nm = ((el.getAttribute("aria-label") || el.textContent || el.tagName) + "").trim().slice(0, 28); if (r.height < 43.5 || r.width < 43.5) small.push(`${nm} ${Math.round(r.width)}x${Math.round(r.height)}`); if (/INPUT|SELECT|TEXTAREA/.test(el.tagName) && el.type !== "checkbox" && parseFloat(getComputedStyle(el).fontSize) < 16) zoom.push(nm); });
    const d = document.querySelector("[role=dialog]"); return { small, zoom, hscroll: document.documentElement.scrollWidth > window.innerWidth || (d ? d.scrollWidth > d.clientWidth + 1 : false) }; });
  for (const [w, h] of [[320, 568], [375, 667], [390, 844], [430, 932]]) {
    await Q.setViewportSize({ width: w, height: h }); await Q.goto(APP + "/staff/schedule", { waitUntil: "domcontentloaded" }); await vis(btn(Q, /^Ajouter$/), 10000); await btn(Q, /^Équipe$/).click(); await vis(Q.getByTestId("shared-row"));
    let r = await ergo(Q); ok(`B3 · IPHONE ${w} px — agenda collectif : cibles ≥ 44 px, champs ≥ 16 px, sans débordement`, !r.small.length && !r.zoom.length && !r.hscroll, JSON.stringify(r));
    await btn(Q, /^Ajouter$/).click(); await vis(Q.locator("#f-time")); r = await ergo(Q); ok(`B3 · IPHONE ${w} px — formulaire avec heure : cibles ≥ 44 px, champs ≥ 16 px, sans débordement`, !r.small.length && !r.zoom.length && !r.hscroll, JSON.stringify(r)); await Q.keyboard.press("Escape"); await Q.waitForTimeout(500);
  }
  await browser.close(); console.log(fails ? `\n${fails} ÉCHEC(S)` : "\nTous les tests E2E B3 (schéma b3) sont passés."); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
