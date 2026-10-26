"use client";
import { useState } from "react";
import { signals, type Signal } from "@/data/demo";
import { useSignals } from "@/lib/useSignals";
import { SignalReveal } from "./SignalReveal";

/** Archive des révélations : tout reste consultable après ouverture. */
export function SignalList() {
  const { isSeen, markSeen } = useSignals();
  const [open, setOpen] = useState<Signal | null>(null);
  return (
    <section aria-labelledby="signal-title" className="px-5 pt-10">
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-sky">Skyline Signal</p>
      <h2 id="signal-title" className="font-display mt-1.5 text-[1.15rem]">Révélations</h2>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {signals.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => { setOpen(s); markSeen(s.id); }} aria-haspopup="dialog" className="flex min-h-16 w-full items-center gap-4 py-3 text-left">
              <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${isSeen(s.id) ? "bg-transparent" : "bg-sunset"}`} />
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[0.58rem] uppercase tracking-[0.18em] text-dim">{s.kindLabel} · {s.date}{!isSeen(s.id) && <span className="sr-only"> — nouveau</span>}</span>
                <span className="mt-1 block text-[0.95rem]">{s.title}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <SignalReveal signal={open} onClose={() => setOpen(null)} />
    </section>
  );
}
