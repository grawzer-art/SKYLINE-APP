import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbPort, Row } from "./port.ts";

const net = (e: unknown) => ({ data: null, error: { message: e instanceof Error ? e.message : "network", status: 0 } });

/** Port réel : toute lecture passe par la RLS, toute écriture par les fonctions SQL autorisées. Aucune clé secrète. */
export function createSupabasePort(client: SupabaseClient): DbPort {
  return {
    async select(table, o) {
      try {
        let q = client.from(table).select(o.columns);
        for (const [k, v] of Object.entries(o.eq ?? {})) q = q.eq(k, v);
        for (const [c, asc] of o.order ?? []) q = q.order(c, { ascending: asc });
        if (o.limit) q = q.limit(o.limit);
        const r = await q;
        return { data: (r.data as unknown as Row[] | null) ?? null, error: r.error ? { message: r.error.message, code: r.error.code, status: r.status } : null };
      } catch (e) { return net(e) as never; }
    },
    async rpc(fn, args) {
      try {
        const r = await client.rpc(fn, args ?? {});
        return { data: r.data as unknown, error: r.error ? { message: r.error.message, code: r.error.code, status: r.status } : null };
      } catch (e) { return net(e) as never; }
    },
  };
}
