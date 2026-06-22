// ===========================================================================
// api/payment/order/route.ts — Step 1 of paying: create a Razorpay "order"
// ===========================================================================
//
// Taking a real payment with Razorpay happens in TWO steps:
//   1. (this file)  The browser asks our SERVER to create an "order" — a record
//      at Razorpay that says "this customer is about to pay this amount". Razorpay
//      hands back an `order id`. Only the server can do this, because it needs the
//      secret key. We send the order id (plus the public key id and amount) back
//      to the browser.
//   2. The browser opens Razorpay's checkout popup using that order id, the
//      customer pays, and Razorpay returns a signed result. The browser then sends
//      that result to /api/payment/verify, which checks it and saves the booking.
//
// IMPORTANT: this route does NOT create the booking. It only opens the payment.
// The booking is created in the verify step, AFTER the money is confirmed — so a
// customer who closes the popup without paying never gets a booking.
//
// See app/lib/razorpay.ts for the Razorpay client + the demo-mode check, and
// app/lib/create-booking.ts for the shared rules used by the verify step.
// ===========================================================================

import { requireCustomer } from "@/app/lib/guards";
import { getRazorpay, isRazorpayConfigured } from "@/app/lib/razorpay";
import { quoteRental } from "@/app/lib/rental-price";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// POST /api/payment/order — create a Razorpay order for a rental.
//
// Body: { vehicleId, startDate, endDate }  — the rental the customer chose.
// Reply: { orderId, amount, currency, keyId }  — everything the browser needs to
//        open the checkout popup.
//
// SECURITY: the browser does NOT tell us the price. We recompute it on the
// server with quoteRental() (days × the vehicle's pricePerDay) and charge THAT,
// so a tampered request can't pay ₹1 for a ₹50,000 car. The booking is created
// later in /api/payment/verify, which recomputes the very same amount.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    // Must be a customer to start a payment (partners/admins can't book).
    const { error } = await requireCustomer();
    if (error) return error;

    // If Razorpay keys aren't set, there's no real payment to take. The browser
    // is supposed to use the demo path (/api/bookings) instead, so reaching here
    // is a misconfiguration — say so clearly rather than crashing.
    if (!isRazorpayConfigured()) {
      return apiError("Payments are not enabled on this server", 400);
    }

    const { vehicleId, startDate, endDate } = await req.json();

    // Work out the real price on the server (validates the vehicle + dates too).
    // If anything's wrong, quoteRental hands back a clear message + status code.
    const quote = await quoteRental({ vehicleId, startDate, endDate });
    if (quote.amount === undefined) {
      return apiError(quote.errorMessage, quote.errorStatus);
    }

    // Razorpay expects the amount in the smallest currency unit (paise for INR),
    // so we multiply by 100 and round to a whole number. (e.g. ₹250 -> 25000.)
    const amountInPaise = Math.round(quote.amount * 100);

    // Ask Razorpay to create the order. `receipt` is a free-text note for our own
    // records; Razorpay just echoes it back. We can't make a unique timestamp id
    // here (Date.now is fine in a route, but we keep it simple and let Razorpay
    // generate the order id), so the receipt is a short human-readable label.
    const order = await getRazorpay().orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `avento_${amountInPaise}`,
    });

    // Send back only what the browser needs. The key SECRET never leaves the
    // server — only the public key id does (the same value also in NEXT_PUBLIC_*).
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create payment order error:", error);
    return apiError(getErrorMessage(error, "Failed to start payment"), 500);
  }
}
