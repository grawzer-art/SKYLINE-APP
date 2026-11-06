/**
 * Accès base de données, réduit au strict nécessaire (lectures filtrées + appels de fonctions).
 * Implémentation réelle : `supabase-port.ts` (client navigateur, clé publique + jeton de l'utilisateur → RLS appliquée).
 * Les tests fournissent une autre implémentation (Postgres local PGlite) : le service est le MÊME code dans les deux cas.
 */
export type DbError = { message: string; code?: string; status?: number };
export type DbResult<T> = { data: T | null; error: DbError | null };
export type Row = Record<string, unknown>;
export type SelectOptions = { columns: string; eq?: Record<string, string>; order?: ReadonlyArray<readonly [string, boolean]>; limit?: number };
export interface DbPort {
  select(table: string, o: SelectOptions): Promise<DbResult<Row[]>>;
  rpc(fn: string, args?: Record<string, unknown>): Promise<DbResult<unknown>>;
}
