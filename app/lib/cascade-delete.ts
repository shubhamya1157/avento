// ===========================================================================
// cascade-delete.ts — Permanently remove a record AND everything tied to it
// ===========================================================================
//
// Our data is RELATIONAL: a booking points at a user and a vehicle, a message
// points at a booking, a review points at a user and a vehicle, and so on (see
// the `ref:` lines in app/models/*). So you can't just delete one document and
// walk away — you'd leave "orphans" (e.g. chat messages for a booking that no
// longer exists). "Cascading" means: when you delete something, also delete the
// things that hang off it, so the database stays tidy.
//
// Every function here:
//   - takes the id of the thing to delete,
//   - takes an options object with a `dryRun` flag,
//   - returns a COUNT SUMMARY of what was (or would be) removed.
//
// WHY dryRun? The admin UI calls these first with dryRun:true to find out how
// much a delete would wipe out, shows that in a confirm dialog, and only then
// calls again (dryRun:false) to actually do it. Same code path both times, so
// the preview can never disagree with the real thing.
//
// These are admin-only operations; the calling API routes do the requireAdmin()
// check before invoking anything here.
// ===========================================================================

import bookingModel from "@/app/models/booking";
import vehicleModel from "@/app/models/vehicle";
import userModel from "@/app/models/user";
import reviewModel from "@/app/models/review";
import messageModel from "@/app/models/message";

// The shape every function returns: how many of each kind of record were (or
// would be) removed. The admin dialog reads these to spell out the blast radius.
export interface DeleteSummary {
  bookings: number;
  vehicles: number;
  reviews: number;
  messages: number;
  users: number;
}

interface CascadeOptions {
  // true = only COUNT what would be deleted (used for the confirm preview);
  // false/omitted = actually delete.
  dryRun?: boolean;
}

// A fresh, all-zero summary. We add other summaries into this as we recurse.
function emptySummary(): DeleteSummary {
  return { bookings: 0, vehicles: 0, reviews: 0, messages: 0, users: 0 };
}

// Add summary `b` into summary `a` (mutates and returns `a`). Used to roll up
// the counts from nested cascades (e.g. deleting a user rolls in the counts from
// deleting each of their vehicles).
function addSummary(a: DeleteSummary, b: DeleteSummary): DeleteSummary {
  a.bookings += b.bookings;
  a.vehicles += b.vehicles;
  a.reviews += b.reviews;
  a.messages += b.messages;
  a.users += b.users;
  return a;
}

// ---------------------------------------------------------------------------
// cascadeDeleteBooking — remove ONE booking and its chat messages.
//
// What points at a booking? Only chat messages (message.bookingId). Reviews are
// keyed by user+vehicle, NOT by booking, so they're left alone here.
// ---------------------------------------------------------------------------
export async function cascadeDeleteBooking(
  bookingId: string,
  { dryRun = false }: CascadeOptions = {}
): Promise<DeleteSummary> {
  const summary = emptySummary();

  // Count (and maybe delete) the messages in this booking's chat.
  const messageFilter = { bookingId };
  summary.messages = await messageModel.countDocuments(messageFilter);
  if (!dryRun) await messageModel.deleteMany(messageFilter);

  // Count (and maybe delete) the booking itself.
  const exists = await bookingModel.countDocuments({ _id: bookingId });
  summary.bookings = exists;
  if (!dryRun && exists) await bookingModel.deleteOne({ _id: bookingId });

  return summary;
}

// ---------------------------------------------------------------------------
// cascadeDeleteVehicle — remove ONE vehicle and everything that references it.
//
// Pointing at a vehicle: bookings (booking.vehicleId) and reviews
// (review.vehicleId). Each of those bookings has its own chat messages, so we
// reuse cascadeDeleteBooking for them. We also clear any user's
// applicationVehicleId that still points here, so no dangling reference is left.
// ---------------------------------------------------------------------------
export async function cascadeDeleteVehicle(
  vehicleId: string,
  { dryRun = false }: CascadeOptions = {}
): Promise<DeleteSummary> {
  const summary = emptySummary();

  // 1. Every booking on this vehicle -> cascade-delete it (rolls in its messages).
  const bookingIds = await bookingModel.find({ vehicleId }).distinct("_id");
  for (const id of bookingIds) {
    addSummary(summary, await cascadeDeleteBooking(String(id), { dryRun }));
  }

  // 2. Every review of this vehicle.
  const reviewFilter = { vehicleId };
  summary.reviews += await reviewModel.countDocuments(reviewFilter);
  if (!dryRun) await reviewModel.deleteMany(reviewFilter);

  // 3. Clear any partner-application link that still points at this vehicle, so
  //    we don't leave a user.applicationVehicleId pointing into thin air. (This
  //    is a tidy-up, not a deletion, so it doesn't affect the counts.)
  if (!dryRun) {
    await userModel.updateMany(
      { applicationVehicleId: vehicleId },
      { $unset: { applicationVehicleId: "" } }
    );
  }

  // 4. The vehicle itself.
  const exists = await vehicleModel.countDocuments({ _id: vehicleId });
  summary.vehicles += exists;
  if (!dryRun && exists) await vehicleModel.deleteOne({ _id: vehicleId });

  return summary;
}

// ---------------------------------------------------------------------------
// cascadeDeleteUser — remove ONE user and everything they own / created.
//
// A user is referenced from many places:
//   - vehicles they submitted     (vehicle.ownerId)   -> cascade each vehicle
//   - bookings they made          (booking.userId)    -> cascade each booking
//   - reviews they wrote          (review.userId)     -> delete
//   - chat messages they sent     (message.senderId)  -> delete
// Deleting their vehicles via cascadeDeleteVehicle also sweeps up other people's
// bookings/reviews on those vehicles, which is what we want — the vehicle is gone.
//
// NOTE: the caller (the API route) is responsible for refusing to delete an
// admin or the current user; this function just does the work it's asked to.
// ---------------------------------------------------------------------------
export async function cascadeDeleteUser(
  userId: string,
  { dryRun = false }: CascadeOptions = {}
): Promise<DeleteSummary> {
  const summary = emptySummary();

  // 1. Vehicles this user submitted -> cascade-delete each.
  const vehicleIds = await vehicleModel.find({ ownerId: userId }).distinct("_id");
  for (const id of vehicleIds) {
    addSummary(summary, await cascadeDeleteVehicle(String(id), { dryRun }));
  }

  // 2. Bookings this user made -> cascade-delete each (rolls in their messages).
  //    (Some may already be gone if they were on a vehicle removed in step 1;
  //    distinct() on what's left avoids double counting.)
  const bookingIds = await bookingModel.find({ userId }).distinct("_id");
  for (const id of bookingIds) {
    addSummary(summary, await cascadeDeleteBooking(String(id), { dryRun }));
  }

  // 3. Reviews this user wrote (on any vehicle).
  const reviewFilter = { userId };
  summary.reviews += await reviewModel.countDocuments(reviewFilter);
  if (!dryRun) await reviewModel.deleteMany(reviewFilter);

  // 4. Chat messages this user sent on any remaining booking.
  const messageFilter = { senderId: userId };
  summary.messages += await messageModel.countDocuments(messageFilter);
  if (!dryRun) await messageModel.deleteMany(messageFilter);

  // 5. The user record itself.
  const exists = await userModel.countDocuments({ _id: userId });
  summary.users += exists;
  if (!dryRun && exists) await userModel.deleteOne({ _id: userId });

  return summary;
}
