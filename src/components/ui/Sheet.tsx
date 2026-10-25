"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { transitions } from "@/design/motion";
import { useHydrated } from "@/lib/useHydrated";

const FOCUSABLE = 'a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])';

/**
 * Panneau modal (bottom sheet) :
 * - Échap, clic sur le fond et bouton ✕ ferment ;
 * - le bouton retour du navigateur/iPhone ferme le panneau (entrée d'historique dédiée) ;
 * - focus piégé dans le panneau, restauré à la fermeture ; scroll du fond verrouillé.
 */
export function Sheet({ open, onClose, title, eyebrow, children }: {
  open: boolean; onClose: () => void; title: string; eyebrow?: string; children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const pushed = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  // Historique : ouverture = pushState ; retour système = fermeture.
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ skylineSheet: true }, "");
    pushed.current = true;
    const onPop = () => { pushed.current = false; onCloseRef.current(); };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (pushed.current) { pushed.current = false; window.history.back(); } // fermé par l'UI → on retire l'entrée
    };
  }, [open]);

  // Focus, scroll lock, clavier.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onCloseRef.current(); }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [open]);

  const close = useCallback(() => onClose(), [onClose]);
  if (!hydrated) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-jet/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={transitions.quick} onClick={close}
          />
          <motion.div
            ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
            className="relative flex max-h-[92dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[28px] border border-line bg-surface-1 shadow-2xl"
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={reduce ? transitions.quick : transitions.sheet}
          >
            <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5">
              <div>
                {eyebrow && <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-sky">{eyebrow}</p>}
                <h2 id={titleId} className="font-display mt-2 text-[1.5rem]">{title}</h2>
              </div>
              <button type="button" onClick={close} aria-label="Fermer"
                className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-cloud/5 transition hover:bg-cloud/10 active:scale-95">
                <X size={20} strokeWidth={1.5} aria-hidden />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,var(--safe-bottom))]">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
