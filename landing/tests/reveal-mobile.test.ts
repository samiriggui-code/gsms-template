import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("Reveal mobile visibility", () => {
  it("forces gsms-motion-reveal visible below md in global CSS", () => {
    const css = readFileSync(join(import.meta.dirname, "../src/app/globals.css"), "utf8");
    expect(css).toMatch(/@media \(max-width: 767px\)/);
    expect(css).toMatch(/\.gsms-motion-reveal[\s\S]*opacity: 1 !important/);
  });

  it("Reveal component skips whileInView on max-md viewports", () => {
    const source = readFileSync(join(import.meta.dirname, "../src/components/site/reveal.tsx"), "utf8");
    expect(source).toMatch(/max-width: 767px/);
    expect(source).toMatch(/revealInstant \? \{ opacity: 1, y: 0 \}/);
    expect(source).toMatch(/delay: revealInstant \? 0 : delay/);
  });
});
