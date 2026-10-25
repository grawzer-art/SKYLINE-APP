"use client";
import { useEffect, useState } from "react";

export type CountdownState =
  | { status: "pending" } // avant hydratation : évite tout décalage serveur/client
  | { status: "invalid" }
  | { status: "past"; since: number }
  | { status: "running"; days: number; hours: number; minutes: number; seconds: number };

function compute(targetISO: string, now: number): CountdownState {
  const target = Date.parse(targetISO);
  if (Number.isNaN(target)) return { status: "invalid" };
  const diff = target - now;
  if (diff <= 0) return { status: "past", since: Math.floor(-diff / 1000) };
  const s = Math.floor(diff / 1000);
  return {
    status: "running",
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

/** Compte à rebours calé sur la seconde, sans dérive (recalcule depuis Date.now). */
export function useCountdown(targetISO: string): CountdownState {
  const [state, setState] = useState<CountdownState>({ status: "pending" });
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const now = Date.now();
      setState(compute(targetISO, now));
      timer = setTimeout(tick, 1000 - (now % 1000) + 5);
    };
    tick();
    return () => clearTimeout(timer);
  }, [targetISO]);
  return state;
}
