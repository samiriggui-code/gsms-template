import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("scripts/deploy-global-it-ss.sh", () => {
  it("warns when multiple running landing or frontend containers match the compose project", () => {
    const script = readFileSync(join(import.meta.dirname, "../../scripts/deploy-global-it-ss.sh"), "utf8");
    expect(script).toMatch(/warn_duplicate_service_containers landing/);
    expect(script).toMatch(/warn_duplicate_service_containers frontend/);
    expect(script).toMatch(/docker ps -q --filter "status=running" --filter "name=\$\{filter_name\}"/);
    expect(script).toMatch(/Traefik may round-robin mismatched/);
  });
});
