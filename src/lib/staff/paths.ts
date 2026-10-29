/** Redirection après connexion : uniquement un chemin INTERNE sous /staff (jamais une URL externe ni un chemin protocole-relatif). */
export const safeStaffNext = (n: string | null | undefined) => (n && /^\/staff(\/[A-Za-z0-9\-_./]*)?$/.test(n) && !n.includes("//") && !n.includes("..") ? n : "/staff");
