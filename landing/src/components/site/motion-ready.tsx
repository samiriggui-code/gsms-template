"use client";

import { useEffect } from "react";

/** Active les animations Motion côté client (le CSS global garde le contenu visible avant). */
export function MotionReady() {
  useEffect(() => {
    document.documentElement.dataset.motionReady = "true";
  }, []);
  return null;
}
