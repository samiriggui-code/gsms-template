"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Reveal, SectionHeading } from "@/components/site/reveal";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api";
import type { Dictionary } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

type Mode = "appointment" | "quote" | "question";
export interface BookingPole {
  id: number;
  slug: string;
  label: string;
}

/** Date locale d'aujourd'hui + n jours, au format yyyy-mm-dd. */
function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function Booking({ lang, t, poles }: { lang: Lang; t: Dictionary["booking"]; poles: BookingPole[] }) {
  const [mode, setMode] = useState<Mode>("appointment");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const get = (k: string) => String(f.get(k) ?? "").trim();

    // Devis et questions passent par la demande de rendez-vous publique du Core (pas d'endpoint dédié) :
    // le type est porté par le sujet, le message par les notes. Créneau par défaut : demain 10 h.
    const date = mode === "appointment" ? get("date") : isoDate(1);
    const time = mode === "appointment" ? get("time") : "10:00";
    const subject = mode === "appointment" ? get("subject") : `${t.notePrefix[mode]} — ${get("subject") || get("name")}`;
    const poleId = Number(get("pole")) || null;

    setStatus("sending");
    setError("");
    try {
      await api.requestAppointment({
        contact_name: get("name"),
        contact_email: get("email"),
        subject,
        notes: get("message") || undefined,
        pole_id: poleId,
        starts_at: new Date(`${date}T${time}:00`).toISOString(),
        duration_minutes: mode === "appointment" ? Number(get("duration")) || 30 : 30,
      });
      setStatus("done");
      form.reset();
    } catch (err) {
      setError(err instanceof ApiError && err.status !== 0 ? err.message : t.errorGeneric);
      setStatus("error");
    }
  }

  const tabs: Mode[] = ["appointment", "quote", "question"];

  return (
    <section id="booking" className="relative scroll-mt-20 py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />
        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
          <Reveal>
            <div className="border-gradient rounded-3xl p-6 sm:p-9">
              <div role="tablist" aria-label={t.title} className="mb-8 inline-flex rounded-full border bg-muted/50 p-1">
                {tabs.map((m) => (
                  <button
                    key={m}
                    role="tab"
                    type="button"
                    aria-selected={mode === m}
                    onClick={() => {
                      setMode(m);
                      setStatus("idle");
                    }}
                    className={cn(
                      "rounded-full px-5 py-2 text-sm transition-all",
                      mode === m ? "bg-brand-gradient text-white shadow-lg" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.tabs[m]}
                  </button>
                ))}
              </div>

              {status === "done" ? (
                <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-400">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                  <p>{t.success}</p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t.fields.name}</Label>
                    <Input id="name" name="name" required maxLength={200} autoComplete="name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t.fields.email}</Label>
                    <Input id="email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pole">{t.fields.pole}</Label>
                    <Select id="pole" name="pole" defaultValue="">
                      <option value="">{t.fields.poleAny}</option>
                      {poles.map((p) => (
                        <option key={p.slug} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">{t.fields.subject}</Label>
                    <Input id="subject" name="subject" required={mode === "appointment"} maxLength={200} />
                  </div>
                  {mode === "appointment" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="date">{t.fields.date}</Label>
                        <Input id="date" name="date" type="date" required min={isoDate(1)} defaultValue={isoDate(2)} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="time">{t.fields.time}</Label>
                          <Input id="time" name="time" type="time" required defaultValue="10:00" min="08:00" max="19:00" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="duration">{t.fields.duration}</Label>
                          <Select id="duration" name="duration" defaultValue="30">
                            {Object.entries(t.durations).map(([v, label]) => (
                              <option key={v} value={v}>
                                {label}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="message">{t.fields.message}</Label>
                    <Textarea id="message" name="message" required={mode !== "appointment"} maxLength={4000} />
                  </div>
                  {status === "error" && (
                    <p role="alert" className="text-sm text-red-400 sm:col-span-2">
                      {error}
                    </p>
                  )}
                  <div className="sm:col-span-2">
                    <Button type="submit" size="lg" disabled={status === "sending"} data-lang={lang}>
                      {status === "sending" && <Loader2 className="animate-spin" />}
                      {status === "sending" ? t.sending : t.submit[mode]}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <aside className="h-full rounded-3xl border bg-card/40 p-8 backdrop-blur">
              <h3 className="mb-6 text-lg">{t.side.title}</h3>
              <ol className="space-y-6">
                {t.side.steps.map((s, i) => (
                  <li key={s} className="flex gap-4">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient font-display text-sm text-white">{i + 1}</span>
                    <p className="pt-1 text-muted-foreground">{s}</p>
                  </li>
                ))}
              </ol>
            </aside>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
