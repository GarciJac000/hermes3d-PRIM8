import { NextResponse } from "next/server";

import {
  buildGoogleAuthorizeUrl,
  createGoogleOAuthState,
  getGoogleOAuthEnvConfig,
  resolveGoogleOAuthRedirectUri,
} from "@/lib/google-auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { clientId, clientSecret, configured } = getGoogleOAuthEnvConfig();
  if (!configured || !clientId || !clientSecret) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.",
      },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") || "/office";
  const origin = `${url.protocol}//${url.host}`;
  const redirectUri = resolveGoogleOAuthRedirectUri(origin);
  const state = createGoogleOAuthState(returnTo.startsWith("/") ? returnTo : "/office");
  const authorizeUrl = buildGoogleAuthorizeUrl({
    clientId,
    redirectUri,
    state,
  });

  return NextResponse.redirect(authorizeUrl);
}
