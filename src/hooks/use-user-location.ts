"use client";

import type { IpGeocodeResponse } from "@/app/api/geocode/ip/route";
import { isValidCoordinates } from "@/lib/location-detection";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface UseUserLocationOptions {
  /** If true, skip detection (e.g., URL already has coords). */
  skip?: boolean;
}

interface UseUserLocationResult {
  /** True when detection has finished (regardless of outcome). */
  completed: boolean;
}

/**
 * Detects user location via Browser Geolocation → IP fallback.
 * When a location is detected, updates URL search params (lat, lng, loc)
 * which triggers a Server Component re-render.
 *
 * Returns `{ completed }` so the caller can distinguish "still detecting"
 * from "detection finished, no location found".
 *
 * Does NOT run if:
 * - `skip` is true (URL already has location)
 * - Detection has already run in this component instance
 */
export function useUserLocation({
  skip = false,
}: UseUserLocationOptions = {}): UseUserLocationResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const detectionRan = useRef(false);
  const [completed, setCompleted] = useState(skip);

  useEffect(() => {
    if (skip || detectionRan.current) return;
    detectionRan.current = true;

    let cancelled = false;

    async function detect() {
      // Tier 1: Browser geolocation
      const browserLoc = await detectBrowserLocation();
      if (!cancelled && browserLoc) {
        updateUrlWithLocation(browserLoc.latitude, browserLoc.longitude, null);
        setCompleted(true);
        return;
      }

      // Tier 2: IP-based fallback
      const ipLoc = await detectIpLocation();
      if (!cancelled && ipLoc) {
        updateUrlWithLocation(ipLoc.latitude, ipLoc.longitude, ipLoc.locationName);
        setCompleted(true);
        return;
      }

      // Tier 3: No location — mark as completed, page stays in "Games everywhere" mode
      if (!cancelled) {
        setCompleted(true);
      }
    }

    function updateUrlWithLocation(lat: number, lng: number, loc: string | null) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("lat", lat.toFixed(4));
      params.set("lng", lng.toFixed(4));
      if (loc) {
        params.set("loc", loc);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }

    detect();

    return () => {
      cancelled = true;
    };
  // Only run once on mount — deps are stable refs or skip flag
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip]);

  return { completed };
}

async function detectBrowserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;

  // Check permission state to avoid re-prompting after denial (EC#11)
  // Safari doesn't support permissions.query for geolocation — try-catch handles this
  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    if (permission.state === "denied") return null;
  } catch {
    // permissions.query not supported (Safari) — proceed to getCurrentPosition
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (isValidCoordinates(latitude, longitude)) {
          resolve({ latitude, longitude });
        } else {
          resolve(null);
        }
      },
      () => resolve(null), // Error or denial — fall through silently
      { timeout: 8000, maximumAge: 300000 }, // 8s timeout, 5min cache
    );
  });
}

async function detectIpLocation(): Promise<IpGeocodeResponse | null> {
  try {
    const response = await fetch("/api/geocode/ip");
    if (!response.ok) return null;
    const data: IpGeocodeResponse = await response.json();
    if (!isValidCoordinates(data.latitude, data.longitude)) return null;
    return data;
  } catch {
    return null; // EC#12 — fail silently
  }
}
