"use client";

import { useEffect, useState } from "react";

function readInstantMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  if (window.matchMedia("(max-width: 768px)").matches) return true;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
  if (conn?.saveData) return true;
  if (conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g") return true;
  return false;
}

/** Pas d’apparition au scroll / stagger sur mobile, save-data ou connexion lente. */
export function useInstantLandingMotion(): boolean {
  const [instant, setInstant] = useState(readInstantMotion);

  useEffect(() => {
    const update = () => setInstant(readInstantMotion());
    update();

    const queries = [
      window.matchMedia("(max-width: 768px)"),
      window.matchMedia("(prefers-reduced-motion: reduce)"),
    ];
    for (const mq of queries) {
      mq.addEventListener("change", update);
    }
    return () => {
      for (const mq of queries) {
        mq.removeEventListener("change", update);
      }
    };
  }, []);

  return instant;
}
