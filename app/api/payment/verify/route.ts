// ===========================================================================
// api/payment/verify/route.ts — Step 2 of paying: confirm payment, then book
// ===========================================================================
//
// This runs AFTER the customer has paid in the Razorpay popup. The browser sends
// us three things from Razorpay (an order id, a payment id, and a "signature")
// PLUS the booking details (which vehicle, which dates, the amount).
//
// Our job here is, in order:
//   1. Make sure someone is logged in.
//   2. VERIFY the signature — proof the payment is genuine and untampered. If it
//      doesn't check out, we refuse and create nothing.
//   3. Only then create the booking, via the SAME createBooking() helper the demo
//      path uses — so all the date/availability/double-booking rules are applied
//      identically, and the booking is saved with paid:true + the Razorpay ids.
//
// Why verify on the server? The browser could be lied to or tampered with. The
// signature can only be re-created by someone holding our secret key (us), so
// checking it here is the one trustworthy place to confirm "yes, money arrived".
// ===========================================================================

import { requireUser } from "@/app/lib/guards";
import { verifyPaymentSignature, isRazorpayConfigured, refundPayment } from "@/app/lib/razorpay";
import { createBooking } from "@/app/lib/create-booking";
import bookingModel from "@/app/models/booking";
import connectDB from "@/app/lib/db";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// POST /api/payment/verify
//
// Body: {
//   razorpay_order_id, razorpay_payment_id, razorpay_signature,  // from Razorpay
//   vehicleId, startDate, endDate, totalAmount                   // the booking
// }
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireUser();
    if (error) return error;

    // Reaching here without keys means the order was never really created — refuse.
    if (!isRazorpayConfigured()) {
      return apiError("Payments are not enabled on this server", 400);
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      vehicleId,
      startDate,
      endDate,
      // In the request flow the customer pays for an EXISTING accepted booking,
      // so the browser sends its id instead of fresh rental details.
      bookingId,
    } = await req.json();

    // All three Razorpay values must be present, or there's nothing to verify.
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return apiError("Missing payment details", 400);
    }

    // The heart of this route: is the payment genuine? If the re-computed
    // signature doesn't match, treat it as a forged/failed payment and stop.
    const genuine = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    if (!genuine) {
      return apiError("Payment verification failed", 400);
    }

    // -----------------------------------------------------------------------
    // PATH A — paying for an EXISTING accepted booking (the request flow).
    // -----------------------------------------------------------------------
    if (bookingId) {
      await connectDB();
      const booking = await bookingModel.findById(bookingId);
      if (!booking) return apiError("Booking not found", 404);

      // Only the booker may pay, and only for a booking the owner has accepted.
      if (String(booking.userId) !== String(session.user.id)) {
        return apiError("You can't pay for this booking", 403);
      }
      if (booking.status !== "accepted") {
        // Money was taken but the booking can't be confirmed (already paid,
        // cancelled, or never accepted) — auto-refund and explain.
        const refund = await refundPayment(razorpay_payment_id);
        const tail = refund.ok
          ? "Your payment has been refunded automatically — it should appear in a few days."
          : `We couldn't auto-refund — please contact support quoting payment ID ${razorpay_payment_id}.`;
        return apiError(`This booking isn't awaiting payment. ${tail}`, 409);
      }

      // Lock it in and record the payment.
      booking.status = "confirmed";
      booking.paid = true;
      booking.paymentId = razorpay_payment_id;
      booking.orderId = razorpay_order_id;
      await booking.save();

      return NextResponse.json(booking);
    }

    // -----------------------------------------------------------------------
    // PATH B — legacy direct booking (create + pay in one step).
    // Payment confirmed — now create the booking through the shared helper, which
    // re-checks the dates and double-booking and records the payment ids.
    // -----------------------------------------------------------------------
    const result = await createBooking({
      // requireUser() already guaranteed a logged-in user with an id, so the
      // `!` tells TypeScript this is definitely present (not undefined).
      userId: session.user.id!,
      vehicleId,
      startDate,
      endDate,
      payment: { paymentId: razorpay_payment_id, orderId: razorpay_order_id },
    });

    // The tricky case: money WAS taken, but we couldn't create the booking (most
    // likely someone else grabbed the same dates in the meantime). We must not
    // keep the money — try to refund it automatically, then tell the customer
    // exactly what happened and what to do, instead of a confusing generic error.
    if (result.errorMessage) {
      const refund = await refundPayment(razorpay_payment_id);
      const tail = refund.ok
        ? "Your payment has been refunded automatically — it should appear in a few days."
        : `We couldn't auto-refund — please contact support quoting payment ID ${razorpay_payment_id}.`;
      // 409 = Conflict: the request was valid but clashed with the current state
      // (the slot was taken). The booking failure is the real reason, so we lead
      // with it and append the refund outcome.
      return apiError(`${result.errorMessage} ${tail}`, 409);
    }

    return NextResponse.json(result.booking, { status: 201 }); // 201 = Created
  } catch (error) {
    console.error("Verify payment error:", error);
    return apiError(getErrorMessage(error, "Failed to verify payment"), 500);
  }
}
