"use strict";

/**
 * Thin Gemini (Google Generative Language API) client used by the demo gateway.
 * Uses OAuth access tokens from the shared Google OAuth store.
 */

const {
  loadGoogleOAuthTokens,
  saveGoogleOAuthTokens,
  isAccessTokenFresh,
} = require("./google-oauth-store");

const DEFAULT_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

const getGoogleOAuthClientConfig = (env = process.env) => {
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID?.trim() || "";
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || "";
  return { clientId, clientSecret, configured: Boolean(clientId && clientSecret) };
};

async function refreshAccessToken(tokens, env = process.env) {
  const { clientId, clientSecret, configured } = getGoogleOAuthClientConfig(env);
  if (!configured || !tokens.refreshToken) return tokens;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: tokens.refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Google token refresh failed (${response.status}): ${text.slice(0, 200)}`);
  }
  const json = await response.json();
  const accessToken = typeof json.access_token === "string" ? json.access_token : "";
  if (!accessToken) throw new Error("Google token refresh returned no access_token");
  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600;
  const next = saveGoogleOAuthTokens(
    {
      ...tokens,
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
      scope: typeof json.scope === "string" ? json.scope : tokens.scope,
      tokenType: typeof json.token_type === "string" ? json.token_type : tokens.tokenType,
      refreshToken: tokens.refreshToken,
    },
    env
  );
  return next;
}

async function resolveFreshTokens(env = process.env) {
  let tokens = loadGoogleOAuthTokens(env);
  if (!tokens) return null;
  if (isAccessTokenFresh(tokens)) return tokens;
  try {
    tokens = await refreshAccessToken(tokens, env);
  } catch (err) {
    console.warn("[gemini-client] refresh failed:", err instanceof Error ? err.message : err);
    return isAccessTokenFresh(tokens, 0) ? tokens : null;
  }
  return tokens;
}

function getGeminiConnectionStatus(env = process.env) {
  const tokens = loadGoogleOAuthTokens(env);
  const oauth = getGoogleOAuthClientConfig(env);
  if (!tokens) {
    return {
      connected: false,
      configured: oauth.configured,
      email: null,
      name: null,
      picture: null,
      model: DEFAULT_MODEL,
    };
  }
  return {
    connected: true,
    configured: oauth.configured,
    email: tokens.email || null,
    name: tokens.name || null,
    picture: tokens.picture || null,
    model: DEFAULT_MODEL,
    expiresAt: tokens.expiresAt || null,
  };
}

/**
 * Non-streaming Gemini completion. Returns assistant text or null if unavailable.
 */
async function generateGeminiReply({
  systemPrompt,
  userMessage,
  history = [],
  model = DEFAULT_MODEL,
  env = process.env,
}) {
  const tokens = await resolveFreshTokens(env);
  if (!tokens) return null;

  const contents = [];
  for (const entry of history) {
    const role = entry.role === "assistant" ? "model" : "user";
    const text = typeof entry.content === "string" ? entry.content : "";
    if (!text) continue;
    contents.push({ role, parts: [{ text }] });
  }
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const payload = {
    contents,
    ...(systemPrompt
      ? {
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
        }
      : {}),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  const url = `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Gemini generateContent failed (${response.status}): ${text.slice(0, 300)}`);
  }

  const json = await response.json();
  const parts = json?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("");
}

module.exports = {
  DEFAULT_MODEL,
  getGoogleOAuthClientConfig,
  getGeminiConnectionStatus,
  generateGeminiReply,
  resolveFreshTokens,
};
