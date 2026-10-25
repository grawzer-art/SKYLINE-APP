"use client";
import { useEffect } from "react";

/** V2 : supprime l'ancien état local de la checklist V1 sur les appareils qui l'avaient enregistré. */
export function LegacyCleanup() {
  useEffect(() => { try { window.localStorage.removeItem("skyline.demo.checklist.v1"); } catch {} }, []);
  return null;
}
