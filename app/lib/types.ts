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
//
// WHAT IS AN "INTERFACE"?
// An interface is just another way to describe the shape of an object — a
// checklist of which fields it has and what kind of value each one holds. Think
// of it as a labelled form: a real vehicle must fill in every box below.
// ---------------------------------------------------------------------------
export interface Vehicle {
  _id: string;            // unique id (comes from the database/seed list).
                          // "_id" is the standard name for the one value that
                          // tells two otherwise-identical records apart, like a
                          // serial number.
  brand: string;             // car maker, e.g. "Tesla"
  model: string;             // specific model name, e.g. "Model S Plaid"
  type: VehicleType;         // "car", "bike" or "suv" (see the union type above)
  image: string;             // path to the photo, e.g. "/vehicle-tesla.jpg"
  pricePerDay: number;       // rental cost for one day
  description: string;       // the blurb shown under the vehicle's name
  transmission: Transmission;// "Automatic" or "Manual"
  fuel: FuelType;            // "Electric", "Petrol", "Diesel" or "Hybrid"
  seats: number;             // how many people can sit in it
  availability: boolean;     // true = free to book, false = already taken
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
  brand: string;       // car maker, e.g. "Tesla"
  model: string;       // specific model, e.g. "Model S Plaid"
  image: string;       // path to the photo to show on the booking card
  type: string;        // "car", "bike" or "suv"
  pricePerDay: number; // daily rental price, used to display the rate
}

// ---------------------------------------------------------------------------
// A booking as the frontend sees it (e.g. a row on the /bookings page).
// ---------------------------------------------------------------------------
export interface Booking {
  _id: string;         // this booking's own unique id
  // The linked vehicle's details — or null if that vehicle record is missing
  // (so the UI can show "No Vehicle Data" instead of crashing).
  vehicleId: BookingVehicle | null;
  startDate: string;   // dates arrive from the API as text (e.g. ISO strings)
  endDate: string;
  totalAmount: number; // full price for the whole rental period
  status: BookingStatus; // "pending", "confirmed" or "cancelled"
  createdAt: string;   // when the booking was made ("Booked On")
}
