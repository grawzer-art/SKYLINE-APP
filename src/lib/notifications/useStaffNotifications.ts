"use client";
import { useEffect, useMemo, useState } from "react";
import { useDemoStatus } from "@/components/staff/SpaceSwitcher";
import { announcements } from "@/data/staff";
import { defaultStaffPrefs, deriveReminders, deriveStaffNotifications, isVisible, normalizeStaffPrefs, staffSamples, unreadCount, type CommentLike, type NotificationItem } from "@/domain/notifications";
import type { Actor } from "@/domain/missions";
import { useActor } from "@/lib/useActor";
import { useMissions } from "@/lib/missions/MissionsProvider";
import { useClock } from "@/lib/useClock";
import { useFlag, usePrefs, useReadSet } from "./storage";

const defaults = defaultStaffPrefs();
/**
 * Boîte de notifications STAFF. DÉRIVÉE des missions réelles (historique, commentaires, échéances) : même source en mode local et en mode base.
 * Exemples de démonstration : mode local seulement, à la demande, toujours marqués « Exemple ». Jamais en mode base de données.
 */
export function useStaffNotifications() {
  const st = useDemoStatus(); const who = useActor(); const M = useMissions(); const clock = useClock();
  const actor: Actor | null = who.status === "ok" ? who.actor : null;
  const uid = st?.session?.userId ?? st?.session?.memberId ?? "pending";
  const read = useReadSet(`skyline.staff.notifs.read.v1:${uid}`);
  const prefsApi = usePrefs(`skyline.staff.notifs.prefs.v1:${uid}`, normalizeStaffPrefs, defaults);
  const [samplesOn, setSamples] = useFlag(`skyline.staff.notifs.samples.v1:${uid}`);
  const samplesAllowed = M.source === "local";

  // Commentaires récents (base de données) : une requête, rechargée quand les missions changent.
  const [comments, setComments] = useState<CommentLike[]>([]);
  const ready = M.status === "ready" && M.source === "db"; const rev = M.missions.length;
  const { recent } = M.comments;
  useEffect(() => { if (!ready) return; let off = false; void recent().then((r) => { if (!off && r.ok) setComments(r.value); }); return () => { off = true; }; }, [ready, rev, recent]);

  const items = useMemo<NotificationItem[]>(() => {
    if (!actor || !clock || M.status !== "ready") return [];
    const now = clock; const name = M.directory.name;
    const all = [
      ...deriveStaffNotifications({ missions: M.missions, actor, name, now, comments: ready ? comments : [] }),
      ...deriveReminders({ missions: M.missions, actor, now, lead: prefsApi.prefs.reminderLead }),
      ...(samplesAllowed && samplesOn ? [...staffSamples(now), ...announcements.map((a): NotificationItem => ({ id: `sample:ann:${a.id}`, category: "announcements", title: a.title, body: a.text, at: new Date(now - 3 * 3_600_000).toISOString(), href: "/staff/comms", urgent: a.tag === "Priorité", sample: true }))] : []),
    ];
    return all.filter((n) => isVisible(n, prefsApi.prefs)).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }, [actor, clock, M.status, M.missions, M.directory, ready, comments, samplesAllowed, samplesOn, prefsApi.prefs]);

  return {
    status: M.status, source: M.source, actor, items, unread: unreadCount(items, read.read), read: read.read,
    markRead: read.markRead, markAllRead: () => read.markRead(items.map((n) => n.id)),
    prefs: prefsApi.prefs, updatePrefs: prefsApi.update,
    samples: { allowed: samplesAllowed, on: samplesOn, set: setSamples },
  };
}
