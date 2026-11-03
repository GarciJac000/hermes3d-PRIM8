export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  // Allows calling the Gemini Generative Language API with the signed-in user.
  "https://www.googleapis.com/auth/generative-language",
].join(" ");

export const GOOGLE_OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_OAUTH_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export const DEFAULT_GEMINI_MODEL =
  (typeof process !== "undefined" && process.env.GEMINI_MODEL?.trim()) || "gemini-2.0-flash";

export type GoogleAuthStatus = {
  connected: boolean;
  configured: boolean;
  email: string | null;
  name: string | null;
  picture: string | null;
  model: string;
  expiresAt: number | null;
  comingSoonProviders: Array<"chatgpt" | "claude" | "grok">;
};

export const COMING_SOON_AI_PROVIDERS = ["chatgpt", "claude", "grok"] as const;

export const emptyGoogleAuthStatus = (configured = false): GoogleAuthStatus => ({
  connected: false,
  configured,
  email: null,
  name: null,
  picture: null,
  model: DEFAULT_GEMINI_MODEL,
  expiresAt: null,
  comingSoonProviders: [...COMING_SOON_AI_PROVIDERS],
});
