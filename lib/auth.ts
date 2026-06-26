import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "goclaim_session";
const JWT_EXPIRY = "30d";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  sub: string;
  userId: string;
};

export async function signJwt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub.toLowerCase())
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getJwtSecret());
}

export async function verifyJwt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const sub = payload.sub;
    const userId = payload.userId;
    if (typeof sub !== "string" || typeof userId !== "string") {
      return null;
    }
    return { sub, userId };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJwt(token);
}

export function sessionCookieOptions(token: string) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export function clearSessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

export { COOKIE_NAME };
