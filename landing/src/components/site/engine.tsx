import { ArrowRight, BookOpenText, Bot, BrainCircuit, FileSearch } from "lucide-react";

import { Reveal, SectionHeading } from "@/components/site/reveal";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n";

// Même ordre que t.features : RAG, agents, wiki, mémoire d'équipe
const ICONS = [FileSearch, Bot, BookOpenText, BrainCircuit];

/** Présentation du moteur IA gsms (socle WeKnora + mémoire d'équipe portée d'Agent Memory). */
export function Engine({ t }: { t: Dictionary["engine"] }) {
  return (
    <section id="engine" className="relative scroll-mt-20 py-28">
      <div aria-hidden className="absolute inset-x-0 top-1/4 -z-10 mx-auto h-80 max-w-3xl rounded-full bg-brand-cyan/10 blur-[120px]" />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {t.features.map((f, i) => {
            const Icon = ICONS[i] ?? FileSearch;
            return (
              <li key={f.title}>
                <Reveal delay={i * 0.08} className="h-full">
                  <article className="border-gradient h-full rounded-2xl p-6">
                    <Icon className="mb-5 size-7 text-brand-cyan" strokeWidth={1.5} />
                    <h3 className="text-lg">{f.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
                  </article>
                </Reveal>
              </li>
            );
          })}
        </ul>

        <Reveal className="mt-12 flex justify-center">
          <Button asChild size="lg">
            <a href="#booking">
              {t.cta} <ArrowRight />
            </a>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
