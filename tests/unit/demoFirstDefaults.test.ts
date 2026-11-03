import { describe, expect, it } from "vitest";

import { resolveStudioGatewayProfiles } from "@/lib/studio/settings";

describe("demo-first gateway defaults", () => {
  it("defaults to the demo adapter when no gateway settings exist", () => {
    const resolved = resolveStudioGatewayProfiles({ gateway: null, localDefaults: null });
    expect(resolved.selectedAdapterType).toBe("demo");
    expect(resolved.activeProfile.url).toContain("localhost:18789");
  });

  it("prefers explicit hermes settings when present", () => {
    const resolved = resolveStudioGatewayProfiles({
      gateway: {
        url: "ws://localhost:18789",
        token: "secret",
        adapterType: "hermes",
      },
      localDefaults: null,
    });
    expect(resolved.selectedAdapterType).toBe("hermes");
  });

  it("uses local demo defaults when provided", () => {
    const resolved = resolveStudioGatewayProfiles({
      gateway: null,
      localDefaults: {
        url: "ws://localhost:18789",
        token: "",
        adapterType: "demo",
        profiles: {
          demo: { url: "ws://localhost:18789", token: "" },
        },
      },
    });
    expect(resolved.selectedAdapterType).toBe("demo");
    expect(resolved.activeProfile.url).toBe("ws://localhost:18789");
  });
});
