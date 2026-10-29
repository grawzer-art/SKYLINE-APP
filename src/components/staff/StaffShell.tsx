"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, LayoutGrid, MessageSquare, Users } from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";
import { cn } from "@/lib/cn";

const tabs = [
  { label: "HQ", href: "/staff", Icon: LayoutGrid },
  { label: "Schedule", href: "/staff/schedule", Icon: CalendarClock },
  { label: "Comms", href: "/staff/comms", Icon: MessageSquare },
  { label: "Team", href: "/staff/team", Icon: Users },
];

/**
 * Chrome de STAFF HQ : même identité SKYLINE (wordmark, palette, typographies), interface propre à l'organisation.
 * L'accès est contrôlé côté serveur (src/proxy.ts) ; ce composant n'est que de l'affichage.
 */
export function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/staff/access" || pathname === "/staff/login") return <>{children}</>;
  const active = (href: string) => (href === "/staff" ? pathname === "/staff" || pathname.startsWith("/staff/missions") : pathname.startsWith(href)); // MISSIONS vit sous l'onglet HQ
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-[480px] border-b border-line bg-jet/90 px-5 pt-[var(--safe-top)] backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/staff" aria-label="SKYLINE — STAFF HQ" className="flex min-h-11 items-center"><Wordmark /></Link>
            <span className="rounded-full border border-sky/60 px-2.5 py-1 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-sky">Staff HQ</span>
          </div>
          <Link href="/staff/profile" aria-label="Profil et espaces" className="grid size-11 place-items-center rounded-full border border-silver/40 font-mono text-[0.8rem] text-cloud">HQ</Link>
        </div>
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-sky/70 to-transparent" />
      </header>

      <div className="min-h-dvh pb-[calc(var(--nav-h)+var(--safe-bottom)+2.5rem)] pt-[calc(var(--safe-top)+3.5rem)]">{children}</div>

      <nav aria-label="Navigation STAFF HQ" className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[480px] border-t border-cloud/10 bg-jet/90 pb-[var(--safe-bottom)] backdrop-blur-2xl">
        <ul className="grid h-[var(--nav-h)] grid-cols-4">
          {tabs.map(({ label, href, Icon }) => (
            <li key={href} className="relative">
              <Link href={href} aria-current={active(href) ? "page" : undefined} className={cn("flex h-full min-h-11 flex-col items-center justify-center gap-1.5 transition-colors", active(href) ? "text-cloud" : "text-silver/60")}>
                <Icon size={20} strokeWidth={1.5} aria-hidden />
                <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em]">{label}</span>
              </Link>
              {active(href) && <span aria-hidden className="absolute inset-x-[30%] top-0 h-px bg-sky" />}
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
