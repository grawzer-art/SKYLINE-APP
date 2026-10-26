"use client";
import { useState } from "react";
import { ScreenTitle, Block, Toggle, Switch, Initials } from "./ui";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { cities, genres } from "@/data/v3";
import { useProto } from "@/lib/useProto";

const MAX_GENRES = 5;

/** MY SPACE : profil de membre. Photo facultative, pseudo, ville CHOISIE (liste), description courte, préférences, visibilité (opt-in). */
export function V3Space() {
  const { state, update } = useProto();
  const [photoInfo, setPhotoInfo] = useState(false);
  const me = state.me;
  const set = (patch: Partial<typeof me>) => update((s) => ({ ...s, me: { ...s.me, ...patch } }));
  const pseudoOk = me.pseudo.trim().length >= 2;
  const toggleGenre = (g: string) => set({ genres: me.genres.includes(g) ? me.genres.filter((x) => x !== g) : me.genres.length < MAX_GENRES ? [...me.genres, g] : me.genres });

  return (
    <>
      <ScreenTitle eyebrow="Club" title="My Space" back={{ href: "/v3/club", label: "Club" }} />
      <Block>
        <div className="flex items-center gap-4">
          <Initials name={me.pseudo || "?"} size={72} />
          <div>
            <Button variant="ghost" onClick={() => setPhotoInfo(true)} aria-haspopup="dialog" className="min-h-11 px-4 text-[0.66rem]">Ajouter une photo</Button>
            <p className="mt-2 text-[0.75rem] text-dim">Facultatif. Sans photo, vos initiales s&apos;affichent.</p>
          </div>
        </div>
      </Block>
      <Block label="Profil">
        <div className="space-y-5">
          <div>
            <label htmlFor="pseudo" className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-cloud/60">Pseudo</label>
            <input id="pseudo" value={me.pseudo} maxLength={24} onChange={(e) => set({ pseudo: e.target.value })} aria-invalid={!pseudoOk} aria-describedby="pseudo-hint"
              className="mt-2 min-h-12 w-full border border-line bg-surface-1 px-4 text-[1rem] outline-none focus:border-sky" />
            <p id="pseudo-hint" className={pseudoOk ? "mt-1.5 text-[0.72rem] text-dim" : "mt-1.5 text-[0.72rem] text-sunset"}>{pseudoOk ? "2 à 24 caractères. Pas votre nom complet." : "Au moins 2 caractères."}</p>
          </div>
          <div>
            <label htmlFor="city" className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-cloud/60">Ville (choisie dans la liste)</label>
            <select id="city" value={me.city} onChange={(e) => set({ city: e.target.value })} className="mt-2 min-h-12 w-full border border-line bg-surface-1 px-4 text-[1rem] outline-none focus:border-sky">
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <p className="mt-1.5 text-[0.72rem] text-dim">Jamais de localisation précise ni d&apos;adresse.</p>
          </div>
          <div>
            <label htmlFor="bio" className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-cloud/60">Description courte</label>
            <textarea id="bio" value={me.bio} maxLength={140} rows={3} onChange={(e) => set({ bio: e.target.value })} className="mt-2 w-full resize-none border border-line bg-surface-1 px-4 py-3 text-[1rem] outline-none focus:border-sky" />
            <p className="mt-1.5 text-right font-mono text-[0.62rem] tabular-nums text-dim">{me.bio.length}/140</p>
          </div>
        </div>
      </Block>
      <Block label={`Préférences musicales · ${me.genres.length}/${MAX_GENRES}`}>
        <div className="flex flex-wrap gap-2">{genres.map((g) => <Toggle key={g} on={me.genres.includes(g)} onClick={() => toggleGenre(g)}>{g}</Toggle>)}</div>
      </Block>
      <Block label="Visibilité">
        <Switch on={me.visible} onChange={(v) => set({ visible: v })} label="Apparaître dans l'annuaire des membres" hint="Désactivé par défaut. Seuls les membres visibles peuvent voir les autres." />
        <p className="mt-3 text-[0.75rem] text-dim">Enregistré automatiquement sur cet appareil (prototype).</p>
      </Block>
      <Block label="Aperçu — ce que les autres voient">
        {me.visible ? (
          <div className="flex items-start gap-4 border border-line p-4"><Initials name={me.pseudo || "?"} size={48} /><div className="min-w-0"><p className="text-[1rem]">{me.pseudo || "—"}</p><p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-dim">{me.city} · {me.genres.join(" · ") || "—"}</p>{me.bio && <p className="mt-2 text-[0.85rem] text-cloud/80">{me.bio}</p>}</div></div>
        ) : <p role="status" className="border border-dashed border-cloud/20 p-4 text-[0.85rem] text-dim">Votre profil n&apos;est visible par personne.</p>}
      </Block>
      <div className="h-8" />
      <Sheet open={photoInfo} onClose={() => setPhotoInfo(false)} eyebrow="Prototype" title="Photo de profil">
        <p className="leading-relaxed text-cloud/80">Aucun fichier n&apos;est envoyé dans ce prototype. En développement : recadrage carré, contrôle automatique et modération avant affichage aux autres membres, suppression possible à tout moment.</p>
        <Button variant="ghost" onClick={() => setPhotoInfo(false)} className="mt-5 w-full">Compris</Button>
      </Sheet>
    </>
  );
}
