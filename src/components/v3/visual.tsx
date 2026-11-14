"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
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
    <Link href={href} className="group flex min-h-16 items-stretch overflow-hidden rounded-[6px] border border-cloud/10 bg-surface-1 transition active:scale-[0.99]">
      <span className="relative block w-16 shrink-0"><Photo src={visual} sizes="64px" imgClassName={cn("transition duration-700 group-hover:scale-110", locked && "opacity-50")} /></span>
      <span className="flex min-w-0 flex-1 flex-col justify-center px-3.5 py-2.5">
        <span className="font-display block text-[0.98rem] leading-[1.05]">{title}</span>
        <span className="mt-1.5 line-clamp-2 text-[0.78rem] leading-snug text-cloud/75">{sub}</span>
      </span>
      <span className="flex items-center gap-3 pr-4">
        {badge && <span className="rounded-[8px] border border-sky/60 px-1.5 py-0.5 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-sky">{badge}</span>}
        <ArrowRight size={16} strokeWidth={1.5} aria-hidden className="text-silver transition group-hover:translate-x-1 motion-reduce:transition-none" />
      </span>
    </Link>
  );
}

/** Pastille de goût musical (affichage seul, non interactive). */
export const Vibe = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex min-h-8 items-center rounded-full border border-silver/45 px-3.5 text-[0.8rem] text-cloud/90">{children}</span>
);
