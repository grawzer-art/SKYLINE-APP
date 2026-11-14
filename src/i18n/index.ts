import { fr, type Key } from "./fr";
import { en } from "./en";
import { translateWith, type Vars } from "./translate";

export type Locale = "fr" | "en";
export const locales: { id: Locale; label: string }[] = [{ id: "fr", label: "Français" }, { id: "en", label: "English" }];
/**
 * Sélecteur de langue masqué TEMPORAIREMENT : seuls les écrans CLUB / en-tête sont traduits en anglais (HOME, MY FLIGHT, EXPLORE, SOUND, SIGNAL, comptes : pas encore).
 * L'architecture (dictionnaires fr/en, `translate`, état `locale`) est conservée intacte. Passer à `true` quand la traduction est complète.
 * Tant que c'est `false`, la langue effective est TOUJOURS le français, même si un appareil avait mémorisé « en » (voir `activeLocale`).
 */
export const LANGUAGE_SWITCH_ENABLED = false;
export const activeLocale = (l: Locale): Locale => (LANGUAGE_SWITCH_ENABLED ? l : "fr");
const dictionaries: Record<Locale, Record<string, string>> = { fr, en };

/** Clés de traduction : les formes plurielles (`x_one` / `x_other`) s'appellent par leur base `x` avec `count`. */
type PluralBase<K> = K extends `${infer B}_one` ? B : never;
export type TKey = Key | PluralBase<Key>;
export const translate = (locale: Locale, key: TKey, vars?: Vars): string => translateWith(dictionaries[locale] ?? fr, fr, key, vars);
export const dateLocale = (l: Locale) => (l === "en" ? "en-GB" : "fr-FR");
export type { Key, Vars };
