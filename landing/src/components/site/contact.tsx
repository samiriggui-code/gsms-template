import { Clock, Mail, MapPin, Phone } from "lucide-react";

import { Reveal, SectionHeading } from "@/components/site/reveal";
import type { Dictionary } from "@/lib/i18n";

export interface ContactInfo {
  email: string;
  phone: string | null;
  hours?: string | null;
}

export function Contact({ t, info }: { t: Dictionary["contact"]; info: ContactInfo }) {
  const rows = [
    { icon: Mail, label: t.email, value: info.email, href: `mailto:${info.email}` },
    ...(info.phone ? [{ icon: Phone, label: t.phone, value: info.phone, href: `tel:${info.phone.replace(/\s/g, "")}` }] : []),
    { icon: Clock, label: t.hours, value: info.hours || t.hoursValue, href: undefined },
    { icon: MapPin, label: t.zone, value: t.zoneValue, href: undefined },
  ];
  return (
    <section id="contact" className="scroll-mt-20 pb-28 pt-12">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map(({ icon: Icon, label, value, href }, i) => (
            <li key={label}>
              <Reveal delay={i * 0.07} className="h-full">
                <div className="h-full rounded-2xl border bg-card/60 p-6">
                  <Icon className="mb-4 size-6 text-brand-cyan" strokeWidth={1.5} />
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
                  {href ? (
                    <a href={href} className="mt-2 block break-all text-lg hover:text-brand-cyan">
                      {value}
                    </a>
                  ) : (
                    <p className="mt-2 text-lg">{value}</p>
                  )}
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
