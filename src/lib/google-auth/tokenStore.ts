import fs from "node:fs";
import path from "node:path";

import { resolveStateDir } from "@/lib/hermes/paths";

const APP_DIRNAME = "hermes3d";
const TOKEN_FILENAME = "google-oauth.json";

export type GoogleOAuthTokenRecord = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
  tokenType: string;
  email: string;
  name: string;
  picture: string;
  provider: "google";
  updatedAt: number;
};

export const resolveGoogleOAuthTokenPath = (
  env: NodeJS.ProcessEnv = process.env,
): string => path.join(resolveStateDir(env), APP_DIRNAME, TOKEN_FILENAME);

const readJsonSafe = (filePath: string): Record<string, unknown> | null => {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
};

const writeJsonSafe = (filePath: string, value: unknown) => {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, filePath);
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // ignore
  }
};

export const loadGoogleOAuthTokens = (
  env: NodeJS.ProcessEnv = process.env,
): GoogleOAuthTokenRecord | null => {
  const raw = readJsonSafe(resolveGoogleOAuthTokenPath(env));
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

export const saveGoogleOAuthTokens = (
  tokens: Omit<GoogleOAuthTokenRecord, "provider" | "updatedAt"> &
    Partial<Pick<GoogleOAuthTokenRecord, "provider" | "updatedAt">>,
  env: NodeJS.ProcessEnv = process.env,
): GoogleOAuthTokenRecord => {
  const next: GoogleOAuthTokenRecord = {
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
  writeJsonSafe(resolveGoogleOAuthTokenPath(env), next);
  return next;
};

export const clearGoogleOAuthTokens = (env: NodeJS.ProcessEnv = process.env) => {
  const filePath = resolveGoogleOAuthTokenPath(env);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore
  }
};

export const isGoogleAccessTokenFresh = (
  tokens: GoogleOAuthTokenRecord | null,
  skewMs = 60_000,
): boolean => {
  if (!tokens?.accessToken) return false;
  if (!tokens.expiresAt) return true;
  return tokens.expiresAt - skewMs > Date.now();
};
