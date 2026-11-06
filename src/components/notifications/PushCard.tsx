"use client";
import { useMemo, useSyncExternalStore } from "react";
import { Smartphone } from "lucide-react";
import { cn } from "@/lib/cn";
import { detectPushSupport, type PushEnv, type PushState } from "@/lib/push/contracts";

export type PushLabels = { title: string; context: string; checking: string; button: string; foot: string; states: Record<PushState, string>; region: string };

/** Capacités du navigateur, lues SANS rien demander (aucune autorisation, aucun service worker enregistré en phase 1). */
function readEnv(): PushEnv {
  const nav = navigator as Navigator & { standalone?: boolean };
  const isIOS = /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
  return {
    secure: window.isSecureContext, isIOS, standalone: window.matchMedia?.("(display-mode: standalone)").matches === true || nav.standalone === true,
    hasServiceWorker: "serviceWorker" in nav, hasPushManager: "PushManager" in window, hasNotification: "Notification" in window,
    permission: "Notification" in window ? (Notification.permission as PushEnv["permission"]) : "unavailable",
  };
}
const subscribe = (cb: () => void) => { const mq = window.matchMedia?.("(display-mode: standalone)"); mq?.addEventListener?.("change", cb); return () => mq?.removeEventListener?.("change", cb); };
export const usePushSupport = () => {
  const snap = useSyncExternalStore(subscribe, () => JSON.stringify(readEnv()), () => "null");
  return useMemo(() => (snap === "null" ? null : detectPushSupport(JSON.parse(snap) as PushEnv)), [snap]);
};

/**
 * Activation des notifications push — VOLONTAIRE et CONTEXTUELLE : cette carte n'apparaît que dans les réglages de notifications, jamais à
 * l'ouverture de l'application, et PHASE 1 : le bouton reste inactif (aucune autorisation demandée, aucun abonnement, aucun envoi).
 */
export function PushCard({ context, labels }: { context: string; labels?: PushLabels }) {
  const s = usePushSupport();
  return (
    <section aria-label={labels?.region ?? "Notifications sur cet appareil"} data-testid="push-card" className="rounded-[10px] border border-line bg-surface-1 p-4">
      <div className="flex items-start gap-3">
        <Smartphone size={20} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0 text-sky" />
        <div className="min-w-0">
          <h3 className="font-display text-[1.05rem] leading-tight">{labels?.title ?? "Sur cet appareil"}</h3>
          <p className="mt-1 text-[0.88rem] leading-snug text-cloud/75">{labels?.context ?? context}</p>
          <p role="status" className="mt-2 text-[0.88rem] leading-snug text-cloud/90">{s ? (labels?.states[s.state] ?? s.reason) : (labels?.checking ?? "Vérification de l'appareil…")}</p>
        </div>
      </div>
      <button type="button" disabled aria-disabled="true" className={cn("mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-silver/40 px-6 font-mono text-[0.78rem] uppercase tracking-[0.14em] text-cloud/60")}>{labels?.button ?? "Activer les notifications · bientôt"}</button>
      <p className="mt-3 text-[0.78rem] leading-snug text-dim">{labels?.foot ?? "Vous resterez maître de l'activation : une demande d'autorisation n'apparaîtra que si vous la lancez vous-même, et vous pourrez désactiver cet appareil à tout moment."}</p>
    </section>
  );
}
