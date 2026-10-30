import { ArrowDownRight, ArrowRight } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n";

export function Hero({ t }: { t: Dictionary["hero"] }) {
  const words = t.title.split(" ");
  const last = words.pop();

  return (
    <section className="noise relative isolate overflow-hidden pb-24 pt-36 sm:pt-44">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-fade absolute inset-0" />
        <div className="absolute -left-32 top-0 size-[38rem] animate-float rounded-full bg-brand-blue/35 blur-[140px]" />
        <div className="absolute -right-24 top-24 size-[30rem] animate-float rounded-full bg-brand-cyan/20 blur-[140px] [animation-delay:-4s]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="gsms-motion-hero-copy">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card/50 px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-brand-cyan backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-brand-cyan" />
            {t.eyebrow}
          </p>
          <h1 className="text-5xl leading-[1.05] sm:text-7xl">
            {words.join(" ")} <span className="text-gradient-shimmer animate-shimmer">{last}</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">{t.subtitle}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button asChild size="lg">
              <a href="#booking">
                {t.primary} <ArrowRight />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#poles">
                {t.secondary} <ArrowDownRight />
              </a>
            </Button>
          </div>
          <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t pt-8">
            {t.stats.map((s) => (
              <div key={s.label}>
                <dt className="font-display text-2xl font-bold sm:text-3xl">{s.value}</dt>
                <dd className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div
          aria-hidden
          className="gsms-motion-hero-symbol relative mx-auto hidden aspect-square w-full max-w-md lg:block"
        >
          <div className="absolute inset-6 rounded-full bg-brand-gradient opacity-25 blur-3xl" />
          <div className="border-gradient absolute inset-0 rounded-[2.5rem] bg-card/40 backdrop-blur-xl" />
          <Image
            src="/brand/symbol.png"
            alt=""
            fill
            sizes="28rem"
            className="animate-float object-contain p-14 drop-shadow-[0_0_40px_rgba(0,200,255,0.45)]"
          />
        </div>
      </div>
    </section>
  );
}
