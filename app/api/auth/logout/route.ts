import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearSessionCookieOptions } from "@/lib/auth";

export async function POST() {
  cookies().set(clearSessionCookieOptions());
  return NextResponse.json({ ok: true });
}
