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
// A booking is either a date-range "rental" or a point-to-point "ride".
export type BookingKind = "rental" | "ride";
// ongoing/completed are used by the ride flow (a rental only ever sits at
// confirmed or cancelled in this app).
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "ongoing" | "completed";

// A single map point: the human-readable address plus the coordinates we
// geocoded it to. Used for a ride's pickup and drop.
export interface GeoPoint {
  address: string;
  lat: number;
  lng: number;
}
// Where a vehicle came from, and how far through approval it is. A partner
// submission is only shown to renters once an admin marks it "approved".
export type VehicleSource = "fleet" | "partner";
export type ApprovalStatus = "approved" | "pending" | "rejected";

// How far a user is through the one-time "become a partner" journey (submit a
// vehicle -> admin reviews details -> video KYC -> partner). Tracked on the user.
//   none / pending_review / kyc_pending / approved / rejected.
export type PartnerStatus =
  | "none"
  | "pending_review"
  | "kyc_pending"
  | "approved"
  | "rejected";

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

  // A quick star-rating summary the API works out from this vehicle's reviews,
  // so cards can show "4.5 ★ (12)" without each fetching reviews separately.
  // `average` is the mean rating (0 when there are no reviews yet) and `count`
  // is how many reviews there are. Optional because the static seed list and
  // older API responses don't include it.
  rating?: {
    average: number; // mean rating, 1 decimal place (0 = no reviews yet)
    count: number;   // how many reviews this vehicle has
  };

  // --- Partner / approval fields (present only on partner-supplied vehicles) ---
  source?: VehicleSource;     // "fleet" (house) or "partner" (submitted by a user)
  status?: ApprovalStatus;    // "approved" / "pending" / "rejected"
  ownerName?: string;         // partner's contact name
  ownerPhone?: string;        // partner's contact phone
  licensePlate?: string;      // number plate / registration
  location?: string;          // where the vehicle is based
  adminNote?: string;         // admin's note (e.g. reason a request was rejected)
  images?: string[];          // extra gallery photos beyond the cover image
  createdAt?: string;         // when it was submitted (used in the partner/admin lists)
}

// ---------------------------------------------------------------------------
// What the partner submission form sends to the server when listing a vehicle.
// (It's the renter-facing vehicle details PLUS the owner's personal details.)
// ---------------------------------------------------------------------------
export interface PartnerVehicleInput {
  brand: string;
  model: string;
  type: VehicleType;
  image: string;              // cover photo (an uploaded URL)
  images?: string[];          // extra gallery photos
  pricePerDay: number;
  description: string;
  transmission: Transmission;
  fuel: FuelType;
  seats: number;
  ownerName: string;          // the partner's own name
  ownerPhone: string;         // the partner's contact phone
  licensePlate: string;       // the vehicle's registration plate
  location: string;           // where the vehicle is based
}

// ---------------------------------------------------------------------------
// One partner application, as the ADMIN review console sees it: the applicant's
// own details plus the vehicle they submitted, so the admin can vet both before
// the video KYC call. Returned by GET /api/admin/partners.
// ---------------------------------------------------------------------------
export interface PartnerApplication {
  _id: string;                // the applicant USER's id (also the KYC room key)
  name: string;
  email: string;
  partnerStatus: PartnerStatus;
  kycNote?: string;
  createdAt?: string;
  updatedAt?: string;
  vehicle: Vehicle | null;    // the vehicle this application is for (if still present)
}

// ---------------------------------------------------------------------------
// What the applicant's own /partner dashboard reads to decide what to show.
// Returned by GET /api/partner/application.
// ---------------------------------------------------------------------------
export interface PartnerApplicationState {
  role: string;               // "user" | "partner" | "admin"
  partnerStatus: PartnerStatus;
  kycNote?: string;
  vehicles: Vehicle[];        // every vehicle this user has submitted
}

// ---------------------------------------------------------------------------
// A trimmed-down vehicle that travels INSIDE a booking. When the API loads a
// booking it "populates" (fills in) just these few vehicle fields — enough to
// show the booking card without sending the entire vehicle record.
// ---------------------------------------------------------------------------
export interface BookingVehicle {
  _id: string;         // the vehicle's id — needed to leave a review for it
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
  kind?: BookingKind;  // "rental" (default) or "ride"; absent on old records
  // Rental dates — optional because a ride has none. They arrive as text.
  startDate?: string;
  endDate?: string;
  // Ride fields — present only when kind === "ride".
  pickup?: GeoPoint;   // where the rider is collected
  drop?: GeoPoint;     // where the rider is dropped off
  distanceKm?: number; // straight-line trip distance
  fare?: number;       // computed ride price (same value as totalAmount)
  totalAmount: number; // amount charged (rental: whole period; ride: the fare)
  status: BookingStatus; // confirmed / cancelled / ongoing / completed …
  paid?: boolean;      // true once a real Razorpay payment was taken (false in demo mode)
  createdAt: string;   // when the booking was made ("Booked On")
}

// ---------------------------------------------------------------------------
// A review as the frontend sees it (a star rating + comment for a vehicle).
// Mirrors app/models/review.ts. The API's GET /api/reviews returns a list of
// these plus a summary (see ReviewSummary below).
// ---------------------------------------------------------------------------
export interface Review {
  _id: string;        // this review's own unique id
  vehicleId: string;  // which vehicle it's about
  userName: string;   // the reviewer's display name (copied onto the review)
  rating: number;     // a whole number of stars, 1 to 5
  comment?: string;   // the written review (optional)
  createdAt: string;  // when it was written
}

// What GET /api/reviews returns: the list plus a quick summary the UI can show
// (e.g. "4.5 ★ from 12 reviews") without re-computing it in the browser.
export interface ReviewSummary {
  reviews: Review[];
  count: number;   // how many reviews there are
  average: number; // mean rating rounded to 1 decimal (0 when there are none)
}
