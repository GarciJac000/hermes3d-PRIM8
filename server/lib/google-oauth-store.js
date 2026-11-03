"use strict";

/**
 * Shared Google OAuth token store for Studio API routes and the demo gateway.
 * Tokens live under ~/.hermes/hermes3d/google-oauth.json (or HERMES_STATE_DIR).
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const STATE_DIRNAME = ".hermes";
const APP_DIRNAME = "hermes3d";
const TOKEN_FILENAME = "google-oauth.json";

const resolveStateDir = (env = process.env) => {
  const override = typeof env.HERMES_STATE_DIR === "string" ? env.HERMES_STATE_DIR.trim() : "";
  if (override) {
    return path.resolve(override.replace(/^~(?=$|[\\/])/, os.homedir()));
  }
  return path.join(os.homedir() || os.tmpdir(), STATE_DIRNAME);
};

const resolveTokenPath = (env = process.env) =>
  path.join(resolveStateDir(env), APP_DIRNAME, TOKEN_FILENAME);

const readJsonSafe = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeJsonSafe = (filePath, value) => {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, filePath);
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // ignore chmod failures on platforms that don't support it
  }
};

/**
 * @typedef {object} GoogleOAuthTokens
 * @property {string} accessToken
 * @property {string} [refreshToken]
 * @property {number} [expiresAt]
 * @property {string} [scope]
 * @property {string} [tokenType]
 * @property {string} [email]
 * @property {string} [name]
 * @property {string} [picture]
 * @property {string} [provider] Always "google" / gemini lane
 * @property {number} [updatedAt]
 */

const loadGoogleOAuthTokens = (env = process.env) => {
  const filePath = resolveTokenPath(env);
  const raw = readJsonSafe(filePath);
  if (!raw) return null;
  const accessToken = typeof raw.accessToken === "string" ? raw.accessToken.trim() : "";
  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: typeof raw.refreshToken === "string" ? raw.refreshToken : "",
    expiresAt: typeof raw.expiresAt === "number" ? raw.expiresAt : 0,
    scope: typeof raw.scope === "string" ? raw.scope : "",
    tokenType: typeof raw.tokenType === "string" ? raw.tokenType : "Bearer",
    email: typeof raw.email === "string" ? raw.email : "",
    name: typeof raw.name === "string" ? raw.name : "",
    picture: typeof raw.picture === "string" ? raw.picture : "",
    provider: "google",
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0,
  };
};

const saveGoogleOAuthTokens = (tokens, env = process.env) => {
  const filePath = resolveTokenPath(env);
  const next = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken || "",
    expiresAt: tokens.expiresAt || 0,
    scope: tokens.scope || "",
    tokenType: tokens.tokenType || "Bearer",
    email: tokens.email || "",
    name: tokens.name || "",
    picture: tokens.picture || "",
    provider: "google",
    updatedAt: Date.now(),
  };
  writeJsonSafe(filePath, next);
  return next;
};

const clearGoogleOAuthTokens = (env = process.env) => {
  const filePath = resolveTokenPath(env);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore
  }
};

const isAccessTokenFresh = (tokens, skewMs = 60_000) => {
  if (!tokens?.accessToken) return false;
  if (!tokens.expiresAt) return true;
  return tokens.expiresAt - skewMs > Date.now();
};

module.exports = {
  resolveTokenPath,
  loadGoogleOAuthTokens,
  saveGoogleOAuthTokens,
  clearGoogleOAuthTokens,
  isAccessTokenFresh,
};
