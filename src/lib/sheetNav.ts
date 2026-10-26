/**
 * Ferme un panneau (qui retire sa propre entrée d'historique) PUIS navigue, sans que les deux s'annulent :
 * on attend le « popstate » du retour, avec un délai de sécurité.
 */
export function closeThenGo(close: () => void, go: () => void) {
  let done = false;
  const run = () => { if (!done) { done = true; go(); } };
  window.addEventListener("popstate", run, { once: true });
  window.setTimeout(run, 500);
  close();
}
