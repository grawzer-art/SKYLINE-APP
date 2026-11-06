/**
 * Erreurs de la base (messages des fonctions SQL B0, codes PostgREST/Postgres) → messages français SÛRS pour l'écran.
 * On n'affiche jamais le texte brut d'une erreur serveur (il pourrait révéler la structure de la base).
 */
export type DbErrorKind = "forbidden" | "conflict" | "not_found" | "invalid" | "auth" | "network" | "unknown";
export type MissionError = { kind: DbErrorKind; message: string };
export type RawDbError = { message?: string; code?: string; status?: number } | null | undefined;

const E = (kind: DbErrorKind, message: string): MissionError => ({ kind, message });
const FORBIDDEN = E("forbidden", "Action non autorisée pour votre compte.");
const KNOWN: Record<string, MissionError> = {
  forbidden: FORBIDDEN,
  forbidden_status: E("forbidden", "Une mission ne peut pas être créée directement terminée."),
  forbidden_transition: E("forbidden", "Ce changement de statut n'est pas autorisé pour vous."),
  forbidden_project: E("forbidden", "Vous n'avez pas accès à ce projet."),
  version_conflict: E("conflict", "Cette mission a été modifiée entre-temps par quelqu'un d'autre. Rechargez-la avant de réessayer."),
  not_found: E("not_found", "Mission introuvable ou inaccessible (elle a pu être supprimée)."),
  archived: E("invalid", "Cette mission est archivée : elle n'est plus modifiable."),
  same_status: E("conflict", "La mission a déjà ce statut (modifiée entre-temps ?). Rechargez la mission."),
  same_assignee: E("invalid", "Cette personne est déjà responsable."),
  validator_conflict: E("invalid", "Le responsable ne peut pas être aussi le validateur."),
  invalid_assignee: E("invalid", "Responsable invalide : il doit être membre actif de l'équipe."),
  invalid_validator: E("invalid", "Validateur invalide : il doit être un administrateur."),
  invalid_title: E("invalid", "Titre invalide (1 à 120 caractères)."),
  invalid_description: E("invalid", "Description trop longue (500 caractères maximum)."),
  invalid_comment: E("invalid", "Commentaire invalide (1 à 1000 caractères)."),
  invalid_time: E("invalid", "Heure invalide : choisissez d'abord une date."),
  invalid_range: E("invalid", "Période invalide pour l'agenda collectif."),
  no_pending_assignment: E("conflict", "Aucune attribution en attente (déjà traitée ?). Rechargez la mission."),
};

export function mapDbError(e: RawDbError): MissionError {
  const msg = (e?.message ?? "").trim(); const code = e?.code ?? "";
  const hit = KNOWN[msg.toLowerCase()]; if (hit) return hit;
  if (code === "42501" || /permission denied|row-level security/i.test(msg)) return FORBIDDEN;
  if (e?.status === 401 || code === "PGRST301" || /jwt|not authenticated/i.test(msg)) return E("auth", "Votre session a expiré. Reconnectez-vous.");
  if (e?.status === 0 || /fetch|network|timeout|offline|econn/i.test(msg)) return E("network", "Connexion impossible. Vérifiez votre réseau puis réessayez.");
  return E("unknown", "Une erreur inattendue est survenue. Réessayez dans un instant.");
}
