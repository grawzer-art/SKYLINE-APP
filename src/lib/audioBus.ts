/**
 * Un seul son à la fois dans SKYLINE : quand une source démarre, les autres se mettent en pause.
 * Sources : « soundcloud » (widget officiel global), « legacy » (ancien lecteur de démonstration), « signal » (extraits SKYLINE SIGNAL).
 */
export type AudioSource = "soundcloud" | "legacy" | "signal";
const EVENT = "skyline:audio-start";
export const announceAudio = (source: AudioSource) => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<AudioSource>(EVENT, { detail: source })); };
/** `self` ne réagit qu'aux AUTRES sources. Retourne la fonction de désabonnement. */
export function onOtherAudio(self: AudioSource, cb: (other: AudioSource) => void) {
  const h = (e: Event) => { const s = (e as CustomEvent<AudioSource>).detail; if (s !== self) cb(s); };
  window.addEventListener(EVENT, h); return () => window.removeEventListener(EVENT, h);
}
