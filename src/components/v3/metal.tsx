"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ease } from "@/design/motion";
import { cn } from "@/lib/cn";

const noise = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

type OrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };
const clamp = (n: number) => Math.max(-1, Math.min(1, n));
const subscribeNone = () => () => {};
const canTilt = () => typeof DeviceOrientationEvent !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/**
 * Lumière de la surface : suit le doigt (toucher) ou, si le membre l'active, l'inclinaison du téléphone.
 * Les valeurs passent par des variables CSS, mises à jour au plus une fois par image : aucun rendu React pendant le geste.
 * La permission des capteurs n'est demandée qu'après l'action explicite `enableTilt`.
 */
export function useMetal() {
  const reduce = !!useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const attach = useCallback((el: HTMLDivElement | null) => { ref.current = el; }, []);
  const frame = useRef(0);
  const [tilt, setTilt] = useState(false);
  const supported = useSyncExternalStore(subscribeNone, canTilt, () => false) && !reduce;

  const set = useCallback((x: number, y: number, moving: boolean) => {
    const el = ref.current; if (!el) return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.dataset.live = moving ? "1" : "0";
      el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`); el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      el.style.setProperty("--rx", moving ? `${((0.5 - y) * 6).toFixed(2)}deg` : "0deg"); el.style.setProperty("--ry", moving ? `${((x - 0.5) * 8).toFixed(2)}deg` : "0deg");
    });
  }, []);

  const pointer = useCallback((e: React.PointerEvent) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    set(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)), true);
  }, [reduce, set]);
  const rest = useCallback(() => { if (!tilt) set(0.28, 0.14, false); }, [set, tilt]);

  useEffect(() => {
    if (!tilt || reduce) return;
    const on = (e: DeviceOrientationEvent) => { if (e.gamma == null || e.beta == null) return; set(clamp(e.gamma / 32) / 2 + 0.5, clamp((e.beta - 50) / 32) / 2 + 0.5, true); };
    window.addEventListener("deviceorientation", on);
    return () => { window.removeEventListener("deviceorientation", on); cancelAnimationFrame(frame.current); };
  }, [tilt, reduce, set]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const enableTilt = useCallback(async () => {
    if (tilt) { setTilt(false); set(0.28, 0.14, false); return; }
    const C = DeviceOrientationEvent as OrientationCtor;
    try { if (typeof C.requestPermission === "function") { if ((await C.requestPermission()) !== "granted") return; } setTilt(true); } catch { /* permission refusée : le toucher reste disponible */ }
  }, [tilt, set]);

  return { reduce, supported, tilt, enableTilt, bind: { ref: attach, onPointerMove: pointer, onPointerDown: pointer, onPointerLeave: rest, onPointerUp: rest, onPointerCancel: rest } };
}

/** Bouton facultatif d'activation du reflet au mouvement (iPhone : la permission n'est demandée qu'au toucher). */
export function TiltToggle({ metal, label, labelOn }: { metal: ReturnType<typeof useMetal>; label: string; labelOn: string }) {
  if (!metal.supported) return null;
  return (
    <button type="button" onClick={metal.enableTilt} aria-pressed={metal.tilt}
      className="mx-auto mt-1 flex min-h-11 items-center gap-2 rounded-full px-4 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-cloud/60 transition active:text-cloud">
      <span aria-hidden className={cn("size-1.5 rounded-full transition", metal.tilt ? "bg-sky" : "bg-cloud/30")} />{metal.tilt ? labelOn : label}
    </button>
  );
}

/**
 * Surface « métal noir » : fond Jet Black, grain brossé, relief par liseré clair en haut et sombre en bas,
 * reflet doux qui suit la lumière. Rendu CSS seul (opacity/transform) : léger pour le GPU.
 */
export function MetalSurface({ metal, children, className, label, delay = 0.15 }: { metal: ReturnType<typeof useMetal>; children: React.ReactNode; className?: string; label: string; delay?: number }) {
  const { reduce } = metal;
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease, delay }} style={{ perspective: 900 }}>
      <div {...metal.bind} role="group" aria-label={label}
        className={cn("relative w-full touch-pan-y select-none overflow-hidden rounded-[12px] border border-silver/35 shadow-[0_30px_50px_-22px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.75)] will-change-transform", className)}
        style={{ transform: "rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))", transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)", background: "linear-gradient(150deg,#14181e 0%,#07090c 40%,#0c0f13 68%,#181c22 100%)" }}>
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-70" style={{ background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.028) 0 1px, transparent 1px 3px)" }} />
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: noise }} />
        <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(110% 80% at var(--mx,28%) var(--my,14%), rgba(245,245,243,0.24), transparent 58%), linear-gradient(105deg, transparent calc(var(--mx,28%) - 16%), rgba(245,245,243,0.1) var(--mx,28%), transparent calc(var(--mx,28%) + 16%))" }} />
        <span aria-hidden className="pointer-events-none absolute inset-[6px] rounded-[7px] border border-silver/12" />
        <span aria-hidden className="metal-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-cloud/10 to-transparent" />
        {children}
      </div>
    </motion.div>
  );
}
