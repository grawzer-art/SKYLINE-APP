"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Plane } from "lucide-react";
import { event, user } from "@/data/demo";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { useLocalStorage } from "@/lib/useLocalStorage";

export function Logo() {
  return (
    <Link href="/" aria-label="SKYLINE — accueil" className="inline-flex items-center gap-2 py-2">
      <Plane size={18} strokeWidth={1.5} className="-rotate-45 text-sunset" aria-hidden />
      <span className="font-display text-[1.05rem] tracking-[0.12em]">SKYLINE</span>
    </Link>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useLocalStorage<boolean>("skyline.demo.notifications.seen.v1", false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-[480px] px-4 pb-2 pt-[max(0.5rem,var(--safe-top))] transition-[background-color,backdrop-filter,border-color] duration-300",
          scrolled ? "border-b border-line bg-jet/80 backdrop-blur-xl" : "border-b border-transparent bg-gradient-to-b from-jet/70 to-transparent",
        )}
      >
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-1.5">
            <button
              type="button" onClick={() => { setOpen(true); setSeen(true); }}
              aria-label={seen ? "Notifications" : "Notifications — 3 nouvelles"}
              className="relative grid size-11 place-items-center rounded-full transition hover:bg-cloud/10 active:scale-95"
            >
              <Bell size={22} strokeWidth={1.5} aria-hidden />
              {!seen && <span className="absolute right-3 top-3 size-2 rounded-full bg-sunset ring-2 ring-jet" />}
            </button>
            <Link href="/more" aria-label="Mon profil" className="grid size-11 place-items-center rounded-full">
              <Avatar name={`${user.firstName} Martin`} hue={18} size={34} ring />
            </Link>
          </div>
        </div>
        <p className="mt-0.5 flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.24em] text-dim">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-sunset opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-1.5 rounded-full bg-sunset" />
          </span>
          Pre-boarding / {event.year}
        </p>
      </header>

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
