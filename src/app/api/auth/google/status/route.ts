import { NextResponse } from "next/server";

import { getGoogleAuthStatus } from "@/lib/google-auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, ...getGoogleAuthStatus() });
}
