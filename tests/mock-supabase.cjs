/* eslint-disable */
// Faux serveur Supabase LOCAL pour les tests E2E du mode « base de données » : auth + REST + fonctions, en mémoire.
// Il sert à vérifier l'INTERFACE (chargement, erreurs, conflits, permissions affichées). La sécurité réelle (RLS, fonctions SQL) est testée
// sur un vrai Postgres local (tests/rls.test.mts, tests/missions-service.test.mts). AUCUN accès à un vrai projet Supabase.
const http = require("http");
const U = { tom: "11111111-1111-4111-8111-111111111111", graw: "22222222-2222-4222-8222-222222222222", qafard: "33333333-3333-4333-8333-333333333333", participant: "44444444-4444-4444-8444-444444444444" };
const NAMES = { tom: "Tom", graw: "Graw", qafard: "Qafard", participant: "Participant" };
const ROLES = { tom: { platform: [], spaces: ["staff"], staff: ["admin"] }, graw: { platform: ["super_admin"], spaces: ["staff", "members"], staff: [] }, qafard: { platform: [], spaces: ["staff"], staff: ["member"] }, participant: { platform: [], spaces: ["members"], staff: [] } };
const slugOf = (id) => Object.keys(U).find((k) => U[k] === id);
const coord = (slug) => ROLES[slug].platform.includes("super_admin") || ROLES[slug].staff.includes("admin");
const isStaff = (slug) => ROLES[slug].spaces.includes("staff");
let S;
const reset = () => { S = { missions: [], events: [], comments: [], profiles: {}, seq: 1, ctl: { delay: 0, fail: {} } }; };
reset();
const now = () => new Date().toISOString();
const uid = () => "aaaaaaaa-" + String(Date.now() % 1e4).padStart(4, "0") + "-4" + String(S.seq).padStart(3, "0") + "-8" + String(++S.seq).padStart(3, "0") + "-" + String(Math.floor(Math.random() * 1e12)).padStart(12, "0");
const ev = (m, actor, kind, x = {}) => S.events.push({ id: S.events.length + 1, mission_id: m.id, at: now(), actor_id: actor, kind, from_status: null, to_status: null, note: null, ...x });
const seed = () => {
  const mk = (title, assignee, validator, creator, status = "todo", extra = {}) => { const m = { id: uid(), title, description: "", creator_id: U[creator], assignee_id: U[assignee], proposed_assignee_id: null, validator_id: U[validator], project_id: null, priority: "normal", status, due_date: null, archived_at: null, version: 1, created_at: now(), updated_at: now(), ...extra }; S.missions.push(m); ev(m, U[creator], "created"); return m; };
  mk("Repérage photo", "qafard", "graw", "tom"); mk("Brief équipe", "tom", "graw", "tom", "in_progress"); mk("Mission privée de Tom", "tom", "graw", "tom"); mk("Photographies-panoramiques-extrêmement-longues-sans-espace-ABCDEFGHIJKLMNOPQRSTUVWXYZ", "tom", "graw", "tom");
};
seed();
const visible = (m, me) => coord(me) || [m.creator_id, m.assignee_id, m.validator_id, m.proposed_assignee_id].includes(U[me]);
const E = (code, message) => ({ status: code === "42501" ? 403 : 400, body: { code, message, details: null, hint: null } });
const FORB = E("42501", "forbidden"); const NOTF = E("P0001", "not_found");

function rpc(fn, a, me) {
  if (fn === "list_team") return { body: Object.keys(U).filter(isStaff).map((s) => ({ id: U[s], slug: s, display_name: NAMES[s], function_title: "Fonction " + s, platform_roles: ROLES[s].platform, staff_roles: ROLES[s].staff })) };
  if (fn === "upsert_my_participant_profile") {
    if (S.ctl.profileTable === "missing") return { status: 404, body: { code: "PGRST202", message: "Could not find the function public.upsert_my_participant_profile in the schema cache" } };
    if (!ROLES[me].spaces.includes("members")) return FORB;
    const good = (v) => typeof v === "string" && v.trim() && v.trim().length <= 60 && !/[\u0000-\u001f\u007f]/.test(v);
    if (!good(a.p_first_name)) return E("P0001", "invalid_first_name"); if (!good(a.p_last_name)) return E("P0001", "invalid_last_name"); if (!good(a.p_display_name)) return E("P0001", "invalid_display_name");
    const prev = S.profiles[me]; S.profiles[me] = { user_id: U[me], first_name: a.p_first_name.trim(), last_name: a.p_last_name.trim(), display_name: a.p_display_name.trim(), avatar_path: null, created_at: prev ? prev.created_at : now(), updated_at: now() }; return { body: S.profiles[me] };
  }
  if (!isStaff(me)) return FORB;
  const find = () => S.missions.find((x) => x.id === a.p_id && visible(x, me));
  const c = coord(me);
  if (fn === "create_mission") {
    if (!a.p_title || !a.p_title.trim()) return E("P0001", "invalid_title");
    if (a.p_status === "done" && !c) return E("42501", "forbidden_status");
    const valid = Object.keys(U).find((s) => U[s] === a.p_validator && coord(s)); if (!valid) return E("P0001", "invalid_validator");
    let eff = a.p_assignee, prop = null; if (a.p_assignee !== U[me] && !c) { eff = U[me]; prop = a.p_assignee; }
    if (a.p_validator === eff || a.p_validator === prop) return E("P0001", "validator_conflict");
    const m = { id: uid(), title: a.p_title.trim(), description: a.p_description || "", creator_id: U[me], assignee_id: eff, proposed_assignee_id: prop, validator_id: a.p_validator, project_id: null, priority: a.p_priority, status: a.p_status, due_date: a.p_due || null, archived_at: null, version: 1, created_at: now(), updated_at: now() };
    S.missions.push(m); ev(m, U[me], "created"); if (prop) ev(m, U[me], "assignment_proposed", { note: prop }); return { body: m };
  }
  if (fn === "add_mission_comment") { const m = find(); if (!m) return FORB; if (!a.p_body || !a.p_body.trim()) return E("P0001", "invalid_comment"); const cm = { id: uid(), mission_id: m.id, author_id: U[me], body: a.p_body.trim(), created_at: now() }; S.comments.push(cm); return { body: cm }; }
  if (fn === "resolve_assignment") {
    if (!c) return FORB; const m = S.missions.find((x) => x.id === a.p_id); if (!m) return NOTF; if (!m.proposed_assignee_id) return E("P0001", "no_pending_assignment");
    if (a.p_approve) { m.assignee_id = m.proposed_assignee_id; ev(m, U[me], "assignment_approved"); } else ev(m, U[me], "assignment_rejected");
    m.proposed_assignee_id = null; m.version++; return { body: null };
  }
  const m = find(); if (!m) return NOTF; if (m.archived_at && fn !== "delete_mission") return E("P0001", "archived");
  if (fn === "update_mission") {
    if (!(c || m.creator_id === U[me])) return FORB; if (m.version !== a.p_expected_version) return E("P0001", "version_conflict");
    Object.assign(m, { title: a.p_title.trim(), description: a.p_description || "", validator_id: a.p_validator, due_date: a.p_due || null, priority: a.p_priority, version: m.version + 1, updated_at: now() }); ev(m, U[me], "edited", { note: "title" }); return { body: m };
  }
  if (fn === "set_mission_status") {
    if (a.p_to === m.status) return E("P0001", "same_status"); const old = m.status;
    const ok = c || (m.validator_id === U[me] && old === "review" && ["done", "in_progress"].includes(a.p_to)) || (m.assignee_id === U[me] && ((old === "todo" && a.p_to === "in_progress") || (old === "in_progress" && ["todo", "review"].includes(a.p_to)) || (old === "review" && a.p_to === "in_progress")));
    if (!ok) return E("42501", "forbidden_transition"); m.status = a.p_to; m.version++; ev(m, U[me], old === "review" && a.p_to === "done" ? "validated" : "status", { from_status: old, to_status: a.p_to, note: a.p_note }); return { body: m };
  }
  if (fn === "assign_mission") {
    if (a.p_assignee === m.assignee_id) return E("P0001", "same_assignee"); if (c) { m.assignee_id = a.p_assignee; m.proposed_assignee_id = null; ev(m, U[me], "reassigned", { note: a.p_assignee }); }
    else if (m.creator_id === U[me] || m.assignee_id === U[me]) { m.proposed_assignee_id = a.p_assignee; ev(m, U[me], "assignment_proposed", { note: a.p_assignee }); } else return FORB; m.version++; return { body: m };
  }
  if (fn === "archive_mission") { if (!(c || m.creator_id === U[me])) return FORB; m.archived_at = now(); m.version++; ev(m, U[me], "archived"); return { body: m }; }
  if (fn === "delete_mission") { if (!c) return FORB; S.missions = S.missions.filter((x) => x !== m); S.events = S.events.filter((e) => e.mission_id !== m.id); return { body: null }; }
  return E("P0001", "unknown_function");
}

function select(table, q, me) {
  let rows;
  if (table === "accounts") rows = [{ id: U[me], display_name: NAMES[me], active: true }];
  else if (table === "platform_roles") rows = ROLES[me].platform.map((role) => ({ user_id: U[me], role }));
  else if (table === "space_access") rows = ROLES[me].spaces.map((space) => ({ user_id: U[me], space }));
  else if (table === "staff_roles") rows = ROLES[me].staff.map((role) => ({ user_id: U[me], role }));
  else if (table === "staff_profiles") rows = isStaff(me) ? [{ user_id: U[me], slug: me }] : [];
  else if (table === "missions") rows = isStaff(me) ? S.missions.filter((m) => visible(m, me)) : [];
  else if (table === "mission_events") rows = isStaff(me) ? S.events.filter((e) => { const m = S.missions.find((x) => x.id === e.mission_id); return m && visible(m, me); }) : [];
  else if (table === "participant_profiles") { if (S.ctl.profileTable === "missing") return "MISSING"; rows = ROLES[me].spaces.includes("members") && S.profiles[me] ? [S.profiles[me]] : []; }
  else if (table === "mission_comments") rows = isStaff(me) ? S.comments.filter((c) => { const m = S.missions.find((x) => x.id === c.mission_id); return m && visible(m, me); }) : [];
  else return null;
  for (const [k, v] of q.entries()) if (typeof v === "string" && v.startsWith("eq.")) rows = rows.filter((r) => String(r[k]) === v.slice(3));
  const ord = q.get("order"); if (ord) for (const part of ord.split(",").reverse()) { const [col, dir] = part.split("."); rows = [...rows].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === "desc" ? -1 : 1)); }
  const lim = q.get("limit"); if (lim) rows = rows.slice(0, Number(lim));
  return rows;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x"); const cors = { "access-control-allow-origin": req.headers.origin || "*", "access-control-allow-credentials": "true", "access-control-allow-headers": req.headers["access-control-request-headers"] || "authorization,apikey,content-type,accept,accept-profile,content-profile,prefer,x-client-info,x-supabase-api-version,range", "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS", "access-control-expose-headers": "content-range" };
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  let raw = ""; req.on("data", (d) => (raw += d)); req.on("end", () => {
    const send = (status, body, extra = {}) => { res.writeHead(status, { "content-type": "application/json", ...cors, ...extra }); res.end(body === undefined ? "" : JSON.stringify(body)); };
    const run = () => {
      const p = url.pathname;
      if (p === "/__control") { const b = raw ? JSON.parse(raw) : {}; if (b.reset) { reset(); seed(); } if (b.delay !== undefined) S.ctl.delay = b.delay; if (b.profileTable !== undefined) S.ctl.profileTable = b.profileTable; if (b.setAccount) { /* {who, spaces} : change les accès (test) */ ROLES[b.setAccount.who].spaces = b.setAccount.spaces; } if (b.fail) S.ctl.fail = b.fail; if (b.bump) { const m = S.missions.find((x) => x.title === b.bump); if (m) { m.version++; m.title += " (modifiée ailleurs)"; } } if (b.emptyTeam !== undefined) S.ctl.emptyTeam = b.emptyTeam; return send(200, { ok: true, missions: S.missions.length, comments: S.comments.length }); }
      if (p === "/__state") return send(200, S);
      const bearer = (req.headers.authorization || "").replace(/^Bearer /, ""); const me = bearer.startsWith("tok-") ? bearer.slice(4) : null;
      if (p === "/auth/v1/otp" && req.method === "POST") { return send(200, {}); }
      if (p === "/auth/v1/verify" && req.method === "POST") {
        const b = raw ? JSON.parse(raw) : {}; const who = String(b.email || "").split("@")[0];
        if (!U[who] || String(b.token) !== "123456") return send(403, { code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" });
        const exp = Math.floor(Date.now() / 1000) + 3600; return send(200, { access_token: "tok-" + who, token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: "r-" + who, user: { id: U[who], aud: "authenticated", role: "authenticated", email: who + "@example.test", app_metadata: {}, user_metadata: {}, created_at: now() } });
      }
      if (p === "/auth/v1/logout") return send(204, undefined);
      if (p === "/auth/v1/user") { if (!me || !U[me]) return send(401, { code: 401, msg: "invalid JWT" }); return send(200, { id: U[me], aud: "authenticated", role: "authenticated", email: me + "@example.test", app_metadata: {}, user_metadata: {}, created_at: now() }); }
      if (p.startsWith("/auth/v1/")) return send(200, {});
      if (!me || !U[me]) return send(401, { code: "PGRST301", message: "JWT expired" });
      const key = p.startsWith("/rest/v1/rpc/") ? p.slice(13) : p.slice(9);
      const f = S.ctl.fail[key]; if (f) { if (f.once !== false) delete S.ctl.fail[key]; if (f.destroy) return req.socket.destroy(); return send(f.status || 500, f.body || { message: "boom" }); }
      if (p.startsWith("/rest/v1/rpc/")) { const out = rpc(key, raw ? JSON.parse(raw) : {}, me); return out.status ? send(out.status, out.body) : send(200, out.body); }
      if (p.startsWith("/rest/v1/")) { const rows = select(key, url.searchParams, me); if (rows === "MISSING") return send(404, { code: "PGRST205", message: "Could not find the table 'public.participant_profiles' in the schema cache" }); if (!rows) return send(404, { message: "unknown" }); const single = (req.headers.accept || "").includes("pgrst.object"); return single ? (rows.length === 1 ? send(200, rows[0]) : send(406, { message: "no rows" })) : send(200, rows, { "content-range": `0-${Math.max(rows.length - 1, 0)}/*` }); }
      return send(404, { message: "not found" });
    };
    const d = S.ctl.delay; if (d && !url.pathname.startsWith("/__") && !url.pathname.startsWith("/auth/")) setTimeout(run, d); else run();
  });
});
const port = Number(process.env.MOCK_PORT || 3199); server.listen(port, "127.0.0.1", () => console.log("mock supabase on", port));
module.exports = { U };
