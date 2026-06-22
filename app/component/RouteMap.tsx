// ===========================================================================
// RouteMap.tsx — A static map showing a ride's pickup → drop with a line
// ===========================================================================
//
// The ride flow needs a DIFFERENT map from TripMap.tsx: instead of one live,
// moving marker, this shows TWO fixed points — the pickup and the drop — joined
// by a dashed line, zoomed so both fit on screen. It's purely a picture of the
// trip the user is about to take.
//
// It reuses the exact Leaflet approach TripMap uses (dark CARTO tiles, no API
// key) and the same reason for loading Leaflet INSIDE useEffect: Leaflet touches
// the browser's `window` the moment it loads, but Next.js first renders on the
// SERVER where `window` doesn't exist. useEffect only runs in the browser, so
// `await import("leaflet")` there keeps it off the server.
//
// We give our styles/markers their OWN ids and class names so they never clash
// with TripMap's single-pin styles when both happen to be on a page.
// ===========================================================================

'use client';

import { useEffect, useRef } from "react";
// Types only (erased at runtime) — does NOT pull Leaflet onto the server.
import type { Map as LeafletMap } from "leaflet";

// One end of the trip. (Mirrors GeoPoint in types.ts but we only need coords +
// an optional label for the popup here.)
interface Point {
  lat: number;
  lng: number;
  label?: string;
}

interface RouteMapProps {
  pickup: Point | null;
  drop: Point | null;
}

// Leaflet's stylesheet, added once via a <link> (same as TripMap).
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

// Our own little stylesheet: two labelled end-pins (a filled dot with a ring)
// and the dark popup tint. A distinct id from TripMap's so they coexist.
const ROUTE_STYLE_ID = "avento-route-map-style";
const ROUTE_CSS = `
.avento-endpin { position: relative; }
.avento-endpin .core {
  position: absolute; inset: 0; border-radius: 9999px;
  border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.6);
}
.avento-endpin.pickup .core { background: #fff; }
.avento-endpin.drop .core { background: #000; }
.leaflet-popup-content-wrapper, .leaflet-popup-tip {
  background: #18181b; color: #fff; border: 1px solid rgba(255,255,255,0.1);
}
.leaflet-container { background: #09090b; }
`;

function injectOnce(id: string, build: () => HTMLElement) {
  if (typeof document === "undefined" || document.getElementById(id)) return;
  document.head.appendChild(build());
}

function ensureStyles() {
  injectOnce(LEAFLET_CSS, () => {
    const link = document.createElement("link");
    link.id = LEAFLET_CSS;
    link.rel = "stylesheet";
    link.href = LEAFLET_CSS;
    return link;
  });
  injectOnce(ROUTE_STYLE_ID, () => {
    const style = document.createElement("style");
    style.id = ROUTE_STYLE_ID;
    style.textContent = ROUTE_CSS;
    return style;
  });
}

export default function RouteMap({ pickup, drop }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null); // the map's box
  const mapRef = useRef<LeafletMap | null>(null);           // the Leaflet map
  const LRef = useRef<typeof import("leaflet") | null>(null);
  // We keep every layer we add (markers + the line) in one list so we can wipe
  // and redraw cleanly whenever the pickup/drop change.
  const layersRef = useRef<Array<{ remove: () => void }>>([]);

  // Latest props, read by the draw helper (kept in a ref so the helper is stable
  // and the map is only ever created once).
  const latest = useRef({ pickup, drop });
  latest.current = { pickup, drop };

  // Draw both end-pins + the connecting line, then zoom so both fit.
  const draw = () => {
    const L = LRef.current;
    const map = mapRef.current;
    const { pickup: p, drop: d } = latest.current;
    if (!L || !map) return;

    // Clear anything drawn on a previous render.
    layersRef.current.forEach((layer) => layer.remove());
    layersRef.current = [];

    // A small helper to add one labelled end-pin.
    const addPin = (pt: Point, kind: "pickup" | "drop") => {
      const icon = L.divIcon({
        className: `avento-endpin ${kind}`,
        html: '<div class="core"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      const marker = L.marker([pt.lat, pt.lng], { icon }).addTo(map);
      if (pt.label) marker.bindPopup(pt.label);
      layersRef.current.push(marker);
    };

    if (p) addPin(p, "pickup");
    if (d) addPin(d, "drop");

    // The dashed white line from pickup to drop (straight-line, matching our
    // straight-line distance/fare).
    if (p && d) {
      const line = L.polyline(
        [[p.lat, p.lng], [d.lat, d.lng]],
        { color: "#ffffff", weight: 3, opacity: 0.7, dashArray: "6 8" }
      ).addTo(map);
      layersRef.current.push(line);
      // Zoom so both ends are comfortably in view (pad adds a margin).
      map.fitBounds(L.latLngBounds([[p.lat, p.lng], [d.lat, d.lng]]).pad(0.25));
    } else if (p || d) {
      // Only one point so far — just centre on it.
      const only = (p || d)!;
      map.setView([only.lat, only.lng], 14);
    }
  };

  // ---- Create the map exactly once, when the component first appears. ----
  useEffect(() => {
    let cancelled = false;
    ensureStyles();

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      LRef.current = L;

      // Centre on India until we have points (draw() re-zooms right after).
      const map = L.map(containerRef.current, { zoomControl: false }).setView(
        [20.5937, 78.9629],
        5
      );
      L.control.zoom({ position: "bottomright" }).addTo(map);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      mapRef.current = map;
      draw();
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = [];
    };
    // Created once on mount; the effect below handles point changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Redraw whenever the pickup or drop changes. ----
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, drop]);

  return <div ref={containerRef} className="h-full w-full" />;
}
