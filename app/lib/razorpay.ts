// ===========================================================================
// razorpay.ts — Talking to Razorpay (the payment service), safely
// ===========================================================================
//
// Razorpay is the service that actually takes the customer's money. To use it we
// need two secret keys (a "key id" and a "key secret") from the Razorpay
// dashboard, kept in .env.local. This file wraps all of that in one place.
//
// DESIGN CHOICE — graceful "demo mode": if the keys are NOT set (e.g. you're
// just trying the app and haven't made a Razorpay account yet), the booking flow
// still works — it just skips the real payment step. So this file exposes a
// simple `isRazorpayConfigured()` check the rest of the app uses to decide
// between "take a real payment" and "demo booking".
// ===========================================================================

// The official Razorpay SDK (a ready-made library for talking to their service).
import Razorpay from "razorpay";
// Node's built-in crypto tools — used to VERIFY a payment really came from
// Razorpay (by re-computing a signature and comparing it).
import crypto from "crypto";

// Read the secret keys from the environment (never hard-coded in the code).
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

// ---------------------------------------------------------------------------
// isRazorpayConfigured: true only if BOTH keys are present. The rest of the app
// uses this to decide whether to charge for real or fall back to demo mode.
// ---------------------------------------------------------------------------
export function isRazorpayConfigured(): boolean {
  return Boolean(keyId && keySecret);
}

// ---------------------------------------------------------------------------
// getRazorpay: build (once) and return the Razorpay client used to create
// orders. Throws a clear error if the keys are missing — callers should check
// isRazorpayConfigured() first.
// ---------------------------------------------------------------------------
let client: Razorpay | null = null;
export function getRazorpay(): Razorpay {
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured (missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)");
  }
  // Reuse the same client across requests instead of rebuilding it each time.
  if (!client) {
    client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return client;
}

// ---------------------------------------------------------------------------
// verifyPaymentSignature: confirm a completed payment is genuine.
//
// After the customer pays, Razorpay's checkout hands the browser three values:
// an order id, a payment id, and a "signature". The signature is a fingerprint
// Razorpay made by scrambling "orderId|paymentId" with OUR secret key. We redo
// that exact scramble here and check it matches. If it does, the payment is real
// and untampered; if not, we reject it. This stops anyone faking a payment.
// ---------------------------------------------------------------------------
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!keySecret) return false;

  // Re-create the expected signature: an HMAC-SHA256 of "orderId|paymentId".
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  // Compare in a way that doesn't leak timing information. The buffers must be
  // the same length for timingSafeEqual, so we guard against a length mismatch.
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// refundPayment: give a customer their money back for a payment.
//
// We need this for one specific situation: the customer paid successfully, but
// in the split second afterwards the vehicle got booked by someone else for the
// same dates, so we can't create their booking. That money must not be kept — we
// refund it automatically here.
//
// It NEVER throws: a refund failing shouldn't crash the request that calls it.
// Instead it returns { ok: true } on success, or { ok: false, message } so the
// caller can tell the customer whether the refund went through or they need to
// contact support. (Razorpay refunds the full amount when no amount is given.)
// ---------------------------------------------------------------------------
export async function refundPayment(
  paymentId: string
): Promise<{ ok: boolean; message?: string }> {
  // No keys = nothing real was charged, so there's nothing to refund.
  if (!isRazorpayConfigured()) {
    return { ok: false, message: "Razorpay is not configured" };
  }
  try {
    await getRazorpay().payments.refund(paymentId, {});
    return { ok: true };
  } catch (err) {
    console.error("Razorpay refund failed:", err);
    return { ok: false, message: err instanceof Error ? err.message : "Refund failed" };
  }
}
