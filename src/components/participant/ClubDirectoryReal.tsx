"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Block, Empty, ScreenTitle } from "@/components/v3/ui";
import { Face } from "@/components/v3/visual";
import { Button } from "@/components/ui/Button";
import { cities } from "@/data/v3";
import { LIMITS } from "@/domain/community";
import type { ClubMember } from "@/domain/club";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { getClubMember, listClubDirectory, loadMyClubProfile, setMyClubVisibility, signedAvatarUrls } from "@/lib/club/clubService";
import { useParticipantIdentity } from "@/lib/participant/useParticipantIdentity";

type Load = ({ status: "traveler" } | { status: "closed" } | { status: "nopro" } | { status: "error"; message: string } | { status: "ready"; members: ClubMember[]; urls: Record<string, string> }) & { key: string };

/** MEMBERS en mode RÉEL : uniquement les profils CLUB publiés par leurs propriétaires. Fermé tant que SON profil n'est pas publié (réciprocité). */
export function ClubDirectoryReal() {
  const identity = useParticipantIdentity(); const owner = identity.status === "ready" ? identity.email : null; const traveler = identity.status === "ready" ? identity.traveler : undefined;
  const [raw, setS] = useState<Load | null>(null); const [q, setQ] = useState(""); const [city, setCity] = useState(""); const [shown, setShown] = useState<number>(LIMITS.pageSize);
  const seq = useRef(0); const [busy, setBusy] = useState(false);
  const key = `${owner}|${q}|${city}`; const s: Load | { status: "loading" } = raw && raw.key === key ? raw : { status: "loading" };   // un résultat ne s'applique qu'à SA requête et SON compte
  const load = useCallback(async (text: string, c: string) => {
    if (!owner) return; const my = ++seq.current; const key = `${owner}|${text}|${c}`; const cl = createBrowserSupabase();
    if (traveler === "none") { setS({ key, status: "traveler" }); return; }
    const mine = await loadMyClubProfile(cl); if (my !== seq.current) return;
    if (!mine.ok) { setS({ key, status: "error", message: mine.message }); return; }
    if (!mine.profile) { setS({ key, status: "nopro" }); return; }
    if (!mine.profile.visible) { setS({ key, status: "closed" }); return; }
    const r = await listClubDirectory(cl, { text, city: c, limit: 50 }); if (my !== seq.current) return;
    if (!r.ok) { setS(r.kind === "traveler" ? { key, status: "traveler" } : r.kind === "reciprocity" ? { key, status: "closed" } : { key, status: "error", message: r.message }); return; }
    const urls = await signedAvatarUrls(cl, r.members.map((m) => m.avatarPath ?? "")); if (my !== seq.current) return;
    setS({ key, status: "ready", members: r.members, urls });
  }, [owner, traveler]);
  useEffect(() => { const h = setTimeout(() => void load(q, city), q ? 250 : 0); return () => clearTimeout(h); }, [load, q, city]);
  const gate = { eyebrow: "MEMBERS", title: "Members", back: { href: "/v3/club", label: "Club" } };

  if (identity.status !== "ready" && identity.status !== "loading") return <><ScreenTitle {...gate} /><Block><p role="status" className="text-cloud/80">Connectez-vous pour consulter les membres.</p></Block></>;
  return (
    <>
      <ScreenTitle {...gate} />
      {s.status === "loading" && <Block><p role="status" className="text-[0.95rem] text-cloud/75" data-testid="dir-loading">Chargement…</p></Block>}
      {s.status === "error" && <Block><div role="alert" className="rounded-[8px] border border-sunset/60 p-4 text-[0.9rem]">{s.message}<Button variant="ghost" onClick={() => void load(q, city)} className="mt-3 w-full">Réessayer</Button></div></Block>}
      {s.status === "traveler" && <Block><div role="status" data-testid="dir-traveler" className="rounded-[8px] border border-silver/40 p-5"><p className="font-display text-[1.1rem]">Réservé aux voyageurs vérifiés</p><p className="mt-2 text-[0.9rem] leading-relaxed text-cloud/80">L&apos;annuaire s&apos;ouvre avec une réservation confirmée par l&apos;équipe SKYLINE. Votre compte membre gratuit vous donne déjà accès à votre profil.</p><Link href="/v3/club/space" className="mt-3 inline-flex min-h-11 items-center font-mono text-[0.72rem] uppercase tracking-[0.18em] text-sky">My Space →</Link></div></Block>}
      {(s.status === "closed" || s.status === "nopro") && (
        <Block><div role="status" data-testid="dir-closed" className="rounded-[8px] border border-silver/40 p-5">
          <p className="font-display text-[1.1rem]">{s.status === "nopro" ? "Créez d'abord votre profil CLUB" : "Réciprocité : publiez votre profil pour voir les autres"}</p>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-cloud/80">Seuls les membres qui ont choisi de publier leur profil CLUB apparaissent ici — et vous n&apos;apparaissez que si vous le publiez aussi.</p>
          {s.status === "closed" && <Button disabled={busy} onClick={async () => { setBusy(true); await setMyClubVisibility(createBrowserSupabase(), true); setBusy(false); void load(q, city); }} className="mt-5 w-full" data-testid="dir-publish">Publier mon profil</Button>}
          <Link href="/v3/club/space" className="mt-3 inline-flex min-h-11 items-center font-mono text-[0.72rem] uppercase tracking-[0.18em] text-sky">My Space →</Link>
        </div></Block>
      )}
      {s.status === "ready" && (
        <>
          <Block>
            <div className="relative"><label htmlFor="q" className="sr-only">Rechercher un pseudo</label><Search size={18} strokeWidth={1.5} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-silver" />
              <input id="q" type="search" value={q} onChange={(e) => { setQ(e.target.value); setShown(LIMITS.pageSize); }} placeholder="Rechercher un pseudo" enterKeyHint="search" className="min-h-12 w-full rounded-[8px] border border-line bg-surface-1 pl-11 pr-4 text-[1rem] outline-none focus:border-sky" /></div>
            <div className="mt-3"><label htmlFor="cityf" className="sr-only">Ville</label>
              <select id="cityf" value={city} onChange={(e) => { setCity(e.target.value); setShown(LIMITS.pageSize); }} className="min-h-12 w-full rounded-[8px] border border-line bg-surface-1 px-4 text-[1rem] outline-none focus:border-sky"><option value="">Toutes les villes</option>{cities.map((x) => <option key={x}>{x}</option>)}</select></div>
            <p role="status" aria-live="polite" className="mt-4 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-dim">{s.members.length} membre{s.members.length > 1 ? "s" : ""} · ordre alphabétique</p>
          </Block>
          <Block className="pt-2">
            {s.members.length === 0 ? <Empty title="Aucun membre à afficher" text="Aucun autre membre n'a publié son profil pour le moment." /> : (
              <><ul className="divide-y divide-line border-y border-line" data-testid="dir-list">
                {s.members.slice(0, shown).map((m) => (
                  <li key={m.id}><Link href={`/v3/club/members/${m.id}`} className="flex min-h-[4.5rem] items-center gap-4 py-3">
                    <Face name={m.pseudo} size={50} src={m.avatarPath ? s.urls[m.avatarPath] : null} />
                    <span className="min-w-0 flex-1"><span className="block text-[0.98rem]">{m.pseudo}</span><span className="block font-mono text-[0.7rem] uppercase tracking-[0.14em] text-dim">{[m.city, ...m.genres].filter(Boolean).join(" · ")}</span></span>
                  </Link></li>
                ))}
              </ul>{shown < s.members.length && <Button variant="ghost" onClick={() => setShown((n) => n + LIMITS.pageSize)} className="mt-4 w-full">Voir plus</Button>}</>
            )}
          </Block>
        </>
      )}
      <p className="px-5 pb-6 pt-4 text-[0.72rem] text-dim">Les profils affichés sont publiés volontairement par leurs propriétaires. Messagerie et demandes de contact : bientôt disponibles.</p>
    </>
  );
}

/** Fiche d'UN profil publié (champs publics seulement). */
export function ClubMemberReal({ id }: { id: string }) {
  const identity = useParticipantIdentity(); const owner = identity.status === "ready" ? identity.email : null;
  type MS = ({ status: "traveler" } | { status: "none" } | { status: "closed" } | { status: "error"; message: string } | { status: "ready"; m: ClubMember; url: string | null }) & { key: string };
  const [raw, setS] = useState<MS | null>(null); const key = `${owner}|${id}`; const s: MS | { status: "loading" } = raw && raw.key === key ? raw : { status: "loading" };
  useEffect(() => {
    if (!owner) return; let dead = false;
    (async () => { const cl = createBrowserSupabase(); const r = await getClubMember(cl, id); if (dead) return;
      if (!r.ok) { setS(r.kind === "traveler" ? { key, status: "traveler" } : r.kind === "reciprocity" ? { key, status: "closed" } : { key, status: "error", message: r.message }); return; }
      if (!r.member) { setS({ key, status: "none" }); return; }
      const u = r.member.avatarPath ? (await signedAvatarUrls(cl, [r.member.avatarPath]))[r.member.avatarPath] ?? null : null; if (!dead) setS({ key, status: "ready", m: r.member, url: u }); })();
    return () => { dead = true; };
  }, [id, owner, key]);
  const gate = { eyebrow: "MEMBER", title: s.status === "ready" ? s.m.pseudo : "Membre", back: { href: "/v3/club/members", label: "Members" } };
  return (
    <>
      <ScreenTitle {...gate} />
      <Block>
        {s.status === "loading" && <p role="status" className="text-cloud/75">Chargement…</p>}
        {s.status === "error" && <p role="alert" className="text-sunset">{s.message}</p>}
        {s.status === "traveler" && <p role="status" className="text-cloud/80">Réservé aux voyageurs dont la réservation est vérifiée.</p>}
        {s.status === "closed" && <p role="status" className="text-cloud/80">Publiez votre profil CLUB pour consulter les autres membres.</p>}
        {s.status === "none" && <Empty title="Profil introuvable" text="Ce profil n'existe pas ou n'est plus publié." />}
        {s.status === "ready" && (
          <div className="flex flex-col items-center text-center" data-testid="member-card">
            <Face name={s.m.pseudo} size={120} tone="sky" src={s.url} />
            <p className="font-display mt-4 text-[1.6rem]">{s.m.pseudo}</p>
            {s.m.city && <p className="mt-1 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-cloud/80">{s.m.city}</p>}
            {s.m.bio && <p className="mt-4 max-w-[30ch] italic text-cloud/90">« {s.m.bio} »</p>}
            {s.m.genres.length > 0 && <ul className="mt-5 flex flex-wrap justify-center gap-2">{s.m.genres.map((g) => <li key={g} className="rounded-full border border-cloud/30 px-3 py-1.5 font-mono text-[0.72rem] uppercase tracking-[0.12em]">{g}</li>)}</ul>}
            <p className="mt-8 text-[0.8rem] text-dim">Les demandes de contact et la messagerie arrivent bientôt.</p>
          </div>
        )}
      </Block>
    </>
  );
}
