"use client";

import { ArrowUpRight, BrainCircuit, Cloud, Code2, GraduationCap, House, Network, Server, ShieldCheck, Wrench, type LucideIcon } from "lucide-react";
import { type MouseEvent } from "react";

import { Reveal, SectionHeading } from "@/components/site/reveal";
import type { Dictionary } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  infogerance: Server,
  reseau: Network,
  cybersecurite: ShieldCheck,
  cloud: Cloud,
  developpement: Code2,
  ia: BrainCircuit,
  domotique: House,
  depannage: Wrench,
  formation: GraduationCap,
};

export interface PoleView {
  slug: string;
  name_fr: string;
  name_en: string;
  description_fr: string;
  description_en: string;
}

/** Carte à halo qui suit le curseur. */
function SpotlightCard({ className, children }: { className?: string; children: React.ReactNode }) {
  const onMove = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
  };
  return (
    <article
      onMouseMove={onMove}
      className={cn(
        "group border-gradient relative h-full overflow-hidden rounded-2xl p-7 transition-transform duration-500 hover:-translate-y-1",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: "radial-gradient(420px circle at var(--x, 50%) var(--y, 50%), rgba(0,140,255,0.16), transparent 45%)" }}
      />
      <div className="relative flex h-full flex-col">{children}</div>
    </article>
  );
}

export function Poles({ lang, poles, t }: { lang: Lang; poles: PoleView[]; t: Dictionary["poles"] }) {
  return (
    <section id="poles" className="relative scroll-mt-20 py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {poles.map((p, i) => {
            const Icon = ICONS[p.slug] ?? Server;
            const name = lang === "en" ? p.name_en || p.name_fr : p.name_fr;
            const desc = lang === "en" ? p.description_en || p.description_fr : p.description_fr;
            return (
              <li key={p.slug}>
                <Reveal delay={(i % 3) * 0.08} className="h-full">
                  <SpotlightCard>
                    <div className="mb-6 flex items-start justify-between">
                      <span className="flex size-12 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-[0_8px_24px_-6px_rgba(0,120,255,0.6)]">
                        <Icon className="size-6" strokeWidth={1.75} />
                      </span>
                      <span className="font-display text-sm text-muted-foreground/60">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <h3 className="text-xl">{name}</h3>
                    <p className="mt-3 flex-1 leading-relaxed text-muted-foreground">{desc}</p>
                    <a
                      href={`#booking`}
                      data-pole={p.slug}
                      className="mt-6 inline-flex items-center gap-1.5 text-sm text-brand-cyan opacity-80 transition-all group-hover:gap-2.5 group-hover:opacity-100"
                    >
                      {t.cta} <ArrowUpRight className="size-4" />
                    </a>
                  </SpotlightCard>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
