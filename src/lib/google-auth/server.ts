import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import {
  DEFAULT_GEMINI_MODEL,
  GOOGLE_OAUTH_AUTHORIZE_URL,
  GOOGLE_OAUTH_SCOPES,
  GOOGLE_OAUTH_TOKEN_URL,
  GOOGLE_OAUTH_USERINFO_URL,
  emptyGoogleAuthStatus,
  type GoogleAuthStatus,
} from "@/lib/google-auth/config";
import {
  clearGoogleOAuthTokens,
  loadGoogleOAuthTokens,
  saveGoogleOAuthTokens,
} from "@/lib/google-auth/tokenStore";

export const getGoogleOAuthEnvConfig = () => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || "";
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() || "";
  return {
    clientId,
    clientSecret,
    redirectUri,
    configured: Boolean(clientId && clientSecret),
  };
};

export const resolveGoogleOAuthRedirectUri = (requestOrigin: string): string => {
  const configured = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (configured) return configured;
  return `${requestOrigin.replace(/\/+$/, "")}/api/auth/google/callback`;
};

const stateSecret = () =>
  process.env.GOOGLE_OAUTH_STATE_SECRET?.trim() ||
  process.env.STUDIO_ACCESS_TOKEN?.trim() ||
  process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ||
  "hermes3d-google-oauth-dev";

export const createGoogleOAuthState = (returnTo = "/office") => {
  const nonce = randomBytes(16).toString("hex");
  const payload = Buffer.from(
    JSON.stringify({ nonce, returnTo, ts: Date.now() }),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
};

export const parseGoogleOAuthState = (
  state: string,
): { ok: true; returnTo: string } | { ok: false; error: string } => {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return { ok: false, error: "Invalid OAuth state." };
  const expected = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: "OAuth state signature mismatch." };
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      returnTo?: string;
      ts?: number;
    };
    if (typeof parsed.ts === "number" && Date.now() - parsed.ts > 15 * 60_000) {
      return { ok: false, error: "OAuth state expired." };
    }
    const returnTo =
      typeof parsed.returnTo === "string" && parsed.returnTo.startsWith("/")
        ? parsed.returnTo
        : "/office";
    return { ok: true, returnTo };
  } catch {
    return { ok: false, error: "Could not parse OAuth state." };
  }
};

export const buildGoogleAuthorizeUrl = (params: {
  clientId: string;
  redirectUri: string;
  state: string;
}) => {
  const query = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    scope: GOOGLE_OAUTH_SCOPES,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state: params.state,
  });
  return `${GOOGLE_OAUTH_AUTHORIZE_URL}?${query.toString()}`;
};

export const exchangeGoogleAuthCode = async (params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}) => {
  const body = new URLSearchParams({
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: "authorization_code",
  });
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Google token exchange failed (${response.status}): ${text.slice(0, 240)}`);
  }
  return (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };
};

export const fetchGoogleUserInfo = async (accessToken: string) => {
  const response = await fetch(GOOGLE_OAUTH_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    return { email: "", name: "", picture: "" };
  }
  const json = (await response.json()) as {
    email?: string;
    name?: string;
    picture?: string;
  };
  return {
    email: typeof json.email === "string" ? json.email : "",
    name: typeof json.name === "string" ? json.name : "",
    picture: typeof json.picture === "string" ? json.picture : "",
  };
};

export const persistGoogleTokensFromExchange = async (params: {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  tokenType?: string;
}) => {
  const user = await fetchGoogleUserInfo(params.accessToken);
  const existing = loadGoogleOAuthTokens();
  return saveGoogleOAuthTokens({
    accessToken: params.accessToken,
    refreshToken: params.refreshToken || existing?.refreshToken || "",
    expiresAt: Date.now() + (params.expiresIn ?? 3600) * 1000,
    scope: params.scope || "",
    tokenType: params.tokenType || "Bearer",
    email: user.email,
    name: user.name,
    picture: user.picture,
  });
};

export const getGoogleAuthStatus = (): GoogleAuthStatus => {
  const { configured } = getGoogleOAuthEnvConfig();
  const tokens = loadGoogleOAuthTokens();
  if (!tokens?.accessToken) {
    return emptyGoogleAuthStatus(configured);
  }
  return {
    connected: true,
    configured,
    email: tokens.email || null,
    name: tokens.name || null,
    picture: tokens.picture || null,
    model: DEFAULT_GEMINI_MODEL,
    expiresAt: tokens.expiresAt || null,
    comingSoonProviders: ["chatgpt", "claude", "grok"],
  };
};

export const disconnectGoogleAuth = () => {
  clearGoogleOAuthTokens();
};

export { DEFAULT_GEMINI_MODEL };
