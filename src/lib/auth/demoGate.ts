/** Règle pure (testée) : la session STAFF de démonstration n'existe qu'en local. Voir `demoAuthEnabled` dans token.ts. */
export type DemoAuthEnv = { VERCEL?: string; VERCEL_ENV?: string; DEMO_AUTH?: string };
export const onHostingPlatform = (env: Pick<DemoAuthEnv, "VERCEL" | "VERCEL_ENV">): boolean => (env.VERCEL ?? "") !== "" || (env.VERCEL_ENV ?? "") !== "";
export const demoSessionAllowed = (env: DemoAuthEnv): boolean => !onHostingPlatform(env) && env.DEMO_AUTH !== "off";
