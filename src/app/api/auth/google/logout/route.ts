import { NextResponse } from "next/server";

import { disconnectGoogleAuth, getGoogleAuthStatus } from "@/lib/google-auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  disconnectGoogleAuth();
  return NextResponse.json({ ok: true, ...getGoogleAuthStatus() });
}
