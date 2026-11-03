import { NextResponse } from "next/server";

import {
  exchangeGoogleAuthCode,
  getGoogleOAuthEnvConfig,
  parseGoogleOAuthState,
  persistGoogleTokensFromExchange,
  resolveGoogleOAuthRedirectUri,
} from "@/lib/google-auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redirectWithError = (origin: string, returnTo: string, message: string) => {
  const target = new URL(returnTo, origin);
  target.searchParams.set("google_auth", "error");
  target.searchParams.set("google_auth_error", message.slice(0, 180));
  return NextResponse.redirect(target);
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const oauthError = url.searchParams.get("error");

  const stateResult = parseGoogleOAuthState(state || ".");
  const returnTo = stateResult.ok ? stateResult.returnTo : "/office";

  if (oauthError) {
    return redirectWithError(origin, returnTo, oauthError);
  }
  if (!stateResult.ok) {
    return redirectWithError(origin, returnTo, stateResult.error);
  }
  if (!code) {
    return redirectWithError(origin, returnTo, "Missing authorization code.");
  }

  const { clientId, clientSecret, configured } = getGoogleOAuthEnvConfig();
  if (!configured || !clientId || !clientSecret) {
    return redirectWithError(origin, returnTo, "Google OAuth is not configured on the server.");
  }

  try {
    const redirectUri = resolveGoogleOAuthRedirectUri(origin);
    const tokenPayload = await exchangeGoogleAuthCode({
      code,
      redirectUri,
      clientId,
      clientSecret,
    });
    const accessToken = tokenPayload.access_token?.trim() || "";
    if (!accessToken) {
      return redirectWithError(origin, returnTo, "Google did not return an access token.");
    }
    await persistGoogleTokensFromExchange({
      accessToken,
      refreshToken: tokenPayload.refresh_token,
      expiresIn: tokenPayload.expires_in,
      scope: tokenPayload.scope,
      tokenType: tokenPayload.token_type,
    });
    const target = new URL(returnTo, origin);
    target.searchParams.set("google_auth", "connected");
    return NextResponse.redirect(target);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google sign-in failed.";
    return redirectWithError(origin, returnTo, message);
  }
}
