// ===========================================================================
// TripMap.tsx — A live map showing one moving point (the vehicle)
// ===========================================================================
//
// We use Leaflet (a small, free map library) with dark "CARTO" tiles built on
// OpenStreetMap data — no API key and no bill, and the dark styling matches the
// app's premium look. The map shows a single pulsing marker at `position` and
// smoothly flies to follow it, so the passenger watches the vehicle move live.
//
// WHY WE LOAD LEAFLET INSIDE useEffect (and not a normal top-of-file import):
// Leaflet touches the browser's `window`/`document` the moment it loads. But
// Next.js first renders pages on the SERVER, where those don't exist — a plain
// import would crash the render. useEffect only ever runs in the BROWSER, so
// importing Leaflet there (with `await import(...)`) keeps it off the server.
//
// (See node_modules/next/dist/docs for the app-router client-component model.)
// ===========================================================================

'use client';

import { useEffect, useRef } from "react";
// We only import the TYPES here (erased at runtime), so this line does NOT pull
// Leaflet onto the server — the real library is loaded lazily in useEffect.
import type { Map as LeafletMap, Marker as LeafletMarker, Circle as LeafletCircle } from "leaflet";

interface TripMapProps {
  position: { lat: number; lng: number } | null; // null until the first GPS fix
  accuracy?: number | null; // GPS accuracy radius in metres (drawn as a soft halo)
  label?: string;           // text shown in the marker's popup, e.g. "Tesla Model S"
}

// Leaflet's CSS (tile layout, controls). We add it once via a <link> to the
// public CDN rather than importing the file, to stay clear of bundler/SSR CSS
// rules — it's a static stylesheet, so a link tag is perfectly fine.
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

// A small stylesheet of our own: the pulsing-dot animation for the live marker,
// plus a dark tint for Leaflet's popups so they fit the theme. Injected once.
const MARKER_STYLE_ID = "avento-trip-map-style";
const MARKER_CSS = `
@keyframes avento-pulse {
  0%   { transform: scale(0.6); opacity: 0.7; }
  70%  { transform: scale(2.6); opacity: 0;   }
  100% { transform: scale(2.6); opacity: 0;   }
}
.avento-pin { position: relative; }
.avento-pin .ring {
  position: absolute; inset: 0; border-radius: 9999px;
  background: rgba(255,255,255,0.55);
  animation: avento-pulse 1.8s ease-out infinite;
}
.avento-pin .dot {
  position: absolute; inset: 4px; border-radius: 9999px;
  background: #fff; border: 2px solid #000;
  box-shadow: 0 2px 6px rgba(0,0,0,0.5);
}
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
  injectOnce(MARKER_STYLE_ID, () => {
    const style = document.createElement("style");
    style.id = MARKER_STYLE_ID;
    style.textContent = MARKER_CSS;
    return style;
  });
}

export default function TripMap({ position, accuracy, label }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null); // the map's box
  const mapRef = useRef<LeafletMap | null>(null);           // the Leaflet map
  const markerRef = useRef<LeafletMarker | null>(null);     // the vehicle pin
  const circleRef = useRef<LeafletCircle | null>(null);     // the accuracy halo
  const lastLatLng = useRef<[number, number] | null>(null); // for smooth-follow
  // Leaflet itself, captured once it's lazily loaded so later code can reuse it.
  const LRef = useRef<typeof import("leaflet") | null>(null);

  // The latest props, read by the draw helper. Kept in a ref so the helper is
  // stable and the map is only ever created once.
  const latest = useRef({ position, accuracy, label });
  latest.current = { position, accuracy, label };

  // Draw / move the marker + accuracy halo for the current position. Safe to
  // call any time; does nothing until both Leaflet and the map are ready.
  const draw = () => {
    const L = LRef.current;
    const map = mapRef.current;
    const { position: pos, accuracy: acc, label: lbl } = latest.current;
    if (!L || !map || !pos) return;

    const latlng: [number, number] = [pos.lat, pos.lng];

    // The pulsing pin: a fixed bit of HTML styled by the CSS injected above.
    if (!markerRef.current) {
      const icon = L.divIcon({
        className: "avento-pin",
        html: '<div class="ring"></div><div class="dot"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      markerRef.current = L.marker(latlng, { icon }).addTo(map);
      if (lbl) markerRef.current.bindPopup(lbl);
    } else {
      markerRef.current.setLatLng(latlng);
    }

    // A soft circle showing how precise the GPS fix is (bigger = less sure).
    if (acc && acc > 0) {
      if (!circleRef.current) {
        circleRef.current = L.circle(latlng, {
          radius: acc,
          color: "#ffffff",
          weight: 1,
          opacity: 0.25,
          fillColor: "#ffffff",
          fillOpacity: 0.08,
        }).addTo(map);
      } else {
        circleRef.current.setLatLng(latlng);
        circleRef.current.setRadius(acc);
      }
    }

    // Follow the vehicle: gently pan for the small hops of a normal drive, but
    // fly when it jumps a long way (e.g. the very first fix, or a GPS leap).
    const prev = lastLatLng.current;
    const jumpMeters = prev ? map.distance(prev, latlng) : Infinity;
    if (jumpMeters > 1500) {
      map.flyTo(latlng, Math.max(map.getZoom(), 15), { duration: 0.8 });
    } else {
      map.panTo(latlng, { animate: true, duration: 0.6 });
    }
    lastLatLng.current = latlng;
  };

  // ---- Create the map exactly once, when the component first appears. ----
  useEffect(() => {
    let cancelled = false;
    ensureStyles();

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      LRef.current = L;

      // Start centered on India (a sensible default) until a real fix arrives.
      const start = latest.current.position ?? { lat: 20.5937, lng: 78.9629 };
      const map = L.map(containerRef.current, { zoomControl: false }).setView(
        [start.lat, start.lng],
        latest.current.position ? 15 : 5
      );
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Dark map imagery (CARTO basemap, OpenStreetMap data — free, no key).
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      mapRef.current = map;
      // If we already had a position at mount, place the marker right away
      // (fixes a stationary first fix never showing a pin).
      draw();
    })();

    // Tear the map down when the page closes (frees memory / event listeners).
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // Created once on mount — the position effect below handles updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Whenever a new position/accuracy arrives, redraw the marker. ----
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, accuracy, label]);

  return <div ref={containerRef} className="h-full w-full" />;
}
