"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { user } from "@/data/demo";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { ProfileSheet } from "@/components/layout/ProfileSheet";
import { Wordmark } from "@/components/ui/Wordmark";
import { useLocalStorage } from "@/lib/useLocalStorage";

/** Header compact (une seule ligne). Transparent sur la photo, vitré après défilement. */
export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(false);
  const [seen, setSeen] = useLocalStorage<boolean>("skyline.demo.notifications.seen.v1", false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  if (pathname.startsWith("/signal/") || pathname.startsWith("/v3")) return null; // l'expérience SIGNAL a son propre en-tête
  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-[480px] px-5 pt-[var(--safe-top)] transition-[background-color,backdrop-filter,border-color] duration-300",
          scrolled ? "border-b border-line bg-jet/85 backdrop-blur-xl" : "border-b border-transparent bg-gradient-to-b from-jet/60 to-transparent",
        )}
      >
        <div className="flex h-14 items-center justify-between">
          <Link href="/" aria-label="SKYLINE — accueil" className="flex min-h-11 items-center"><Wordmark /></Link>
          <div className="flex items-center gap-1">
            <button
              type="button" onClick={() => { setOpen(true); setSeen(true); }}
              aria-label={seen ? "Notifications" : "Notifications — 3 nouvelles"} aria-haspopup="dialog"
              className="relative grid size-11 place-items-center rounded-full transition active:scale-95"
            >
              <Bell size={21} strokeWidth={1.5} aria-hidden />
              {!seen && <span className="absolute right-[11px] top-[11px] size-2 rounded-full bg-sky ring-2 ring-jet" />}
            </button>
            <button type="button" onClick={() => setProfile(true)} aria-label="Mon profil" aria-haspopup="dialog" className="grid size-11 place-items-center rounded-full transition active:scale-95">
              <Avatar name={user.fullName} size={30} />
            </button>
          </div>
        </div>
      </header>

      <ProfileSheet open={profile} onClose={() => setProfile(false)} />
      <Sheet open={open} onClose={() => setOpen(false)} eyebrow="DÉMO" title="Notifications">
        <ul className="divide-y divide-line">
          {user.notifications.map((n) => (
            <li key={n.id} className="py-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">{n.title}</p>
                <span className="shrink-0 font-mono text-[0.68rem] text-dim">{n.time}</span>
              </div>
              <p className="mt-1 text-sm text-dim">{n.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-dim">Notifications fictives — aucune notification push réelle dans cette version.</p>
      </Sheet>
    </>
  );
}
