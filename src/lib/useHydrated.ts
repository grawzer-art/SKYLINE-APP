"use client";
import { useSyncExternalStore } from "react";
const noop = () => () => {};
/** true uniquement côté client après hydratation. */
export const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);
