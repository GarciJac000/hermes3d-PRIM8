import { describe, expect, it } from "vitest";

import {
  createGoogleOAuthState,
  parseGoogleOAuthState,
} from "@/lib/google-auth/server";
import { emptyGoogleAuthStatus } from "@/lib/google-auth/config";

describe("google oauth state", () => {
  it("round-trips a signed state payload", () => {
    const state = createGoogleOAuthState("/office?tab=accounts");
    const parsed = parseGoogleOAuthState(state);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.returnTo).toBe("/office?tab=accounts");
    }
  });

  it("rejects tampered state", () => {
    const state = createGoogleOAuthState("/office");
    const tampered = `${state.slice(0, -4)}abcd`;
    const parsed = parseGoogleOAuthState(tampered);
    expect(parsed.ok).toBe(false);
  });

  it("exposes coming-soon providers on empty status", () => {
    const status = emptyGoogleAuthStatus(false);
    expect(status.connected).toBe(false);
    expect(status.comingSoonProviders).toEqual(["chatgpt", "claude", "grok"]);
  });
});
