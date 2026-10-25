"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Icon } from "@/components/ui/Icon";
import { navItems } from "@/components/layout/nav-items";
import { cn } from "@/lib/cn";

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" || pathname === "/crew" : pathname.startsWith(href));

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[480px] border-t border-line bg-jet/85 pb-[var(--safe-bottom)] backdrop-blur-xl"
    >
      <ul className="grid h-[var(--nav-h)] grid-cols-5">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.id}>
              <Link
                href={item.href} aria-current={active ? "page" : undefined}
                className={cn("relative flex h-full flex-col items-center justify-center gap-1 transition-colors", active ? "text-cloud" : "text-dim hover:text-cloud")}
              >
                {active && (
                  <motion.span layoutId="nav-indicator" className="absolute top-0 h-[2px] w-8 rounded-full bg-sunset"
                    transition={{ type: "spring", damping: 30, stiffness: 400 }} />
                )}
                <Icon name={item.icon} size={22} className={active ? "text-sunset" : undefined} />
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em]">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
