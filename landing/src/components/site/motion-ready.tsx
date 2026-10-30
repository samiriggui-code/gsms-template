"use client";

import { useEffect } from "react";

/** Active les animations Motion côté client (le CSS global garde le contenu visible avant). */
export function MotionReady() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motionReady = "true";
    if (
      window.matchMedia("(max-width: 768px)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      root.dataset.instantMotion = "true";
      return;
    }
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection;
    if (conn?.saveData || conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g") {
      root.dataset.instantMotion = "true";
    }
  }, []);
  return null;
}
