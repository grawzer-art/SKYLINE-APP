/** Mémorise le point touché (origine de la révélation) et l'ouverture interne (fermeture = retour). Lecture unique. */
const ORIGIN = "skyline.signal.origin";
const INTERNAL = "skyline.signal.internal";

export function rememberOpen(el: HTMLElement) {
  try {
    const r = el.getBoundingClientRect();
    sessionStorage.setItem(ORIGIN, JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 }));
    sessionStorage.setItem(INTERNAL, "1");
  } catch {}
}

export function consumeOpen(): { origin: { x: number; y: number } | null; internal: boolean } {
  try {
    const o = sessionStorage.getItem(ORIGIN); const i = sessionStorage.getItem(INTERNAL) === "1";
    sessionStorage.removeItem(ORIGIN); sessionStorage.removeItem(INTERNAL);
    return { origin: o ? JSON.parse(o) : null, internal: i };
  } catch { return { origin: null, internal: false }; }
}
