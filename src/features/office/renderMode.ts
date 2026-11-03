// Office renderer preference: immersive 3D scene vs. lightweight 2D pixel scene.
// Persisted in localStorage so the choice survives reloads.

import {
  detectWebGLAvailable,
  detectSoftwareWebGL,
} from "@/features/retro-office/core/graphicsQuality";

export type OfficeRenderMode = "3d" | "2d";

export const OFFICE_RENDER_MODE_STORAGE_KEY = "hermes-office-render-mode-v1";

export const OFFICE_RENDER_MODE_OPTIONS: Array<{
  id: OfficeRenderMode;
  label: string;
  description: string;
}> = [
  {
    id: "3d",
    label: "3D immersive",
    description: "Recommended. Full Three.js office with motion, lighting, and atmosphere.",
  },
  {
    id: "2d",
    label: "2D pixel",
    description: "Low-power fallback. Gather-style pixel office when WebGL is unavailable.",
  },
];

export const isOfficeRenderMode = (value: unknown): value is OfficeRenderMode =>
  value === "3d" || value === "2d";

/** The explicit user choice, or null when the user never picked one. */
export const loadStoredOfficeRenderMode = (): OfficeRenderMode | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(OFFICE_RENDER_MODE_STORAGE_KEY);
    if (isOfficeRenderMode(stored)) return stored;
  } catch {
    // Storage unavailable (private mode, etc.) — fall through to default.
  }
  return null;
};

/**
 * The mode the office should boot with: the user's stored choice, or a
 * hardware-appropriate default.
 *
 * Prefer 3D whenever a WebGL context can be created (including software
 * rasterizers like SwiftShader). Only force 2D when WebGL is unavailable;
 * software GL pairs with the "low" graphics quality preset instead.
 */
export const resolveInitialOfficeRenderMode = (): OfficeRenderMode => {
  const stored = loadStoredOfficeRenderMode();
  if (stored) return stored;
  return detectWebGLAvailable() ? "3d" : "2d";
};

/**
 * Whether the boot path should prefer low graphics quality for a 3D mount
 * (software rasterizer). Stored quality still wins when the user picked one.
 */
export const shouldPreferLowQualityFor3D = (): boolean => detectSoftwareWebGL();

export const saveOfficeRenderMode = (mode: OfficeRenderMode) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OFFICE_RENDER_MODE_STORAGE_KEY, mode);
  } catch {
    // Best effort only.
  }
};
