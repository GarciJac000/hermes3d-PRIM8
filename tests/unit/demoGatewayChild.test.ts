import { describe, expect, it } from "vitest";

import { shouldAutoStartDemoGateway } from "../../server/lib/demo-gateway-child.js";

describe("shouldAutoStartDemoGateway", () => {
  it("defaults to true in dev", () => {
    expect(shouldAutoStartDemoGateway({}, { dev: true })).toBe(true);
  });

  it("defaults to false in production unless adapter is demo", () => {
    expect(shouldAutoStartDemoGateway({}, { dev: false })).toBe(false);
    expect(
      shouldAutoStartDemoGateway(
        { HERMES3D_GATEWAY_ADAPTER_TYPE: "demo" },
        { dev: false },
      ),
    ).toBe(true);
  });

  it("honors explicit off switch", () => {
    expect(
      shouldAutoStartDemoGateway(
        { HERMES3D_AUTO_START_DEMO: "false" },
        { dev: true },
      ),
    ).toBe(false);
  });
});
