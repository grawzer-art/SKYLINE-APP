/**
 * RÉSOLVEUR DE VÉRITÉ de l'expérience participants — logique PURE, un seul endroit.
 * Aucun composant ne lit directement l'état local simulé (`phase`, `sim`) : il passe par ici.
 *
 *  surface « loading » : identité ou mode revue pas encore connus (rien n'est affiché de simulé).
 *  surface « review »  : mode revue LOCAL (authentification participants désactivée) : prototype complet, tout est simulé et étiqueté.
 *  surface « account » : authentification active : les données viennent du serveur ; l'état local simulé est IGNORÉ.
 *  surface « open »    : authentification désactivée, hors revue : application sans comptes, aucune identité, aucune réservation, aucun voyage.
 *
 * Réservation : « verified » UNIQUEMENT sur preuve du serveur (statut voyageur du compte connecté). Un état local ne peut jamais produire « verified ».
 * Phase : en live, « avant » tant que les dates de l'édition ne sont pas confirmées officiellement.
 */
export type Phase = "before" | "during" | "after";
export type Traveler = "none" | "verified" | "unknown";
export type Surface = "loading" | "review" | "account" | "open";
export type Reservation = "verified" | "none" | "unknown" | "simulated_confirmed" | "simulated_pending";
export type ProtoView = { phase: Phase; sim: { reservation: "confirmed" | "pending"; tone: boolean; trip: boolean } };
export type IdentityView = { status: "loading" | "off" | "misconfigured" | "anonymous" | "no_access" | "error" | "ready"; traveler?: Traveler };
export type Confirmation = { dates: boolean; schedule: boolean; seats: boolean; tickets: boolean };
export type ExperienceInput = { review: boolean | null; identity: IdentityView; proto: ProtoView; confirmation: Confirmation; datePhase: Phase };

export type Experience = {
  surface: Surface; review: boolean; phase: Phase; reservation: Reservation;
  /** Preuve serveur d'une réservation vérifiée (seule source du statut voyageur). */
  verifiedTraveler: boolean;
  /** Eligibilité communautaire : réservation vérifiée (serveur) ou simulée (revue seulement) + compte actif. */
  reservationConfirmed: boolean; accountActive: boolean;
  showSimulation: boolean; demoTrip: boolean; demoTone: boolean; demoContent: boolean;
  countdown: boolean; toConfirmDates: boolean;
};

export function resolveExperience(i: ExperienceInput): Experience {
  const idLoading = i.identity.status === "loading"; const off = i.identity.status === "off";
  const surface: Surface = idLoading || (off && i.review === null) ? "loading" : off && i.review === true ? "review" : off ? "open" : "account";
  const review = surface === "review";
  if (review) {
    const r = i.proto.sim.reservation;
    return { surface, review, phase: i.proto.phase, reservation: r === "confirmed" ? "simulated_confirmed" : "simulated_pending", verifiedTraveler: false,
      reservationConfirmed: r === "confirmed", accountActive: true, showSimulation: true, demoTrip: i.proto.sim.trip, demoTone: i.proto.sim.tone, demoContent: true, countdown: true, toConfirmDates: !i.confirmation.dates };
  }
  const traveler: Traveler = surface === "account" && i.identity.status === "ready" ? i.identity.traveler ?? "unknown" : "none";
  const verified = traveler === "verified";
  const phase: Phase = i.confirmation.dates ? i.datePhase : "before";
  return { surface, review, phase, reservation: surface === "open" ? "none" : traveler === "verified" ? "verified" : traveler === "unknown" ? "unknown" : "none", verifiedTraveler: verified,
    reservationConfirmed: verified, accountActive: surface === "account" && i.identity.status === "ready", showSimulation: false, demoTrip: false, demoTone: false, demoContent: false,
    countdown: i.confirmation.dates, toConfirmDates: !i.confirmation.dates };
}
