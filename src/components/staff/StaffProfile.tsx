"use client";
import { ChangeSpaceLink, SpaceSwitcher, useDemoStatus } from "./SpaceSwitcher";

export function StaffProfile() {
  const st = useDemoStatus(); const s = st === undefined ? undefined : st.session; const supa = st?.mode === "supabase";
  return (
    <>
      <section className="px-5 pt-10"><h2 className="mb-3 font-mono text-[0.75rem] uppercase tracking-[0.22em] text-cloud/72">Espace</h2><SpaceSwitcher /><ChangeSpaceLink className="mt-3" /></section>
      <section className="px-5 pt-10">
        <h2 className="mb-3 font-mono text-[0.75rem] uppercase tracking-[0.22em] text-cloud/72">{supa ? "Session" : "Session démonstration"}</h2>
        {s === undefined ? <p className="text-dim">Chargement…</p> : s ? (
          <>
            <p className="text-[1.1rem]">{s.name}</p>
            <p className="mt-2 flex flex-wrap gap-2">{s.roles.map((r) => <span key={r} className="rounded-full border border-silver/45 px-3.5 py-1.5 font-mono text-[0.78rem] uppercase tracking-[0.14em]">{r}</span>)}</p>
            <form method="post" action={supa ? "/auth/signout" : "/api/demo-session"} className="mt-6">{!supa && <input type="hidden" name="account" value="logout" />}<button type="submit" className="inline-flex min-h-12 items-center rounded-full border border-silver/45 px-6 font-mono text-[0.78rem] uppercase tracking-[0.14em]">Fermer la session</button></form>
          </>
        ) : <p className="text-dim">Aucune session.</p>}
        {supa && <p className="mt-5 max-w-[38ch] text-[0.88rem] leading-snug text-dim">Connexion individuelle active. Les écrans STAFF utilisent encore des données locales de démonstration, non partagées.</p>}
      </section>
    </>
  );
}
