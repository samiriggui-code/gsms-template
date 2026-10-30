import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("Reveal mobile visibility", () => {
  it("forces gsms-motion-reveal visible below md in global CSS", () => {
    const css = readFileSync(join(import.meta.dirname, "../src/app/globals.css"), "utf8");
    const mobileIdx = css.indexOf("@media (max-width: 768px)");
    expect(mobileIdx).toBeGreaterThan(-1);
    const mobileRule = css.slice(mobileIdx, mobileIdx + 280);
    expect(mobileRule).toMatch(/\.gsms-motion-reveal[\s\S]*opacity: 1 !important/);
  });

  it("Reveal uses instant landing motion instead of whileInView on constrained viewports", () => {
    const source = readFileSync(join(import.meta.dirname, "../src/components/site/reveal.tsx"), "utf8");
    expect(source).toMatch(/useInstantLandingMotion/);
    expect(source).toMatch(/if \(instant \|\| reduceMotion\)/);
  });

  it("instant motion hook treats max-width 768px as instant", () => {
    const hook = readFileSync(join(import.meta.dirname, "../src/hooks/use-instant-landing-motion.ts"), "utf8");
    expect(hook).toMatch(/max-width: 768px/);
  });
});
