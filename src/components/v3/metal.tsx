"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ease } from "@/design/motion";
import { cn } from "@/lib/cn";

const noise = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

type OrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };
const clamp = (n: number) => Math.max(-1, Math.min(1, n));
const subscribeNone = () => () => {};
/** « ask » : iOS (permission au toucher) · « auto » : capteurs libres (Android) · « none » : pas de capteur / pas d'écran tactile. */
const sensorMode = () => (typeof DeviceOrientationEvent === "undefined" || !window.matchMedia("(pointer: coarse)").matches ? "none" : typeof (DeviceOrientationEvent as OrientationCtor).requestPermission === "function" ? "ask" : "auto");
const REST = { x: 0.28, y: 0.14 };

/**
 * Lumière et relief de la surface : suit le pointeur (souris, doigt) ou l'inclinaison du téléphone.
 * Les valeurs passent par des variables CSS, mises à jour au plus une fois par image : aucun rendu React pendant le geste.
 * iOS : la permission des capteurs n'est demandée qu'après l'action explicite `enableTilt`.
 * Réduction des animations ou aucun capteur : version statique (position de repos, aucune rotation).
 * `strength` règle l'amplitude de rotation (1 = discret ; le pass utilise 1.7).
 */
export function useMetal(strength = 1) {
  const reduce = !!useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const attach = useCallback((el: HTMLDivElement | null) => { ref.current = el; }, []);
  const frame = useRef(0);
  const smooth = useRef({ ...REST });
  const [pick, setPick] = useState<boolean | null>(null); // choix explicite du membre ; null = défaut du mode
  const mode = useSyncExternalStore(subscribeNone, sensorMode, () => "none");
  const supported = mode !== "none" && !reduce;
  const tilt = supported && (pick ?? mode === "auto");

  const set = useCallback((x: number, y: number, moving: boolean) => {
    const el = ref.current; if (!el) return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const st = el.style; el.dataset.live = moving ? "1" : "0";
      st.setProperty("--mx", `${(x * 100).toFixed(1)}%`); st.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      st.setProperty("--hx", x.toFixed(3)); st.setProperty("--hy", y.toFixed(3));
      st.setProperty("--nx", moving ? ((x - 0.5) * 2).toFixed(3) : "0"); st.setProperty("--ny", moving ? ((y - 0.5) * 2).toFixed(3) : "0");
      st.setProperty("--rx", moving ? `${((0.5 - y) * 6 * strength).toFixed(2)}deg` : "0deg"); st.setProperty("--ry", moving ? `${((x - 0.5) * 8 * strength).toFixed(2)}deg` : "0deg");
    });
  }, [strength]);

  const pointer = useCallback((e: React.PointerEvent) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    set(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)), true);
  }, [reduce, set]);
  const rest = useCallback(() => { if (!tilt) set(REST.x, REST.y, false); }, [set, tilt]);

  useEffect(() => {
    if (!tilt) return;
    const on = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      const s = smooth.current; // lissage : évite les saccades du capteur
      s.x += (clamp(e.gamma / 32) / 2 + 0.5 - s.x) * 0.18; s.y += (clamp((e.beta - 50) / 32) / 2 + 0.5 - s.y) * 0.18;
      set(s.x, s.y, true);
    };
    window.addEventListener("deviceorientation", on);
    return () => { window.removeEventListener("deviceorientation", on); cancelAnimationFrame(frame.current); };
  }, [tilt, set]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const enableTilt = useCallback(async () => {
    if (tilt) { setPick(false); set(REST.x, REST.y, false); return; }
    const C = DeviceOrientationEvent as OrientationCtor;
    try { if (typeof C.requestPermission === "function") { if ((await C.requestPermission()) !== "granted") return; } setPick(true); } catch { /* permission refusée : le pointeur / le toucher reste disponible */ }
  }, [tilt, set]);

  return { reduce, supported, tilt, mode, enableTilt, bind: { ref: attach, onPointerMove: pointer, onPointerDown: pointer, onPointerLeave: rest, onPointerUp: rest, onPointerCancel: rest } };
}

/** Bouton facultatif d'activation du reflet au mouvement (iPhone : la permission n'est demandée qu'au toucher). */
export function TiltToggle({ metal, label, labelOn }: { metal: ReturnType<typeof useMetal>; label: string; labelOn: string }) {
  if (!metal.supported) return null;
  return (
    <button type="button" onClick={metal.enableTilt} aria-pressed={metal.tilt}
      className="mx-auto mt-1 flex min-h-11 items-center gap-2 rounded-full px-4 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-cloud/72 transition active:text-cloud">
      <span aria-hidden className={cn("size-1.5 rounded-full transition", metal.tilt ? "bg-sky" : "bg-cloud/30")} />{metal.tilt ? labelOn : label}
    </button>
  );
}

/**
 * Surface « métal noir » : fond Jet Black, grain brossé, relief par liseré clair en haut et sombre en bas,
 * reflet doux qui suit la lumière. Rendu CSS seul (opacity/transform) : léger pour le GPU.
 */
export function MetalSurface({ metal, children, className, label, delay = 0.15, depth = false }: { metal: ReturnType<typeof useMetal>; children: React.ReactNode; className?: string; label: string; delay?: number; depth?: boolean }) {
  const { reduce } = metal;
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease, delay }} style={{ perspective: depth ? 1100 : 900 }}>
      <div {...metal.bind} role="group" aria-label={label}
        className={cn("relative w-full touch-pan-y select-none overflow-hidden rounded-[12px] border border-silver/35 shadow-[0_30px_50px_-22px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.75)] will-change-transform", className)}
        style={{ transform: "rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))", transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)", background: "linear-gradient(150deg,#14181e 0%,#07090c 40%,#0c0f13 68%,#181c22 100%)" }}>
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-70" style={{ background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.028) 0 1px, transparent 1px 3px)" }} />
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: noise }} />
        <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(110% 80% at var(--mx,28%) var(--my,14%), rgba(245,245,243,0.24), transparent 58%), linear-gradient(105deg, transparent calc(var(--mx,28%) - 16%), rgba(245,245,243,0.1) var(--mx,28%), transparent calc(var(--mx,28%) + 16%))" }} />
        {depth && <>
          <span aria-hidden data-layer="blue" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(70% 55% at calc(100% - var(--mx,28%)) calc(100% - var(--my,14%)), rgba(143,184,255,0.2), transparent 65%)" }} />
          <span aria-hidden data-layer="holo" className="pointer-events-none absolute inset-0 opacity-[0.2] mix-blend-screen"
            style={{ background: "conic-gradient(from calc(var(--hx,0.28) * 140deg) at var(--mx,28%) var(--my,14%), rgba(143,184,255,0), rgba(143,184,255,0.55), rgba(192,192,192,0.45), rgba(245,245,243,0.18), rgba(143,184,255,0.5), rgba(143,184,255,0))", WebkitMaskImage: "repeating-linear-gradient(115deg, #000 0 1px, rgba(0,0,0,0.3) 1px 5px)", maskImage: "repeating-linear-gradient(115deg, #000 0 1px, rgba(0,0,0,0.3) 1px 5px)" }} />
        </>}
        <span aria-hidden className="pointer-events-none absolute inset-[6px] rounded-[7px] border border-silver/12" />
        <span aria-hidden className="metal-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-cloud/10 to-transparent" />
        {children}
      </div>
    </motion.div>
  );
}
