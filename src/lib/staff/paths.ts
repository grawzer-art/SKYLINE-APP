/** Redirection après connexion : uniquement un chemin INTERNE sous /staff (jamais une URL externe ni un chemin protocole-relatif). */
export const safeStaffNext = (n: string | null | undefined) => (n && /^\/staff(\/[A-Za-z0-9\-_./]*)?$/.test(n) && !n.includes("//") && !n.includes("..") ? n : "/staff");

/** Cookie court (15 min) mémorisant la destination demandée : évite tout paramètre dans l'URL de retour, qui peut ainsi rester EXACTE dans la liste Supabase. */
export const LOGIN_NEXT_COOKIE = "sk_login_next";
