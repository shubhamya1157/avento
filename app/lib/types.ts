// ===========================================================================
// types.ts — Shared "shapes" used across the FRONTEND (the React pages)
// ===========================================================================
//
// WHAT IS A "TYPE"?
// TypeScript lets us describe the exact shape of our data — which fields exist
// and what kind of value each holds. The editor then catches mistakes for us
// (like reading a field that doesn't exist) BEFORE the code ever runs.
//
// These are the shapes the browser-side code expects to receive from the API.
// (The database has its own near-identical shapes in app/models/*. Keeping a
// frontend copy here means the UI doesn't have to import server-only files.)
// ===========================================================================

// "Union" types: the value must be exactly ONE of the listed words. These mirror
// the allowed values in the database schemas, so the UI and DB always agree.
export type VehicleType = "car" | "bike" | "suv";
export type Transmission = "Automatic" | "Manual";
export type FuelType = "Electric" | "Petrol" | "Diesel" | "Hybrid";
export type BookingStatus = "pending" | "confirmed" | "cancelled";

// ---------------------------------------------------------------------------
// A vehicle as the frontend sees it (e.g. a card on the /vehicles page).
// ---------------------------------------------------------------------------
export interface Vehicle {
  _id: string;            // unique id (comes from the database/seed list)
  brand: string;
  model: string;
  type: VehicleType;
  image: string;
  pricePerDay: number;
  description: string;
  transmission: Transmission;
  fuel: FuelType;
  seats: number;
  availability: boolean;
  // Optional CSS object-position for the card image (e.g. "center 70%")
  // when a photo needs to be cropped higher or lower than the default.
  // The `?` means this field may be absent for most vehicles.
  imagePosition?: string;
}

// ---------------------------------------------------------------------------
// A trimmed-down vehicle that travels INSIDE a booking. When the API loads a
// booking it "populates" (fills in) just these few vehicle fields — enough to
// show the booking card without sending the entire vehicle record.
// ---------------------------------------------------------------------------
export interface BookingVehicle {
  brand: string;
  model: string;
  image: string;
  type: string;
  pricePerDay: number;
}

// ---------------------------------------------------------------------------
// A booking as the frontend sees it (e.g. a row on the /bookings page).
// ---------------------------------------------------------------------------
export interface Booking {
  _id: string;
  // The linked vehicle's details — or null if that vehicle record is missing
  // (so the UI can show "No Vehicle Data" instead of crashing).
  vehicleId: BookingVehicle | null;
  startDate: string;   // dates arrive from the API as text (e.g. ISO strings)
  endDate: string;
  totalAmount: number;
  status: BookingStatus;
  createdAt: string;   // when the booking was made ("Booked On")
}
