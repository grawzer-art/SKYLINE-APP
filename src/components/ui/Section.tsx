import type { ReactNode } from "react";

export function Section({ id, eyebrow, title, action, children }: {
  id: string; eyebrow: string; title: string; action?: ReactNode; children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 px-5 pt-10">
      <header className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-sky">{eyebrow}</p>
          <h2 id={`${id}-title`} className="font-display mt-1.5 text-[1.15rem]">{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
