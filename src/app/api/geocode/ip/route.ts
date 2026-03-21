import { NextResponse } from "next/server";

interface IpInfoResponse {
  city?: string;
  region?: string;
  country?: string;
  loc?: string; // "lat,lng"
}

export interface IpGeocodeResponse {
  latitude: number;
  longitude: number;
  locationName: string;
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    // Extract client IP from x-forwarded-for (Vercel/proxy) or fallback
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : null;

    // Validate IP format to prevent URL injection via crafted x-forwarded-for
    const IP_REGEX = /^(?:\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]+$/;
    if (!ip || !IP_REGEX.test(ip)) {
      return NextResponse.json(
        { error: "Could not determine client IP" },
        { status: 400 },
      );
    }

    const token = process.env.IPINFO_TOKEN;
    const url = token
      ? `https://ipinfo.io/${ip}?token=${token}`
      : `https://ipinfo.io/${ip}/json`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "IP geolocation service unavailable" },
        { status: 502 },
      );
    }

    const data: IpInfoResponse = await response.json();

    if (!data.loc) {
      return NextResponse.json(
        { error: "No location data for this IP" },
        { status: 404 },
      );
    }

    const [latStr, lngStr] = data.loc.split(",");
    const latitude = Number(latStr);
    const longitude = Number(lngStr);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { error: "Invalid coordinates from IP service" },
        { status: 502 },
      );
    }

    // Build location name: "City, Region" or "City, Country" or "Country"
    const parts = [data.city, data.region ?? data.country].filter(Boolean);
    const locationName = parts.join(", ") || "Unknown";

    const result: IpGeocodeResponse = { latitude, longitude, locationName };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "IP geolocation failed" },
      { status: 502 },
    );
  }
}
