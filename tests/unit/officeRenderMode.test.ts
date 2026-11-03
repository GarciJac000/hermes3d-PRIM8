import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  isOfficeRenderMode,
  loadStoredOfficeRenderMode,
  OFFICE_RENDER_MODE_STORAGE_KEY,
  resolveInitialOfficeRenderMode,
  saveOfficeRenderMode,
  shouldPreferLowQualityFor3D,
} from "@/features/office/renderMode";
import { __resetWebGLProbeForTests } from "@/features/retro-office/core/graphicsQuality";

describe("officeRenderMode", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetWebGLProbeForTests();
    vi.restoreAllMocks();
  });

  it("validates render mode values", () => {
    expect(isOfficeRenderMode("3d")).toBe(true);
    expect(isOfficeRenderMode("2d")).toBe(true);
    expect(isOfficeRenderMode("vr")).toBe(false);
    expect(isOfficeRenderMode(null)).toBe(false);
  });

  it("returns null when nothing was stored", () => {
    expect(loadStoredOfficeRenderMode()).toBeNull();
  });

  it("round-trips the stored preference", () => {
    saveOfficeRenderMode("2d");
    expect(window.localStorage.getItem(OFFICE_RENDER_MODE_STORAGE_KEY)).toBe("2d");
    expect(loadStoredOfficeRenderMode()).toBe("2d");
    saveOfficeRenderMode("3d");
    expect(loadStoredOfficeRenderMode()).toBe("3d");
  });

  it("ignores corrupt stored values", () => {
    window.localStorage.setItem(OFFICE_RENDER_MODE_STORAGE_KEY, "banana");
    expect(loadStoredOfficeRenderMode()).toBeNull();
  });

  it("prefers the explicit user choice over hardware detection", () => {
    saveOfficeRenderMode("3d");
    expect(resolveInitialOfficeRenderMode()).toBe("3d");
    saveOfficeRenderMode("2d");
    expect(resolveInitialOfficeRenderMode()).toBe("2d");
  });

  it("falls back to 2d when WebGL is unavailable (jsdom has no WebGL)", () => {
    // In jsdom canvas.getContext returns null — only then do we force 2D.
    expect(resolveInitialOfficeRenderMode()).toBe("2d");
  });

  it("defaults to 3d when WebGL is available even if the renderer is software", async () => {
    vi.resetModules();
    __resetWebGLProbeForTests();
    vi.doMock("@/features/retro-office/core/graphicsQuality", async () => {
      const actual = await vi.importActual<
        typeof import("@/features/retro-office/core/graphicsQuality")
      >("@/features/retro-office/core/graphicsQuality");
      return {
        ...actual,
        detectWebGLAvailable: () => true,
        detectSoftwareWebGL: () => true,
        probeWebGLCapabilities: () => ({ available: true, software: true }),
      };
    });
    const { resolveInitialOfficeRenderMode: resolveMode, shouldPreferLowQualityFor3D: preferLow } =
      await import("@/features/office/renderMode");
    expect(resolveMode()).toBe("3d");
    expect(preferLow()).toBe(true);
    vi.doUnmock("@/features/retro-office/core/graphicsQuality");
    vi.resetModules();
  });

  it("exposes shouldPreferLowQualityFor3D from the software probe", () => {
    // jsdom: no GL → treated as not GPU-capable for quality defaults.
    expect(shouldPreferLowQualityFor3D()).toBe(true);
  });
});
