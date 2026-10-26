"use client";
import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Emblem } from "@/components/ui/Emblem";
import { Photo } from "@/components/ui/Photo";
import { DemoTag } from "./ui";
import { ease } from "@/design/motion";
import { cn } from "@/lib/cn";

/** Fond photographique plein cadre avec dégradés de lisibilité locaux (haut pour l'en-tête, bas pour le texte). */
export function Backdrop({ src, position, className, strength = "normal" }: { src: string; position?: string; className?: string; strength?: "soft" | "normal" | "deep" }) {
  return (
    <div aria-hidden className={cn("absolute inset-0 -z-10 overflow-hidden", className)}>
      <Photo src={src} objectPosition={position} priority sizes="(max-width: 480px) 100vw, 480px" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-jet/75 to-transparent" />
      <div className={cn("absolute inset-x-0 bottom-0 bg-gradient-to-t from-jet via-jet/70 to-transparent", strength === "soft" ? "h-1/2" : strength === "deep" ? "h-[85%]" : "h-[68%]")} />
    </div>
  );
}

/** Avatar : initiales sur fond sobre, anneau argent ou bleu ciel. Jamais de photo de personne dans le prototype. */
export function Face({ name, size = 52, tone = "silver", src, className }: { name: string; size?: number; tone?: "silver" | "sky" | "none"; src?: string | null; className?: string }) {
  const ring = tone === "sky" ? "ring-2 ring-sky/80" : tone === "silver" ? "ring-1 ring-silver/50" : "";
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} style={{ width: size, height: size }} className={cn("shrink-0 rounded-full object-cover", ring, className)} />
  ) : (
    <span aria-hidden style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cn("inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#1b2028] to-[#0e1217] font-display text-cloud", ring, className)}>
      {name.trim().slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Ligne d'accès : vignette photographique, titre, sous-titre. Une seule action par ligne. */
export function NavTile({ href, title, sub, visual, badge, locked }: { href: string; title: string; sub: string; visual: string; badge?: string; locked?: boolean }) {
  return (
    <Link href={href} className="group flex h-[4.75rem] items-stretch overflow-hidden rounded-[6px] border border-cloud/10 bg-surface-1 transition active:scale-[0.99]">
      <span className="relative block w-[4.75rem] shrink-0"><Photo src={visual} sizes="76px" imgClassName={cn("transition duration-700 group-hover:scale-110", locked && "opacity-50")} /></span>
      <span className="flex min-w-0 flex-1 flex-col justify-center px-4">
        <span className="font-display block text-[0.98rem] leading-none">{title}</span>
        <span className="mt-1.5 block truncate text-[0.78rem] text-cloud/65">{sub}</span>
      </span>
      <span className="flex items-center gap-3 pr-4">
        {badge && <span className="border border-sky/60 px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-sky">{badge}</span>}
        <ArrowRight size={16} strokeWidth={1.5} aria-hidden className="text-silver transition group-hover:translate-x-1 motion-reduce:transition-none" />
      </span>
    </Link>
  );
}

/**
 * Carte membre : objet noir / argent à l'emblème officiel. Légère inclinaison au toucher (désactivée si animations réduites).
 * Le numéro et la date sont des emplacements tant que l'équipe ne les attribue pas.
 */
export function MembershipCard({ name, since, number, member, sinceLabel, numberLabel, demo }: { name: string; since: string; number: string; member: string; sinceLabel: string; numberLabel: string; demo?: boolean }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const tilt = (e: React.PointerEvent) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5; const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg)`;
    ref.current.style.setProperty("--sx", `${(0.5 + x) * 100}%`); ref.current.style.setProperty("--sy", `${(0.5 + y) * 100}%`);
  };
  const rest = () => { if (ref.current) ref.current.style.transform = "perspective(900px) rotateX(0) rotateY(0)"; };
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 24, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.9, ease, delay: 0.15 }}>
      <div ref={ref} onPointerMove={tilt} onPointerLeave={rest} onPointerUp={rest} role="img" aria-label={`${member} SKYLINE — ${name}`}
        className="relative aspect-[1.586/1] w-full touch-pan-y overflow-hidden rounded-[10px] border border-silver/45 shadow-[0_28px_60px_-18px_rgba(0,0,0,0.85)] transition-transform duration-200 ease-out"
        style={{ background: "linear-gradient(135deg,#171b22 0%,#0b0e12 46%,#1c2128 100%)" }}>
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.16]" style={{ background: "radial-gradient(circle at var(--sx,25%) var(--sy,15%), #f5f5f3 0%, transparent 55%)" }} />
        <span aria-hidden className="pointer-events-none absolute inset-[7px] rounded-[6px] border border-silver/15" />
        {demo && <span className="absolute right-4 top-4"><DemoTag /></span>}
        <span className="absolute left-1/2 top-[13%] -translate-x-1/2"><Emblem size={92} /></span>
        <span className="absolute inset-x-5 bottom-4 flex items-end justify-between">
          <span><span className="font-mono block text-[0.5rem] uppercase tracking-[0.26em] text-silver">{member}</span><span className="font-display mt-1 block text-[1.15rem] leading-none">{name}</span><span className="font-mono mt-1.5 block text-[0.5rem] uppercase tracking-[0.2em] text-cloud/60">{sinceLabel} {since}</span></span>
          <span className="text-right font-mono text-[0.5rem] uppercase tracking-[0.18em] text-cloud/60">{numberLabel}<br /><span className="text-cloud/85">{number}</span></span>
        </span>
      </div>
    </motion.div>
  );
}

/** Pastille de goût musical (affichage seul, non interactive). */
export const Vibe = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex min-h-8 items-center rounded-full border border-silver/45 px-3.5 text-[0.8rem] text-cloud/90">{children}</span>
);
