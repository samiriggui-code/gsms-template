import { vi } from "vitest";

export interface MockRoute {
  match: RegExp | string;
  method?: string;
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

/** Remplace `fetch` par un routeur simulé ; retourne le mock pour inspecter les appels. */
export function mockApi(routes: MockRoute[]) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const route = routes.find((r) => (r.method ?? "GET") === method && (typeof r.match === "string" ? url.includes(r.match) : r.match.test(url)));
    if (!route) return new Response(JSON.stringify({ detail: `non simulé : ${method} ${url}` }), { status: 599 });
    const status = route.status ?? 200;
    return new Response(status === 204 ? null : JSON.stringify(route.body ?? {}), {
      status,
      headers: { "Content-Type": "application/json", ...route.headers },
    });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

export const lastCall = (fn: ReturnType<typeof mockApi>, method: string, part: string) => {
  const call = [...fn.mock.calls].reverse().find(([u, i]) => String(u).includes(part) && (i?.method ?? "GET") === method);
  if (!call) throw new Error(`Aucun appel ${method} ${part}`);
  return { url: String(call[0]), init: call[1] as RequestInit, json: call[1]?.body ? JSON.parse(String(call[1].body)) : undefined };
};

export const POLES = [
  { id: 1, slug: "infogerance", position: 0, name_fr: "Infogérance", name_en: "Managed IT services", description_fr: "Gestion du parc.", description_en: "Estate management.", is_active: true },
  { id: 2, slug: "cloud", position: 3, name_fr: "Cloud", name_en: "Cloud", description_fr: "Migration cloud.", description_en: "Cloud migration.", is_active: true },
];

export const CLIENT = {
  id: 7,
  kind: "entreprise",
  name: "Alice Martin",
  company: "Martin SARL",
  email: "alice@martin.fr",
  phone: "0102030405",
  notes: null,
  created_at: "2026-10-01T10:00:00Z",
};
