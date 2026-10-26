/** Moteur de traduction pur (aucun import) : variables {x} ; pluriels `_one` / `_other` si `count` est fourni ; repli sur le français. */
export type Vars = Record<string, string | number>;

export function translateWith(dict: Record<string, string>, fallback: Record<string, string>, key: string, vars?: Vars): string {
  let k = key;
  if (vars && typeof vars.count === "number") {
    const plural = `${key}_${vars.count === 1 ? "one" : "other"}`;
    if (plural in dict || plural in fallback) k = plural;
  }
  const template = dict[k] ?? fallback[k] ?? key;
  return vars ? template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`)) : template;
}
