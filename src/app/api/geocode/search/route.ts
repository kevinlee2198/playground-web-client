import { NominatimProvider } from "@/lib/geocoding/nominatim-provider";
import type { GeocodeSearchResponse } from "@/lib/geocoding/types";
import { InProcessTokenBucketRateLimiter } from "@/lib/in-process-rate-limiter";
import { NextRequest, NextResponse } from "next/server";

const provider = new NominatimProvider();
const limiter = new InProcessTokenBucketRateLimiter(1, 1000);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json({
      suggestions: [],
    } satisfies GeocodeSearchResponse);
  }

  if (!limiter.tryAcquire()) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const suggestions = await provider.search(q.trim(), 5);
    return NextResponse.json({ suggestions } satisfies GeocodeSearchResponse);
  } catch (error) {
    console.error("Geocoding search failed:", error);
    return NextResponse.json(
      { error: "Geocoding service unavailable" },
      { status: 502 },
    );
  }
}
