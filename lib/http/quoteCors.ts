import { copy } from "@/lib/copy";

const LOCAL_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:3000",
];

export function getQuoteAllowedOrigins(): string[] {
  const marketingSite =
    process.env.NEXT_PUBLIC_MARKETING_SITE_URL?.trim() || copy.links.websiteUrl;
  return [...new Set([marketingSite, ...LOCAL_DEV_ORIGINS])];
}

export function quoteCorsHeaders(origin: string | null, allowedOrigins: string[]): HeadersInit {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }

  return headers;
}

export function quoteJsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
  allowedOrigins: string[],
): Response {
  return Response.json(body, {
    status,
    headers: {
      ...quoteCorsHeaders(origin, allowedOrigins),
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
}
