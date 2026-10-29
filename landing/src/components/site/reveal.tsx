"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/** Apparition douce au défilement (respecte prefers-reduced-motion via le CSS global). */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <Reveal className="mx-auto mb-14 max-w-2xl text-center">
      <p className="mb-4 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs uppercase tracking-[0.2em] text-brand-cyan">
        <span className="size-1.5 rounded-full bg-brand-cyan" />
        {eyebrow}
      </p>
      <h2 className="text-3xl leading-tight sm:text-5xl">{title}</h2>
      {subtitle && <p className="mt-5 text-lg text-muted-foreground">{subtitle}</p>}
    </Reveal>
  );
}
