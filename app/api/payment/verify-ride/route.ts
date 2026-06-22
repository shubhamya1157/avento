// ===========================================================================
// api/payment/verify-ride/route.ts — Confirm a ride payment, then book the ride
// ===========================================================================
//
// The ride-hailing twin of /api/payment/verify. It runs AFTER the rider pays in
// the Razorpay popup. The browser sends the three Razorpay values (order id,
// payment id, signature) PLUS the ride details (vehicle + pickup + drop).
//
// Steps, in order:
//   1. Make sure someone is logged in.
//   2. VERIFY the signature — proof the payment is genuine and untampered.
//   3. Only then create the ride, via the SAME createRide() helper the demo path
//      uses, recording paid:true + the Razorpay ids.
//
// We keep this separate from the rental verify route because that one deals in
// dates and a date-clash refund message, whereas a ride deals in pickup/drop.
// ===========================================================================

import { requireCustomer } from "@/app/lib/guards";
import { verifyPaymentSignature, isRazorpayConfigured, refundPayment } from "@/app/lib/razorpay";
import { createRide } from "@/app/lib/create-ride";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// POST /api/payment/verify-ride
//
// Body: {
//   razorpay_order_id, razorpay_payment_id, razorpay_signature,  // from Razorpay
//   vehicleId, pickup: {address,lat,lng}, drop: {address,lat,lng} // the ride
// }
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireCustomer();
    if (error) return error;

    if (!isRazorpayConfigured()) {
      return apiError("Payments are not enabled on this server", 400);
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      vehicleId,
      pickup,
      drop,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return apiError("Missing payment details", 400);
    }

    // Is the payment genuine? If the re-computed signature doesn't match, treat
    // it as a forged/failed payment and create nothing.
    const genuine = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    if (!genuine) {
      return apiError("Payment verification failed", 400);
    }

    // Payment confirmed — create the ride through the shared helper (which
    // recomputes the fare and records the payment ids).
    const result = await createRide({
      userId: session.user.id!,
      vehicleId,
      pickup,
      drop,
      payment: { paymentId: razorpay_payment_id, orderId: razorpay_order_id },
    });

    // Money taken but the ride couldn't be created (e.g. the vehicle just became
    // unavailable). Don't keep the money — auto-refund and explain clearly.
    if (result.errorMessage) {
      const refund = await refundPayment(razorpay_payment_id);
      const tail = refund.ok
        ? "Your payment has been refunded automatically — it should appear in a few days."
        : `We couldn't auto-refund — please contact support quoting payment ID ${razorpay_payment_id}.`;
      return apiError(`${result.errorMessage} ${tail}`, 409);
    }

    return NextResponse.json(result.booking, { status: 201 }); // 201 = Created
  } catch (error) {
    console.error("Verify ride payment error:", error);
    return apiError(getErrorMessage(error, "Failed to verify payment"), 500);
  }
}
