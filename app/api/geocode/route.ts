// ===========================================================================
// api/geocode/route.ts — Turn a typed address into map coordinates
// ===========================================================================
//
// The "Get a Ride" page lets people type a pickup / drop address. To put those
// on a map and measure the trip, we need to convert the words into latitude /
// longitude numbers. That conversion is called "geocoding".
//
// We use OpenStreetMap's free "Nominatim" search service (no API key needed,
// matching this project's map choice). We call it FROM THE SERVER, not the
// browser, for two reasons:
//   1. Nominatim's usage policy requires a real "User-Agent" header identifying
//      the app — a server route can set that; a browser fetch cannot.
//   2. Calling it server-side avoids browser cross-origin (CORS) problems.
//
// TWO modes, picked by which query params are present:
//   - FORWARD:  GET /api/geocode?q=<address>      -> [{ displayName, lat, lng }, ...]
//   - REVERSE:  GET /api/geocode?lat=<n>&lng=<n>  -> [{ displayName, lat, lng }]
// Reverse is used by "Use my location": the device gives us coordinates, and we
// turn them back into a readable street address to show the rider.
// (Protected: you must be logged in, same as the rest of the ride flow.)
// ===========================================================================

import { requireUser } from "@/app/lib/guards";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

// The raw shape Nominatim returns for each result (only the bits we use).
interface NominatimResult {
  display_name: string;
  lat: string; // Nominatim sends these as strings, e.g. "19.0760"
  lon: string;
}

export async function GET(req: NextRequest) {
  try {
    // Gate behind login, like the rest of the ride flow.
    const { error } = await requireUser();
    if (error) return error;

    const params = req.nextUrl.searchParams;
    const latParam = params.get("lat");
    const lngParam = params.get("lng");

    // Headers every Nominatim call needs: it BANS requests with a missing or
    // default User-Agent, so we identify our app clearly as their policy requires.
    const nominatimHeaders = {
      "User-Agent": "Avento/1.0 (ride-hailing demo; support@avento.com)",
      "Accept-Language": "en",
    };

    // ----- REVERSE mode: coordinates -> one readable address. -----
    if (latParam !== null && lngParam !== null) {
      const lat = Number(latParam);
      const lng = Number(lngParam);
      // Guard against junk/out-of-range coords before calling the service.
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return apiError("Invalid coordinates", 400);
      }

      const reverseUrl =
        "https://nominatim.openstreetmap.org/reverse" +
        `?format=json&lat=${lat}&lon=${lng}`;
      const res = await fetch(reverseUrl, { headers: nominatimHeaders, next: { revalidate: 60 } });
      if (!res.ok) {
        return apiError("Address lookup is temporarily unavailable", 502);
      }
      const data = (await res.json()) as Partial<NominatimResult>;
      // Reverse returns a single object. If it has no name, fall back to the
      // coordinates themselves so the caller still gets a usable label.
      return NextResponse.json([
        {
          displayName: data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          lat,
          lng,
        },
      ]);
    }

    // ----- FORWARD mode: typed text -> up to 5 matches. -----
    // Read the ?q=... search text from the URL and tidy it up.
    const q = params.get("q")?.trim();
    if (!q || q.length < 3) {
      // Too short to search usefully — return an empty list rather than an error
      // so the UI can simply show "keep typing".
      return NextResponse.json([]);
    }

    // Ask Nominatim for up to 5 matches. `format=json` gives us a tidy array;
    // `addressdetails=0` keeps the payload small (we only need name + coords).
    const url =
      "https://nominatim.openstreetmap.org/search" +
      `?format=json&limit=5&addressdetails=0&q=${encodeURIComponent(q)}`;

    const res = await fetch(url, {
      headers: nominatimHeaders,
      // Cache identical lookups briefly to be kind to the free service.
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return apiError("Address lookup is temporarily unavailable", 502);
    }

    const data = (await res.json()) as NominatimResult[];

    // Trim each result down to just what the map + fare maths need.
    const results = data.map((r) => ({
      displayName: r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Geocode error:", error);
    return apiError(getErrorMessage(error, "Failed to look up address"), 500);
  }
}
