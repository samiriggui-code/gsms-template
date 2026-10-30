import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

describe("Next.js standalone Docker image", () => {
  it("builds with output standalone", () => {
    expect(nextConfig.output).toBe("standalone");
  });

  it("Dockerfile copies standalone server and _next/static into the runtime image", () => {
    const dockerfile = readFileSync(join(import.meta.dirname, "../Dockerfile"), "utf8");
    expect(dockerfile).toMatch(/COPY --from=builder.*\/app\/\.next\/standalone/);
    expect(dockerfile).toMatch(/COPY --from=builder.*\/app\/\.next\/static \.\/\.next\/static/);
    expect(dockerfile).toMatch(/Standalone output excludes hashed chunks/);
    expect(dockerfile).toMatch(/CMD \["node", "server\.js"\]/);
  });
});
