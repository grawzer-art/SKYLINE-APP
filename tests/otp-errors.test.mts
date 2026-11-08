// Sprint 01 — useEmailCodeLogin : classement des erreurs Supabase Auth (aucun envoi affiché en cas d'erreur, messages neutres, aucun texte brut).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NEUTRAL_MESSAGE, classifySendError, classifyVerifyError, type AuthErrLike } from "../src/lib/auth/otpErrors.ts";

let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };
const E = (status: number | undefined, code?: string, message = "boom", name = "AuthApiError"): AuthErrLike => ({ status, code, message, name });

t("succès : seul « pas d'erreur » donne « envoyé » ; message neutre inchangé", () => {
  assert.deepEqual(classifySendError(null, "login"), { kind: "sent", message: NEUTRAL_MESSAGE }); assert.deepEqual(classifySendError(undefined, "signup"), { kind: "sent", message: NEUTRAL_MESSAGE });
  assert.equal(NEUTRAL_MESSAGE, "Si ce compte existe, un code vient d'être envoyé par e-mail.");
});
t("ANTI-ÉNUMÉRATION : compte inconnu / banni = classe NEUTRE (même message que le succès, même étape) ; en connexion, « signups not allowed » aussi", () => {
  for (const e of [E(422, "otp_disabled", "Signups not allowed for otp"), E(422, "signup_disabled"), E(400, "user_not_found", "User not found"), E(403, "user_banned", "User is banned"), E(422, undefined, "Signups not allowed for otp")]) {
    const r = classifySendError(e, "login"); assert.equal(r.kind, "neutral", JSON.stringify(e)); assert.equal(r.message, NEUTRAL_MESSAGE);
  }
  for (const e of [E(400, "user_not_found"), E(403, "user_banned")]) assert.equal(classifySendError(e, "signup").kind, "neutral");   // même en inscription : aucun indice sur un compte
});
t("ERREURS RÉELLES : jamais présentées comme un envoi — débit, CAPTCHA, adresse invalide, indisponibilité, réseau, inconnu", () => {
  const cases: [AuthErrLike, string][] = [
    [E(429, "over_email_send_rate_limit", "email rate limit exceeded"), "rate"], [E(429), "rate"], [E(400, "over_request_rate_limit"), "rate"], [E(undefined, undefined, "Too many requests"), "rate"],
    [E(400, "captcha_failed", "captcha verification process failed"), "captcha"], [E(400, undefined, "invalid captcha response"), "captcha"],
    [E(400, "email_address_invalid", "Email address is invalid"), "invalid_email"], [E(422, "validation_failed", "Unable to validate email address: invalid format"), "invalid_email"],
    [E(500, "unexpected_failure"), "unavailable"], [E(502), "unavailable"], [E(503, undefined, "x", "AuthRetryableFetchError"), "unavailable"], [E(500, "hook_timeout"), "unavailable"], [E(400, "email_address_not_authorized"), "unavailable"],
    [E(0, undefined, "Failed to fetch", "AuthRetryableFetchError"), "network"], [E(undefined, undefined, "fetch failed", "AuthRetryableFetchError"), "network"], [E(undefined, undefined, "Failed to fetch", "TypeError"), "network"],
    [E(418, "teapot", "something else"), "unknown"],
  ];
  for (const [e, kind] of cases) { const r = classifySendError(e, "login"); assert.equal(r.kind, kind, JSON.stringify(e)); assert.notEqual(r.message, NEUTRAL_MESSAGE); assert.doesNotMatch(r.message, /envoy[ée]/i, "ne dit jamais « envoyé »"); }
});
t("INSCRIPTION : « inscriptions désactivées » = état global (message dédié, pas d'étape code) ; erreurs identiques sinon", () => {
  for (const e of [E(422, "otp_disabled", "Signups not allowed for otp"), E(422, "signup_disabled")]) { const r = classifySendError(e, "signup"); assert.equal(r.kind, "signup_closed"); assert.match(r.message, /pas disponible/); }
  assert.equal(classifySendError(E(500), "signup").kind, "unavailable"); assert.equal(classifySendError(E(429), "signup").kind, "rate");
});
t("aucun texte brut du serveur n'est jamais renvoyé", () => {
  const raw = 'duplicate key value violates "users_pkey" at /var/secret'; for (const e of [E(500, undefined, raw), E(400, "x", raw), E(0, undefined, raw, "AuthRetryableFetchError")]) { assert.doesNotMatch(JSON.stringify([classifySendError(e, "login"), classifyVerifyError(e)]), /duplicate|secret|users_pkey/); }
});
t("vérification du code : code invalide ≠ panne ; limitation ; réseau ; serveur", () => {
  assert.equal(classifyVerifyError(null).kind, "ok");
  for (const e of [E(403, "otp_expired", "Token has expired or is invalid"), E(400, undefined, "Token has expired or is invalid"), E(422, "validation_failed"), E(403, "user_banned")]) { const r = classifyVerifyError(e); assert.equal(r.kind, "invalid", JSON.stringify(e)); assert.equal(r.message, "Code invalide ou expiré."); }
  assert.equal(classifyVerifyError(E(429, "over_request_rate_limit")).kind, "rate"); assert.equal(classifyVerifyError(E(500)).kind, "unavailable"); assert.equal(classifyVerifyError(E(0, undefined, "Failed to fetch", "AuthRetryableFetchError")).kind, "network");
  assert.notEqual(classifyVerifyError(E(500)).message, "Code invalide ou expiré."); assert.notEqual(classifyVerifyError(E(undefined, undefined, "???")).message, "Code invalide ou expiré.");
});
t("le hook : n'affiche l'étape « code » et le message d'envoi QUE pour sent / neutral ; toute autre issue → erreur sur l'étape e-mail", () => {
  const h = readFileSync("src/lib/auth/useEmailCodeLogin.ts", "utf8");
  assert.match(h, /classifySendError\(error, allowCreate === true \? "signup" : "login"\)/); assert.match(h, /classifyVerifyError\(error\)/);
  const i = h.indexOf('r.kind === "sent" || r.kind === "neutral"'); assert.ok(i > 0); const before = h.slice(0, i);
  assert.doesNotMatch(before.slice(before.indexOf("const send")), /setStep\("code"\)|setMsg\([^n]/);                         // aucune étape code / message AVANT le test de la classe
  assert.equal((h.match(/setStep\("code"\)/g) ?? []).length, 1);                                                          // un seul endroit, derrière le test
  assert.doesNotMatch(h, /error\.message|err\.message|x\.message/);                                                       // aucun texte brut affiché
});
console.log(`${n} tests ERREURS OTP : OK`);
