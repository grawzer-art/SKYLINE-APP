"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ScreenTitle, Block, Toggle, Initials, Empty } from "./ui";
import { CommunityGate } from "./community";
import { Button } from "@/components/ui/Button";
import { cities, genres, members } from "@/data/v3";
import { LIMITS, commonGenres, searchDirectory } from "@/domain/community";
import { useCommunity } from "@/lib/useCommunity";

/** MEMBERS : annuaire des profils VISIBLES. Réciprocité, ordre alphabétique (aucun classement), pagination. */
export function V3Members() {
  const c = useCommunity();
  const { t, state } = c;
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [shown, setShown] = useState<number>(LIMITS.pageSize);

  const list = useMemo(() => searchDirectory(members, { text: q, city, genres: picked, blocked: state.blocked }), [q, city, picked, state.blocked]);
  const reset = () => setShown(LIMITS.pageSize);
  const gate = { eyebrow: t("members.eyebrow"), title: t("members.title"), back: { href: "/v3/club", label: t("common.club") } };

  return (
    <CommunityGate {...gate}>
      {!state.me.visible ? (
        <>
          <ScreenTitle {...gate} />
          <Block>
            <div role="status" className="border border-silver/40 p-5">
              <p className="font-display text-[1.1rem]">{t("members.reciprocity.title")}</p>
              <p className="mt-2 text-[0.9rem] leading-relaxed text-cloud/80">{t("members.reciprocity.text")}</p>
              <Button onClick={() => c.setVisible(true)} className="mt-5 w-full">{t("members.reciprocity.cta")}</Button>
              <Link href="/v3/club/space" className="mt-3 inline-flex min-h-11 items-center font-mono text-[0.64rem] uppercase tracking-[0.18em] text-sky">{t("members.reciprocity.edit")} →</Link>
            </div>
          </Block>
        </>
      ) : (
        <>
          <ScreenTitle {...gate} />
          <Block>
            <div className="relative">
              <label htmlFor="q" className="sr-only">{t("members.search.label")}</label>
              <Search size={18} strokeWidth={1.5} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-silver" />
              <input id="q" type="search" value={q} onChange={(e) => { setQ(e.target.value); reset(); }} placeholder={t("members.search")} className="min-h-12 w-full border border-line bg-surface-1 pl-11 pr-4 text-[1rem] outline-none focus:border-sky" />
            </div>
            <div className="mt-3">
              <label htmlFor="cityf" className="sr-only">{t("members.city.label")}</label>
              <select id="cityf" value={city} onChange={(e) => { setCity(e.target.value); reset(); }} className="min-h-12 w-full border border-line bg-surface-1 px-4 text-[0.95rem] outline-none focus:border-sky">
                <option value="">{t("members.city.all")}</option>{cities.map((x) => <option key={x}>{x}</option>)}
              </select>
            </div>
            <div role="group" aria-label={t("members.genres.label")} className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
              {genres.map((g) => <Toggle key={g} on={picked.includes(g)} onClick={() => { setPicked((p) => p.includes(g) ? p.filter((x) => x !== g) : [...p, g]); reset(); }}>{g}</Toggle>)}
            </div>
            <p role="status" aria-live="polite" className="mt-4 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-dim">{t("members.count", { count: list.length })}</p>
            <p className="mt-1 text-[0.72rem] text-dim">{t("members.order")} · {t("members.quota", { n: c.quotaLeft, max: LIMITS.requestsPerDay })}</p>
          </Block>
          <Block className="pt-2">
            {list.length === 0 ? <Empty title={t("members.empty.title")} text={t("members.empty.text")} /> : (
              <>
                <ul className="divide-y divide-line border-y border-line">
                  {list.slice(0, shown).map((m) => {
                    const st = state.outgoing[m.id]?.state; const inCommon = commonGenres(m.genres, state.me.genres);
                    return (
                      <li key={m.id}>
                        <Link href={`/v3/club/members/${m.id}`} className="flex min-h-[4.5rem] items-center gap-4 py-3">
                          <Initials name={m.pseudo} size={44} />
                          <span className="min-w-0 flex-1"><span className="block text-[0.98rem]">{m.pseudo}</span><span className="block font-mono text-[0.58rem] uppercase tracking-[0.14em] text-dim">{m.city} · {m.genres.join(" · ")}</span>{inCommon.length > 0 && <span className="block font-mono text-[0.54rem] uppercase tracking-[0.14em] text-sky">{t("member.common", { list: inCommon.join(", ") })}</span>}</span>
                          {st && <span className="border border-cloud/25 px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-cloud/65">{st === "accepted" ? t("common.contact") : t("common.pending")}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                {shown < list.length && <Button variant="ghost" onClick={() => setShown((n) => n + LIMITS.pageSize)} className="mt-4 w-full">{t("common.more")}</Button>}
              </>
            )}
          </Block>
          <p className="px-5 pb-6 pt-4 text-[0.72rem] text-dim">{t("members.footer")}</p>
        </>
      )}
    </CommunityGate>
  );
}
