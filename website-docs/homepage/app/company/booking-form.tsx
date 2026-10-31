"use client";

import { FormEvent, useState } from "react";
import { API_URL, company, POLES } from "./data";
import s from "../home.module.css";

type Mode = "appointment" | "quote" | "question";

function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function BookingForm() {
  const t = company.booking;
  const [mode, setMode] = useState<Mode>("appointment");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const get = (k: string) => String(f.get(k) ?? "").trim();

    const date = mode === "appointment" ? get("date") : isoDate(1);
    const time = mode === "appointment" ? get("time") : "10:00";
    const subject = mode === "appointment" ? get("subject") : `${t.notePrefix[mode]} — ${get("subject") || get("name")}`;
    const poleSlug = get("pole");
    const notes = [get("message"), poleSlug ? `Pôle : ${poleSlug}` : ""].filter(Boolean).join("\n\n");

    setStatus("sending");
    setError("");
    try {
      const starts_at = `${date}T${time}:00`;
      const res = await fetch(`${API_URL}/api/v1/public/appointments`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_name: get("name"),
          contact_email: get("email"),
          subject,
          notes: notes || undefined,
          pole_id: null,
          starts_at,
          duration_minutes: Number(get("duration")) || 60,
        }),
      });
      if (!res.ok) {
        let msg = `Erreur ${res.status}`;
        try {
          const body = await res.json();
          if (typeof body.detail === "string") msg = body.detail;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      setStatus("done");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : t.errorGeneric);
    }
  }

  return (
    <form className={s.bookingForm} onSubmit={onSubmit}>
      <div className={s.bookingTabs} role="tablist" aria-label="Type de demande">
        {(Object.keys(t.tabs) as Mode[]).map(m => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={mode === m ? s.bookingTabActive : s.bookingTab}
            onClick={() => { setMode(m); setStatus("idle"); setError(""); }}
          >
            {t.tabs[m]}
          </button>
        ))}
      </div>
      <label>{t.fields.name}<input name="name" required autoComplete="name" /></label>
      <label>{t.fields.email}<input name="email" type="email" required autoComplete="email" /></label>
      <label>{t.fields.pole}
        <select name="pole" defaultValue="">
          <option value="">{t.fields.poleAny}</option>
          {POLES.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
        </select>
      </label>
      {mode === "appointment" && (
        <>
          <label>{t.fields.date}<input name="date" type="date" required min={isoDate(0)} defaultValue={isoDate(1)} /></label>
          <label>{t.fields.time}<input name="time" type="time" required defaultValue="10:00" /></label>
          <label>{t.fields.duration}
            <select name="duration" defaultValue="60">
              {Object.entries(t.durations).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </>
      )}
      <label>{t.fields.subject}<input name="subject" required /></label>
      <label>{t.fields.message}<textarea name="message" rows={4} /></label>
      <button className={s.primary} type="submit" disabled={status === "sending"}>
        {status === "sending" ? t.sending : t.submit[mode]}
      </button>
      {status === "done" && <p className={s.bookingSuccess} role="status">{t.success}</p>}
      {status === "error" && <p className={s.bookingError} role="alert">{error || t.errorGeneric}</p>}
    </form>
  );
}
