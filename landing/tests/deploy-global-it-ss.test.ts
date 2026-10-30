import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("scripts/deploy-global-it-ss.sh", () => {
  it("warns when multiple running landing or frontend containers match the compose project", () => {
    const script = readFileSync(join(import.meta.dirname, "../../scripts/deploy-global-it-ss.sh"), "utf8");
    expect(script).toMatch(/warn_duplicate_service_containers landing/);
    expect(script).toMatch(/warn_duplicate_service_containers frontend/);
    expect(script).toMatch(/label=com\.docker\.compose\.project=\$\{PROJECT_NAME\}/);
    expect(script).toMatch(/label=com\.docker\.compose\.service=\$\{service\}/);
    expect(script).toMatch(/Traefik may round-robin mismatched/);
    expect(script).toMatch(/warn_traefik_router_containers gsms-landing/);
    expect(script).toMatch(/warn_traefik_router_containers gsms-app/);
    expect(script).toMatch(/label=traefik\.http\.routers\.\$\{router\}\.rule/);
    expect(script).toMatch(/WARNING \(minor\):.*Traefik router/);
    expect(script).toMatch(/resolve_traefik_network_for_check/);
    expect(script).toMatch(/config --format json/);
    expect(script).toMatch(/TRAEFIK_NETWORK_FOR_CHECK/);
    expect(script).toMatch(/network=\$\{TRAEFIK_NETWORK_FOR_CHECK\}/);
    expect(script).not.toMatch(/TRAEFIK_NETWORK="\$\(/);
  });
});
