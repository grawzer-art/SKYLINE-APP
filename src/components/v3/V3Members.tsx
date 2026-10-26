"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ScreenTitle, Block, Toggle, Initials, Empty } from "./ui";
import { Button } from "@/components/ui/Button";
import { cities, genres, members } from "@/data/v3";
import { useProto } from "@/lib/useProto";

/** MEMBERS : annuaire des profils VISIBLES uniquement. Réciprocité : il faut être visible soi-même pour découvrir les autres. */
export function V3Members() {
  const { state, update } = useProto();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const list = useMemo(() => members.filter((m) => m.visible && !state.blocked.includes(m.id)
    && (!city || m.city === city)
    && (picked.length === 0 || picked.some((g) => m.genres.includes(g)))
    && (!q.trim() || `${m.pseudo} ${m.city}`.toLowerCase().includes(q.trim().toLowerCase()))), [q, city, picked, state.blocked]);

  if (!state.me.visible) {
    return (
      <>
        <ScreenTitle eyebrow="Club" title="Members" back={{ href: "/v3/club", label: "Club" }} />
        <Block>
          <div role="status" className="border border-silver/40 p-5">
            <p className="font-display text-[1.1rem]">Réciprocité</p>
            <p className="mt-2 text-[0.9rem] leading-relaxed text-cloud/80">Pour découvrir les membres, votre profil doit lui-même être visible. Vous pouvez le masquer à tout moment.</p>
            <Button onClick={() => update((s) => ({ ...s, me: { ...s.me, visible: true } }))} className="mt-5 w-full">Rendre mon profil visible</Button>
            <Link href="/v3/club/space" className="mt-3 inline-flex min-h-11 items-center font-mono text-[0.64rem] uppercase tracking-[0.18em] text-sky">Modifier mon profil →</Link>
          </div>
        </Block>
      </>
    );
  }

  return (
    <>
      <ScreenTitle eyebrow="Club" title="Members" back={{ href: "/v3/club", label: "Club" }} />
      <Block>
        <div className="relative">
          <label htmlFor="q" className="sr-only">Rechercher un pseudo ou une ville</label>
          <Search size={18} strokeWidth={1.5} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-silver" />
          <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pseudo ou ville" className="min-h-12 w-full border border-line bg-surface-1 pl-11 pr-4 text-[1rem] outline-none focus:border-sky" />
        </div>
        <div className="mt-3">
          <label htmlFor="cityf" className="sr-only">Filtrer par ville</label>
          <select id="cityf" value={city} onChange={(e) => setCity(e.target.value)} className="min-h-12 w-full border border-line bg-surface-1 px-4 text-[0.95rem] outline-none focus:border-sky">
            <option value="">Toutes les villes</option>{cities.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div role="group" aria-label="Affinités musicales" className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          {genres.map((g) => <Toggle key={g} on={picked.includes(g)} onClick={() => setPicked((p) => p.includes(g) ? p.filter((x) => x !== g) : [...p, g])}>{g}</Toggle>)}
        </div>
        <p role="status" aria-live="polite" className="mt-4 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-dim">{list.length} membre{list.length > 1 ? "s" : ""} visible{list.length > 1 ? "s" : ""}</p>
      </Block>
      <Block className="pt-2">
        {list.length === 0 ? <Empty title="Aucun résultat" text="Essayez une autre ville ou d'autres affinités." /> : (
          <ul className="divide-y divide-line border-y border-line">
            {list.map((m) => {
              const st = state.outgoing[m.id];
              return (
                <li key={m.id}>
                  <Link href={`/v3/club/members/${m.id}`} className="flex min-h-[4.5rem] items-center gap-4 py-3">
                    <Initials name={m.pseudo} size={44} />
                    <span className="min-w-0 flex-1"><span className="block text-[0.98rem]">{m.pseudo}</span><span className="block font-mono text-[0.58rem] uppercase tracking-[0.14em] text-dim">{m.city} · {m.genres.join(" · ")}</span></span>
                    {st && <span className="border border-cloud/25 px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-cloud/65">{st === "accepted" ? "Contact" : "En attente"}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Block>
      <p className="px-5 pb-8 pt-4 text-[0.72rem] text-dim">Seuls les profils ayant accepté d&apos;être visibles apparaissent. Aucune liste publique, aucun classement.</p>
    </>
  );
}
