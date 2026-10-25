import type { ReactNode } from "react";

export function Section({ id, eyebrow, title, action, children }: {
  id: string; eyebrow: string; title: string; action?: ReactNode; children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="px-5 pt-14">
      <header className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-sky">{eyebrow}</p>
          <h2 id={`${id}-title`} className="font-display mt-2 text-[1.75rem]">{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
