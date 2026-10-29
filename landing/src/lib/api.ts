// Client HTTP public du Core FastAPI Global-IT-SS (/api/v1). La landing n'appelle que les routes publiques, sans jeton.

import type { Appointment, ContentPublic, Lang, Pole } from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const BASE = `${API_URL}/api/v1`;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  revalidate?: number;
}

/** Extrait un message lisible du `detail` FastAPI (chaîne ou liste d'erreurs de validation). */
function messageFrom(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : null))
      .filter(Boolean);
    if (msgs.length) return msgs.join(" ; ");
  }
  return fallback;
}

async function raw(path: string, opts: RequestOptions = {}): Promise<Response> {
  const { method = "GET", body, query, revalidate } = opts;
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      ...(revalidate !== undefined ? { next: { revalidate } } : { cache: "no-store" as const }),
    });
  } catch {
    throw new ApiError(0, "Le serveur est injoignable.");
  }
  if (!res.ok) {
    let detail: unknown;
    try {
      detail = (await res.json()).detail;
    } catch {
      /* corps non JSON */
    }
    throw new ApiError(res.status, messageFrom(detail, `Erreur ${res.status}`));
  }
  return res;
}

export async function request<T>(path: string, opts?: RequestOptions): Promise<T> {
  const res = await raw(path, opts);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Données optionnelles pour le rendu public : si le Core est absent, on retombe sur `fallback`. */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export const api = {
  poles: (revalidate = 300) => safe(() => request<Pole[]>("/poles", { revalidate }), [] as Pole[]),
  publicContents: (lang: Lang, kind?: string, revalidate = 300) =>
    safe(
      () => request<ContentPublic[]>("/public/contents", { query: { lang, kind, limit: 6 }, revalidate }),
      [] as ContentPublic[],
    ),
  publicSettings: (revalidate = 300) =>
    safe(() => request<Record<string, unknown>>("/settings/public", { revalidate }), {} as Record<string, unknown>),
  requestAppointment: (payload: {
    contact_name: string;
    contact_email: string;
    subject: string;
    notes?: string;
    pole_id?: number | null;
    starts_at: string;
    duration_minutes?: number;
  }) => request<Appointment>("/public/appointments", { method: "POST", body: payload }),
};
