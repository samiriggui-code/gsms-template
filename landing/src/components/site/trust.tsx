import { Clock, EyeIcon, HeartHandshake, LockKeyhole } from "lucide-react";

import { Reveal, SectionHeading } from "@/components/site/reveal";
import type { Dictionary } from "@/lib/i18n";
import type { ContentPublic } from "@/lib/types";

const STACK = [
  "Microsoft 365", "Azure", "AWS", "Linux", "Windows Server", "VMware", "Proxmox", "Docker", "Kubernetes",
  "Cisco", "Ubiquiti", "Fortinet", "pfSense", "Veeam", "Python", "React", "PostgreSQL", "Home Assistant",
];
const ICONS = [Clock, LockKeyhole, EyeIcon, HeartHandshake];

export function Trust({ t, references }: { t: Dictionary["trust"]; references: ContentPublic[] }) {
  return (
    <section id="trust" className="relative scroll-mt-20 py-28">
      <div aria-hidden className="absolute inset-x-0 top-1/3 -z-10 mx-auto h-96 max-w-4xl rounded-full bg-brand-blue/10 blur-[120px]" />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {t.values.map((v, i) => {
            const Icon = ICONS[i] ?? Clock;
            return (
              <li key={v.title}>
                <Reveal delay={i * 0.08} className="h-full">
                  <div className="h-full rounded-2xl border bg-card/60 p-6 backdrop-blur">
                    <Icon className="mb-5 size-7 text-brand-cyan" strokeWidth={1.5} />
                    <h3 className="text-lg">{v.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{v.text}</p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>

        {/* Marquee des technologies */}
        <Reveal className="mt-20">
          <p className="mb-6 text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">{t.stack}</p>
          <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
            <div className="flex w-max animate-marquee gap-4 hover:[animation-play-state:paused]">
              {[...STACK, ...STACK].map((name, i) => (
                <span key={`${name}-${i}`} aria-hidden={i >= STACK.length} className="whitespace-nowrap rounded-full border bg-card/60 px-5 py-2 text-sm text-muted-foreground">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Réalisations publiées depuis le back-office */}
        <div className="mt-24">
          <Reveal>
            <h3 className="mb-8 text-center text-2xl">{t.references}</h3>
          </Reveal>
          {references.length === 0 ? (
            <p className="text-center text-muted-foreground">{t.referencesEmpty}</p>
          ) : (
            <ul className="grid gap-5 md:grid-cols-3">
              {references.map((r, i) => (
                <li key={r.id}>
                  <Reveal delay={i * 0.08} className="h-full">
                    <article className="border-gradient h-full rounded-2xl p-6">
                      <h4 className="text-lg">{r.title}</h4>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.summary}</p>
                    </article>
                  </Reveal>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
