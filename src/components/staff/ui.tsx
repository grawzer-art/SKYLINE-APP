import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { STAFF_DEMO_NOTICE } from "@/data/staff";

/** En-tête d'écran STAFF : sur-titre, grand titre, mention démo. */
export function StaffTitle({ eyebrow, title, back, children }: { eyebrow: string; title: string; back?: { href: string; label: string }; children?: React.ReactNode }) {
  return (
    <header className="px-5 pt-8">
      {back && <Link href={back.href} className="-ml-1 mb-2 inline-flex min-h-11 items-center gap-2 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-cloud/80"><ArrowLeft size={16} strokeWidth={1.5} aria-hidden /> {back.label}</Link>}
      <p className="font-mono text-[0.75rem] uppercase tracking-[0.22em] text-sky">{eyebrow}</p>
      <h1 className="font-display mt-2 text-[clamp(2.1rem,10.5vw,3rem)] leading-[0.95]">{title}</h1>
      {children}
    </header>
  );
}
export const StaffSection = ({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) => (
  <section className={`px-5 pt-10 ${className}`}>{title && <h2 className="mb-3 font-mono text-[0.75rem] uppercase tracking-[0.22em] text-cloud/72">{title}</h2>}{children}</section>
);
export const DemoLine = () => <p className="px-5 pb-6 pt-10 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-dim">{STAFF_DEMO_NOTICE}</p>;
export const Avatar = ({ name, size = 48 }: { name: string; size?: number }) => (
  <span aria-hidden style={{ width: size, height: size, fontSize: size * 0.38 }} className="inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#1b2028] to-[#0e1217] font-display ring-1 ring-silver/50">{name.trim().slice(0, 1).toUpperCase()}</span>
);
