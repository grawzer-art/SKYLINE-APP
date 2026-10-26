"use client";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Étiquette « fictif » : tout contenu du prototype est une démonstration. */
export const DemoTag = ({ children = "Démo" }: { children?: ReactNode }) => (
  <span className="border border-cloud/30 px-1.5 py-0.5 font-mono text-[0.52rem] uppercase tracking-[0.16em] text-cloud/60">{children}</span>
);

/** Initiales sur fond sobre : aucune photo de personne dans le prototype. */
export function Initials({ name, size = 44, className }: { name: string; size?: number; className?: string }) {
  return (
    <span aria-hidden style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={cn("inline-grid shrink-0 place-items-center rounded-full border border-silver/40 bg-surface-2 font-mono font-medium text-cloud", className)}>
      {name.trim().slice(0, 1).toUpperCase()}
    </span>
  );
}

export function ScreenTitle({ eyebrow, title, back, children }: { eyebrow: string; title: string; back?: { href: string; label: string }; children?: ReactNode }) {
  return (
    <header className="px-5 pt-[calc(var(--safe-top)+6.25rem)]">
      {back && (
        <Link href={back.href} className="-ml-1 mb-4 inline-flex min-h-11 items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-dim transition hover:text-cloud">
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden /> {back.label}
        </Link>
      )}
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-sky">{eyebrow}</p>
      <h1 className="font-display mt-2 text-[clamp(1.7rem,8.4vw,2.5rem)]">{title}</h1>
      {children}
    </header>
  );
}

export function Block({ label, children, className }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("px-5 pt-8", className)}>
      {label && <h2 className="mb-3 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-cloud/60">{label}</h2>}
      {children}
    </section>
  );
}

/** Pastille de filtre / préférence (bouton à bascule, ≥ 44 px). */
export function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[0.8rem] transition active:scale-95",
        on ? "border-sky bg-sky text-jet" : "border-line bg-surface-1 text-cloud")}>
      {on && <Check size={14} strokeWidth={2.5} aria-hidden />}{children}
    </button>
  );
}

/** Interrupteur accessible (réglages). */
export function Switch({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 border-b border-line py-3">
      <span><span className="block text-[0.95rem]">{label}</span>{hint && <span className="mt-0.5 block text-[0.78rem] text-dim">{hint}</span>}</span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className={cn("relative h-7 w-12 shrink-0 rounded-full border transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky", on ? "border-sky bg-sky" : "border-silver/40 bg-surface-2")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full transition-all", on ? "left-[1.4rem] bg-jet" : "left-0.5 bg-silver")} />
      </span>
    </label>
  );
}

export const Empty = ({ title, text }: { title: string; text: string }) => (
  <div role="status" className="border border-dashed border-cloud/20 px-5 py-8 text-center">
    <p className="font-display text-[1.05rem]">{title}</p>
    <p className="mx-auto mt-2 max-w-[30ch] text-[0.85rem] text-dim">{text}</p>
  </div>
);
