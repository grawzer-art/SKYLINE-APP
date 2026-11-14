"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, MapPin, Pencil } from "lucide-react";
import { Backdrop, Face, Vibe } from "@/components/v3/visual";
import { Switch, Toggle } from "@/components/v3/ui";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { cities, genres } from "@/data/v3";
import { images } from "@/data/demo";
import { LIMITS } from "@/domain/community";
import { AVATAR, validateClubInput, type ClubErrors } from "@/domain/club";
import { useClubProfile } from "@/lib/club/useClubProfile";
import { authActive, useParticipantIdentity } from "@/lib/participant/useParticipantIdentity";
import { useProto } from "@/lib/useProto";
import { cn } from "@/lib/cn";
import { activeLocale } from "@/i18n";

const L = {
  fr: { back: "Club", title: "My Space", loading: "Chargement de votre profil CLUB…", signin: "Connectez-vous pour gérer votre profil CLUB.", signinCta: "Se connecter",
    unavailable: "Le profil CLUB n'est pas encore disponible. Réessayez plus tard.", retry: "Réessayer",
    none: "Vous n'avez pas encore de profil CLUB", noneText: "Créez un profil communautaire : un pseudo, une ville, quelques goûts. Il reste privé tant que vous ne le publiez pas.", create: "Créer mon profil CLUB",
    edit: "Modifier", private: "Profil privé", public: "Profil publié", privText: "Personne d'autre ne peut voir ce profil.", pubText: "Les autres membres publiés peuvent voir votre pseudo, ville, bio, goûts et photo.",
    publish: "Publier mon profil", visLabel: "Visible par les membres", noBio: "Ajoutez une courte bio.", noCity: "Ville non renseignée", vibes: "Goûts musicaux", noVibes: "Aucun goût renseigné.",
    travelerOnly: "La publication de votre profil et l'annuaire s'ouvrent avec une réservation vérifiée par l'équipe. Votre profil reste privé en attendant.", publicList: "Ce que les autres voient : pseudo, photo, ville, bio, goûts. Jamais votre e-mail, votre nom ni votre réservation.",
    editTitle: "Mon profil CLUB", pseudo: "Pseudo", pseudoHint: "2 à 24 caractères, visible par les membres.", city: "Ville", noCityOpt: "Non renseignée", bio: "Bio courte", bioPh: "Une phrase sur vous", genres: "Goûts musicaux",
    photo: "Photo de profil", addPhoto: "Ajouter une photo", changePhoto: "Changer la photo", removePhoto: "Retirer", photoHint: `Recadrée et compressée automatiquement (${AVATAR.maxPixels} px max). Stockage privé.`,
    save: "Enregistrer", saving: "Enregistrement…", saved: "Profil enregistré.", cancel: "Annuler" },
  en: { back: "Club", title: "My Space", loading: "Loading your CLUB profile…", signin: "Sign in to manage your CLUB profile.", signinCta: "Sign in",
    unavailable: "The CLUB profile isn't available yet. Please try again later.", retry: "Retry",
    none: "You don't have a CLUB profile yet", noneText: "Create a community profile: a nickname, a city, a few tastes. It stays private until you publish it.", create: "Create my CLUB profile",
    edit: "Edit", private: "Private profile", public: "Published profile", privText: "Nobody else can see this profile.", pubText: "Other published members can see your nickname, city, bio, tastes and photo.",
    publish: "Publish my profile", visLabel: "Visible to members", noBio: "Add a short bio.", noCity: "City not set", vibes: "Music tastes", noVibes: "No tastes set.",
    travelerOnly: "Publishing your profile and the directory open with a booking verified by the team. Your profile stays private until then.", publicList: "What others see: nickname, photo, city, bio, tastes. Never your email, your name or your booking.",
    editTitle: "My CLUB profile", pseudo: "Nickname", pseudoHint: "2 to 24 characters, visible to members.", city: "City", noCityOpt: "Not set", bio: "Short bio", bioPh: "One sentence about you", genres: "Music tastes",
    photo: "Profile photo", addPhoto: "Add a photo", changePhoto: "Change photo", removePhoto: "Remove", photoHint: `Cropped and compressed automatically (${AVATAR.maxPixels} px max). Private storage.`,
    save: "Save", saving: "Saving…", saved: "Profile saved.", cancel: "Cancel" },
} as const;

/** MY SPACE en mode RÉEL : le profil CLUB de la personne connectée (Supabase), distinct de son identité privée. Aucun profil fictif. */
export function ClubSpaceReal() {
  const { state } = useProto(); const l = L[activeLocale(state.locale) === "en" ? "en" : "fr"];
  const identity = useParticipantIdentity(); const owner = identity.status === "ready" ? identity.email : null;
  const club = useClubProfile(owner);
  const [editing, setEditing] = useState(false);
  const p = club.profile;

  const head = (
    <div className="absolute inset-x-5 top-[calc(var(--safe-top)+4.5rem)] flex items-center justify-between">
      <Link href="/v3/club" className="-ml-1 inline-flex min-h-11 items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-cloud/80"><ArrowLeft size={16} strokeWidth={1.5} aria-hidden />{l.back}</Link>
      {p && <button type="button" onClick={() => setEditing(true)} aria-haspopup="dialog" data-testid="club-edit" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cloud/35 bg-jet/40 px-4 font-mono text-[0.72rem] uppercase tracking-[0.16em]"><Pencil size={14} strokeWidth={1.5} aria-hidden />{l.edit}</button>}
    </div>
  );
  const shell = (children: React.ReactNode) => (
    <section aria-labelledby="space-title" className="relative isolate px-5 pb-8 pt-[calc(var(--safe-top)+5.75rem)] text-center"><Backdrop src={images.before} position="30% 80%" strength="deep" />{head}{children}</section>
  );

  if (identity.status === "loading" || club.status === "loading" || club.status === "idle" && identity.status === "ready")
    return shell(<p role="status" data-testid="club-loading" className="mt-16 text-[0.95rem] text-cloud/75">{l.loading}</p>);
  if (identity.status !== "ready") return shell(<div className="mt-14"><h1 id="space-title" className="font-display text-[1.6rem]">{l.title}</h1><p className="mt-3 text-cloud/80">{l.signin}</p><Link href="/v3/login?next=/v3/club/space" className="mt-5 inline-flex min-h-12 items-center rounded-full bg-cloud px-6 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-jet">{l.signinCta}</Link></div>);
  if (club.status === "unavailable" || club.status === "error")
    return shell(<div role="alert" className="mt-14"><h1 id="space-title" className="font-display text-[1.6rem]">{l.title}</h1><p className="mt-3 text-cloud/80">{club.status === "unavailable" ? l.unavailable : club.message}</p><Button variant="ghost" onClick={club.reload} className="mt-5">{l.retry}</Button></div>);

  if (!p) return (
    <>
      {shell(<div className="mt-14" data-testid="club-empty"><h1 id="space-title" className="font-display text-[clamp(1.6rem,8vw,2.2rem)] leading-tight">{l.none}</h1><p className="mx-auto mt-3 max-w-[32ch] text-[0.95rem] text-cloud/80">{l.noneText}</p><Button onClick={() => setEditing(true)} className="mt-6" data-testid="club-create">{l.create}</Button></div>)}
      <ClubEditSheet open={editing} onClose={() => setEditing(false)} club={club} l={l} />
    </>
  );

  return (
    <>
      {shell(
        <>
          <div className="relative mx-auto mt-12 w-fit"><Face name={p.pseudo} size={132} tone="sky" src={club.avatarUrl} className="shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)]" /></div>
          <h1 id="space-title" data-testid="club-pseudo" className="font-display mt-5 text-[clamp(1.9rem,10vw,2.8rem)] leading-none">{p.pseudo}</h1>
          <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-cloud/80"><MapPin size={13} strokeWidth={1.5} aria-hidden />{p.city ?? l.noCity}</p>
          <div className="mx-auto mt-5 max-w-[30ch]">{p.bio ? <p data-testid="club-bio" className="text-[1.02rem] italic leading-snug text-cloud/90">« {p.bio} »</p> : <button type="button" onClick={() => setEditing(true)} className="min-h-11 text-[0.92rem] italic text-cloud/72 underline-offset-4 hover:underline">{l.noBio}</button>}</div>
        </>,
      )}
      <section aria-labelledby="vibes-title" className="px-5 pt-2">
        <h2 id="vibes-title" className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-cloud/68">{l.vibes}</h2>
        {p.genres.length === 0 ? <p className="mt-3 text-[0.86rem] text-cloud/72">{l.noVibes}</p> : <ul className="mt-3 flex flex-wrap gap-2">{p.genres.map((g) => <li key={g}><Vibe>{g}</Vibe></li>)}</ul>}
      </section>
      <section aria-labelledby="vis-title" className="px-5 pt-9">
        <h2 id="vis-title" className="sr-only">{l.visLabel}</h2>
        <div className={cn("rounded-[6px] border p-4", p.visible ? "border-sky/50" : "border-cloud/15")} data-testid="club-visibility" data-visible={p.visible}>
          {identity.traveler === "none" && !p.visible ? <div data-testid="club-traveler-only"><p className="text-[0.95rem]">{l.private}</p><p className="mt-1 text-[0.78rem] text-dim">{l.travelerOnly}</p></div> : <Switch on={p.visible} onChange={(v) => void club.setVisible(v)} label={p.visible ? l.public : l.private} hint={p.visible ? l.pubText : l.privText} />}
          <p className="mt-3 text-[0.78rem] text-dim">{l.publicList}</p>
        </div>
      </section>
      <ClubEditSheet open={editing} onClose={() => setEditing(false)} club={club} l={l} />
    </>
  );
}

type Copy = (typeof L)["fr"] | (typeof L)["en"];
function ClubEditSheet({ open, onClose, club, l }: { open: boolean; onClose: () => void; club: ReturnType<typeof useClubProfile>; l: Copy }) {
  return <Sheet open={open} onClose={onClose} eyebrow="CLUB" title={l.editTitle}><ClubForm onClose={onClose} club={club} l={l} /></Sheet>;
}
/** Monté à l'ouverture de la feuille : l'état initial vient du profil courant (aucun effet de resynchronisation). */
function ClubForm({ onClose, club, l }: { onClose: () => void; club: ReturnType<typeof useClubProfile>; l: Copy }) {
  const p = club.profile; const fileRef = useRef<HTMLInputElement>(null);
  const [v, setV] = useState({ pseudo: p?.pseudo ?? "", city: p?.city ?? "", bio: p?.bio ?? "", genres: p?.genres ?? [] as string[] }); const [errs, setErrs] = useState<ClubErrors>({}); const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const submit = async () => {
    const chk = validateClubInput({ pseudo: v.pseudo, city: v.city || null, bio: v.bio, genres: v.genres }); if (!chk.ok) { setErrs(chk.errors); setMsg(null); return; }
    setErrs({}); const r = await club.save(chk.value);
    if (r.ok) { setMsg({ kind: "ok", text: l.saved }); onClose(); } else { setErrs(r.fields ?? {}); setMsg({ kind: "err", text: r.message }); }
  };
  const field = "mt-2 min-h-12 w-full rounded-[8px] border border-line bg-surface-2 px-4 text-[1rem] outline-none focus:border-sky";
  const lab = "font-mono text-[0.72rem] uppercase tracking-[0.18em] text-cloud/72";
  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate data-testid="club-form">
        {p && (
          <div className="flex items-center gap-4 pb-2">
            <Face name={p.pseudo} size={72} tone="silver" src={club.avatarUrl} />
            <div className="min-w-0">
              <input ref={fileRef} type="file" accept={AVATAR.inputTypes.join(",")} className="sr-only" tabIndex={-1} aria-hidden data-testid="club-file"
                onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; const r = await club.setPhoto(f); setMsg(r.ok ? null : { kind: "err", text: r.message }); }} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()} disabled={club.busy} className="min-h-11 px-4 text-[0.72rem]">{p.avatarPath ? l.changePhoto : l.addPhoto}</Button>
                {p.avatarPath && <button type="button" onClick={() => void club.removePhoto()} disabled={club.busy} className="min-h-11 px-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-dim hover:text-cloud">{l.removePhoto}</button>}
              </div>
              <p className="mt-1.5 text-[0.74rem] text-dim">{l.photoHint}</p>
            </div>
          </div>
        )}
        <div className="mt-5 space-y-5">
          <div><label htmlFor="club-pseudo" className={lab}>{l.pseudo}</label>
            <input id="club-pseudo" name="pseudo" value={v.pseudo} autoComplete="nickname" autoCapitalize="none" enterKeyHint="next" maxLength={LIMITS.pseudoMax + 6} onChange={(e) => setV({ ...v, pseudo: e.target.value })} aria-invalid={!!errs.pseudo} aria-describedby="club-pseudo-h" className={field} />
            <p id="club-pseudo-h" role={errs.pseudo ? "alert" : undefined} className={cn("mt-1.5 text-[0.74rem]", errs.pseudo ? "text-sunset" : "text-dim")}>{errs.pseudo ?? l.pseudoHint}</p></div>
          <div><label htmlFor="club-city" className={lab}>{l.city}</label>
            <select id="club-city" name="city" value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} className={field}><option value="">{l.noCityOpt}</option>{cities.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
          <div><label htmlFor="club-bio" className={lab}>{l.bio}</label>
            <textarea id="club-bio" name="bio" value={v.bio} maxLength={LIMITS.bioMax} rows={3} placeholder={l.bioPh} enterKeyHint="done" onChange={(e) => setV({ ...v, bio: e.target.value })} className="mt-2 w-full resize-none rounded-[8px] border border-line bg-surface-2 px-4 py-3 text-[1rem] outline-none focus:border-sky" />
            <p className="mt-1.5 text-right font-mono text-[0.72rem] tabular-nums text-dim">{v.bio.length}/{LIMITS.bioMax}</p>{errs.bio && <p role="alert" className="text-[0.74rem] text-sunset">{errs.bio}</p>}</div>
          <div><p className={lab}>{l.genres} · {v.genres.length}/{LIMITS.genresMax}</p>
            <div role="group" aria-label={l.genres} className="mt-3 flex flex-wrap gap-2">{genres.map((g) => <Toggle key={g} on={v.genres.includes(g)} onClick={() => setV((x) => { const has = x.genres.includes(g); return has ? { ...x, genres: x.genres.filter((y) => y !== g) } : x.genres.length >= LIMITS.genresMax ? x : { ...x, genres: [...x.genres, g] }; })}>{g}</Toggle>)}</div>
            {errs.genres && <p role="alert" className="mt-1 text-[0.74rem] text-sunset">{errs.genres}</p>}</div>
        </div>
        {msg?.kind === "err" && <p role="alert" data-testid="club-error" className="mt-5 rounded-[8px] border border-sunset/60 px-3 py-2.5 text-[0.9rem] text-sunset">{msg.text}</p>}
        {/* Barre d'action collante : toujours visible au-dessus du clavier, jamais sous la navigation (la feuille est au-dessus d'elle). */}
        <div className="sticky bottom-0 -mx-5 mt-6 flex gap-3 border-t border-line bg-surface-1/95 px-5 pb-1 pt-3 backdrop-blur">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">{l.cancel}</Button>
          <Button type="submit" disabled={club.busy} data-testid="club-save" className="flex-[2]">{club.busy ? l.saving : l.save}</Button>
        </div>
      </form>
    </>
  );
}
