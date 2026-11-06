/**
 * WEB PUSH — CONTRATS TECHNIQUES (phase 1 : AUCUN abonnement, AUCUNE demande d'autorisation, AUCUN envoi réel).
 * Ce fichier fixe les types et les règles ; l'implémentation (service worker, abonnement, envoi serveur) viendra après validation.
 * Voir docs/skyline-staff-v2/B3-NOTIFICATIONS.md (architecture, iPhone PWA, sécurité).
 */
export const PUSH_SENDING_ENABLED = false as const;

export type Audience = "staff" | "participants";
/** Destinataire d'un envoi : une audience entière (annonce) OU un compte précis. Jamais les deux, jamais un mélange STAFF + participants. */
export type PushTarget = { kind: "audience"; audience: Audience } | { kind: "user"; userId: string };

/** Enregistrement d'un appareil (table `push_subscriptions` proposée). `p256dh` et `auth` sont des secrets de chiffrement : jamais lisibles par un autre utilisateur ni affichés. */
export type PushDevice = { id: string; userId: string; endpoint: string; label: string; createdAt: string; lastSeenAt: string; revokedAt: string | null };
/** Corps de `POST /api/push/subscribe` (contrat). L'utilisateur est identifié par sa SESSION, jamais par un champ du corps. */
export type SubscribeRequest = { endpoint: string; keys: { p256dh: string; auth: string }; deviceLabel: string };
/** Corps de `POST /api/push/send` (contrat, SERVEUR UNIQUEMENT) : administrateurs, confirmation explicite obligatoire. */
export type SendRequest = { target: PushTarget; title: string; body: string; url: string; urgent: boolean; confirm: true };
/** Charge utile minimale (la vie privée d'abord : pas de contenu sensible dans l'écran verrouillé). */
export type PushPayload = { title: string; body: string; url: string; tag: string; urgent: boolean };

export const PUSH_ROUTES = { subscribe: "POST /api/push/subscribe", unsubscribe: "DELETE /api/push/subscribe", devices: "GET /api/push/devices", send: "POST /api/push/send" } as const;

/** Qui peut envoyer : les administrateurs (admin STAFF, super admin), avec confirmation explicite — sinon refus. La base et le serveur revérifient. */
export const canSendPush = (a: { coordinator: boolean }, confirm: boolean) => a.coordinator === true && confirm === true;

/** Charge utile minimale : le titre et le texte réels restent dans l'application (lien profond), pas sur l'écran verrouillé. */
export function minimalPayload(n: { id: string; urgent?: boolean; url?: string | null }, audience: Audience): PushPayload {
  return { title: audience === "staff" ? "SKYLINE STAFF" : "SKYLINE", body: n.urgent ? "Nouvelle information importante" : "Nouvelle notification", url: n.url && n.url.startsWith("/") ? n.url : audience === "staff" ? "/staff/notifications" : "/v3/notifications", tag: n.id, urgent: !!n.urgent };
}

/* ------------------------------------------------------------------ Détection de capacité (pure, testable) */
export type PushEnv = { secure: boolean; isIOS: boolean; standalone: boolean; hasServiceWorker: boolean; hasPushManager: boolean; hasNotification: boolean; permission: "default" | "granted" | "denied" | "unavailable" };
/** `needs_install` : iPhone / iPad hors application installée (le Web Push n'y existe que pour une PWA ajoutée à l'écran d'accueil, iOS 16.4+). */
export type PushState = "unsupported" | "needs_install" | "blocked" | "coming_soon" | "ready";
export function detectPushSupport(env: PushEnv, sendingEnabled: boolean = PUSH_SENDING_ENABLED): { state: PushState; reason: string } {
  if (!env.secure) return { state: "unsupported", reason: "Une connexion sécurisée (HTTPS) est nécessaire." };
  if (env.isIOS && !env.standalone) return { state: "needs_install", reason: "Sur iPhone, ajoutez d'abord SKYLINE à l'écran d'accueil (Partager → Sur l'écran d'accueil)." };
  if (!env.hasServiceWorker || !env.hasPushManager || !env.hasNotification) return { state: "unsupported", reason: "Ce navigateur ne permet pas les notifications push." };
  if (env.permission === "denied") return { state: "blocked", reason: "Les notifications sont bloquées dans les réglages de l'appareil." };
  if (!sendingEnabled) return { state: "coming_soon", reason: "Disponible prochainement. Aucune autorisation n'est demandée pour l'instant." };
  return { state: "ready", reason: "Vous pouvez activer les notifications sur cet appareil." };
}
