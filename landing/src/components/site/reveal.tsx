import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Enveloppe sémantique pour les sections — pas d’animation au scroll (aligné prod Qualiopi / Form'SSI). */
export function Reveal({ children, className }: { children: ReactNode; delay?: number; className?: string }) {
  return <div className={cn("gsms-motion-reveal", className)}>{children}</div>;
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
