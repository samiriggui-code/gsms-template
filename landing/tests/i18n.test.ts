import { describe, expect, it } from "vitest";

import { FALLBACK_POLES, dictionaries, isLang } from "@/lib/i18n";

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]));
  return typeof value;
}

describe("i18n", () => {
  it("fr et en ont exactement la même structure de clés", () => {
    expect(shape(dictionaries.en)).toEqual(shape(dictionaries.fr));
  });

  it("aucune chaîne vide", () => {
    const empties: string[] = [];
    const walk = (v: unknown, path: string) => {
      if (typeof v === "string" && v.trim() === "") empties.push(path);
      else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => walk(x, `${path}.${k}`));
    };
    walk(dictionaries, "dict");
    expect(empties).toEqual([]);
  });

  it("le repli statique contient les 9 pôles du Core", () => {
    expect(FALLBACK_POLES).toHaveLength(9);
    expect(new Set(FALLBACK_POLES.map((p) => p.slug)).size).toBe(9);
  });

  it("isLang", () => {
    expect(isLang("fr")).toBe(true);
    expect(isLang("de")).toBe(false);
  });
});
