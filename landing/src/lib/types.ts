// Types alignés sur les schémas Pydantic du Core Global-IT-SS (app/modules/*/schemas.py), partie publique.

export type Lang = "fr" | "en";

export interface Pole {
  id: number;
  slug: string;
  position: number;
  name_fr: string;
  name_en: string;
  description_fr: string;
  description_en: string;
  is_active: boolean;
}

export type AppointmentStatus = "requested" | "confirmed" | "cancelled" | "done";

export interface Appointment {
  id: number;
  client_id: number | null;
  contact_name: string;
  contact_email: string;
  subject: string;
  notes: string | null;
  pole_id: number | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
}

export type ContentKind = "blog" | "page" | "realisation";

export interface ContentPublic {
  id: number;
  kind: ContentKind;
  slug: string;
  lang: Lang;
  title: string;
  summary: string;
  body: string;
  published_at: string | null;
}
