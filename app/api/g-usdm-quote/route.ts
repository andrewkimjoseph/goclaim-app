import { NextRequest } from "next/server";
import {
  getQuoteAllowedOrigins,
  quoteCorsHeaders,
  quoteJsonResponse,
} from "@/lib/http/quoteCors";
import { quoteGdWeiToUsdm } from "@/lib/onchain/quoteGdToUsdm";

const MAX_AMOUNTS = 64;

type QuoteRequestBody = {
  amountsWei?: unknown;
};

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("Origin");
  const allowedOrigins = getQuoteAllowedOrigins();

  return new Response(null, {
    status: 204,
    headers: quoteCorsHeaders(origin, allowedOrigins),
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("Origin");
  const allowedOrigins = getQuoteAllowedOrigins();

  try {
    const body = (await request.json()) as QuoteRequestBody;
    if (!Array.isArray(body.amountsWei)) {
      return quoteJsonResponse(
        { error: "amountsWei must be an array of wei strings" },
        400,
        origin,
        allowedOrigins,
      );
    }

    if (body.amountsWei.length === 0 || body.amountsWei.length > MAX_AMOUNTS) {
      return quoteJsonResponse(
        { error: `amountsWei must contain 1 to ${MAX_AMOUNTS} values` },
        400,
        origin,
        allowedOrigins,
      );
    }

    const amountsWei = body.amountsWei.map((value) => String(value ?? "0"));
    const quotes = await quoteGdWeiToUsdm(amountsWei);

    return quoteJsonResponse({ quotes }, 200, origin, allowedOrigins);
  } catch (error) {
    console.error("g-usdm-quote API failed", error);
    return quoteJsonResponse(
      { error: "Failed to quote G$→USDm" },
      500,
      origin,
      allowedOrigins,
    );
  }
}
