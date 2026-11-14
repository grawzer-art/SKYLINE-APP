"use client";
import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { CLUB_CONSENT_VERSION } from "@/lib/club/clubService";

/**
 * CONFIRMATION EXPLICITE avant publication dans l'annuaire CLUB. Texte versionné (`CLUB_CONSENT_VERSION`) : la version affichée est celle envoyée au serveur,
 * qui refuse toute publication sans elle et en garde la trace (date, version). Le profil reste privé tant que cette confirmation n'est pas donnée.
 */
export const CONSENT_COPY = {
  fr: {
    eyebrow: "Annuaire CLUB", title: "Publier mon profil CLUB",
    body: "Les autres voyageurs vérifiés ayant publié leur profil pourront voir votre pseudo, votre photo, votre ville, votre bio et vos goûts musicaux. Jamais votre e-mail ni votre nom.",
    withdraw: "Vous pouvez retirer votre profil à tout moment.", trace: "Nous conservons la date et la version de ce consentement.",
    confirm: "Publier mon profil", cancel: "Annuler", busy: "Publication…",
  },
  en: {
    eyebrow: "CLUB directory", title: "Publish my CLUB profile",
    body: "Other verified travelers who have published their profile will be able to see your nickname, photo, city, bio and music tastes. Never your e-mail or your name.",
    withdraw: "You can withdraw your profile at any time.", trace: "We keep the date and version of this consent.",
    confirm: "Publish my profile", cancel: "Cancel", busy: "Publishing…",
  },
} as const;

export function ClubConsentSheet({ open, onClose, onConfirm, locale = "fr" }: { open: boolean; onClose: () => void; onConfirm: (version: string) => Promise<{ ok: true } | { ok: false; message: string }>; locale?: "fr" | "en" }) {
  const l = CONSENT_COPY[locale]; const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const close = () => { if (!busy) { setErr(null); onClose(); } };
  return (
    <Sheet open={open} onClose={close} eyebrow={l.eyebrow} title={l.title}>
      <div data-testid="club-consent" data-version={CLUB_CONSENT_VERSION}>
        <p className="leading-relaxed text-cloud/85">{l.body}</p>
        <p className="mt-3 text-[0.9rem] leading-relaxed text-cloud/75">{l.withdraw} {l.trace}</p>
        {err && <p role="alert" className="mt-4 text-[0.9rem] text-sunset" data-testid="club-consent-error">{err}</p>}
        <Button disabled={busy} onClick={async () => { setBusy(true); setErr(null); const r = await onConfirm(CLUB_CONSENT_VERSION); setBusy(false); if (r.ok) onClose(); else setErr(r.message); }} className="mt-6 w-full" data-testid="club-consent-confirm">{busy ? l.busy : l.confirm}</Button>
        <Button variant="ghost" disabled={busy} onClick={close} className="mt-2 w-full" data-testid="club-consent-cancel">{l.cancel}</Button>
      </div>
    </Sheet>
  );
}
