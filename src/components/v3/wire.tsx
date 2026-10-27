import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Mini-bibliothèque de wireframes basse fidélité : boîtes, lignes, repères numérotés. Volontairement neutre (non « design »). */
export const Mark = ({ n }: { n: number }) => (
  <span aria-hidden className="absolute -left-2 -top-2 z-10 grid size-5 place-items-center rounded-full bg-sunset font-mono text-[0.7rem] font-semibold text-jet">{n}</span>
);

export function Box({ label, h = 40, n, dark, dashed, className, children }: { label?: string; h?: number; n?: number; dark?: boolean; dashed?: boolean; className?: string; children?: ReactNode }) {
  return (
    <div style={{ minHeight: h }} className={cn("relative flex items-center justify-center border text-center font-mono text-[0.7rem] uppercase leading-tight tracking-[0.1em]",
      dark ? "border-cloud/30 bg-cloud/15 text-cloud/80" : "border-cloud/25 bg-cloud/[0.04] text-cloud/68", dashed && "border-dashed", className)}>
      {n && <Mark n={n} />}{children ?? label}
    </div>
  );
}
export const Line = ({ w = "100%" }: { w?: string }) => <div style={{ width: w }} className="h-1.5 bg-cloud/25" />;
export const Lines = ({ n = 3 }: { n?: number }) => <div className="space-y-1.5">{Array.from({ length: n }).map((_, i) => <Line key={i} w={i === n - 1 ? "60%" : "100%"} />)}</div>;
export const Chip = ({ children, on }: { children: ReactNode; on?: boolean }) => <span className={cn("inline-block border px-2 py-1 font-mono text-[0.7rem] uppercase tracking-[0.1em]", on ? "border-sky bg-sky/25 text-sky" : "border-cloud/25 text-cloud/68")}>{children}</span>;
export const Row = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cn("flex items-center gap-2", className)}>{children}</div>;
export const Avatar = ({ n }: { n?: number }) => <div className="relative size-8 shrink-0 rounded-full border border-cloud/30 bg-cloud/10">{n && <Mark n={n} />}</div>;

export function Tabs({ active }: { active: 0 | 1 | 2 | 3 }) {
  return (
    <div className="mt-auto grid grid-cols-4 border-t border-cloud/25 pt-2 font-mono text-[0.7rem] uppercase tracking-[0.1em]">
      {["Home", "My Flight", "Explore", "Club"].map((t, i) => <div key={t} className={cn("py-1 text-center", i === active ? "border-t border-sky text-sky" : "text-cloud/62")}>{t}</div>)}
    </div>
  );
}
export const Top = () => (
  <div className="mb-3 flex items-center justify-between">
    <div className="border border-dashed border-cloud/35 px-2 py-1 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-cloud/72">Wordmark officiel</div>
    <div className="flex items-center gap-2"><Chip>Phase</Chip><div className="size-6 rounded-full border border-cloud/30" /></div>
  </div>
);

/** Cadre téléphone + légende (objectif, interactions, états). */
export function Phone({ id, title, route, children, notes }: { id: string; title: string; route: string; children: ReactNode; notes: string[] }) {
  return (
    <figure id={id} className="mx-auto w-full max-w-[340px] scroll-mt-6">
      <figcaption className="mb-3"><p className="font-display text-[1rem]">{title}</p><p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-sky">{route}</p></figcaption>
      <div className="flex h-[600px] flex-col overflow-hidden rounded-[24px] border-2 border-cloud/35 bg-jet p-3.5">{children}</div>
      <ol className="mt-3 space-y-1.5 text-[0.78rem] leading-snug text-cloud/80">
        {notes.map((t, i) => <li key={i} className="flex gap-2"><span aria-hidden className="grid size-4 shrink-0 place-items-center rounded-full bg-sunset font-mono text-[0.7rem] font-semibold text-jet">{i + 1}</span><span>{t}</span></li>)}
      </ol>
    </figure>
  );
}
