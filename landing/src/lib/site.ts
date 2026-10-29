import type { Lang } from "./types";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
/** Application gsms (interface WeKnora) vers laquelle pointe le lien « Espace pro ». */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost").replace(/\/$/, "");
export const DEFAULT_CONTACT_EMAIL = "contact@globalitss.com";

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export interface ContactSettings {
  email: string;
  phone: string | null;
  hours: string | null;
}

/**
 * Coordonnées depuis les paramètres publics du Core.
 * Format du seed : `contact` = {email, phone} et `opening_hours` = {fr, en} ;
 * les clés plates `contact_email` / `contact_phone` sont aussi acceptées (elles priment).
 */
export function contactFromSettings(settings: Record<string, unknown>, lang: Lang): ContactSettings {
  const contact = obj(settings.contact);
  const hours = obj(settings.opening_hours);
  return {
    email: str(settings.contact_email) ?? str(contact.email) ?? DEFAULT_CONTACT_EMAIL,
    phone: str(settings.contact_phone) ?? str(contact.phone),
    hours: str(hours[lang]) ?? str(hours.fr) ?? str(settings.opening_hours),
  };
}
