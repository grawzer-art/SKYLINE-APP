import type { Metadata } from "next";
import Link from "next/link";
import { sitemap, type ScreenNode } from "@/data/v3";

export const metadata: Metadata = { title: "SKYLINE V3 — Plan des écrans", robots: { index: false } };

function Node({ n, depth = 0 }: { n: ScreenNode; depth?: number }) {
  return (
    <li className={depth ? "border-l border-cloud/15 pl-4" : ""}>
      <Link href={n.href} className="group flex min-h-12 flex-col justify-center py-1.5">
        <span className={depth === 0 ? "font-display text-[1.05rem]" : "text-[0.95rem]"}>{n.label}<span aria-hidden className="ml-2 text-silver transition group-hover:translate-x-1">→</span></span>
        {n.note && <span className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-dim">{n.note}</span>}
      </Link>
      {n.children && <ul className="ml-2">{n.children.map((c) => <Node key={c.href} n={c} depth={depth + 1} />)}</ul>}
    </li>
  );
}

export default function Page() {
  return (
    <div className="px-5 pb-16 pt-10">
      <Link href="/v3" className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-sky">← Ouvrir le prototype</Link>
      <p className="mt-6 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-sunset">Prototype V3 · conception</p>
      <h1 className="font-display mt-2 text-[clamp(1.7rem,8.4vw,2.5rem)]">Plan des écrans</h1>
      <p className="mt-3 text-[0.9rem] leading-relaxed text-cloud/75">Chaque ligne est cliquable. Quatre onglets, le profil via l&apos;avatar, et un environnement SKYLINE HQ séparé. Données fictives, aucun envoi réel.</p>
      <ul className="mt-8 divide-y divide-line border-y border-line">{sitemap.map((n) => <Node key={n.href} n={n} />)}</ul>
      <p className="mt-6"><Link href="/v3/wireframes" className="font-mono text-[0.64rem] uppercase tracking-[0.18em] text-sky">Voir les wireframes →</Link></p>
    </div>
  );
}
