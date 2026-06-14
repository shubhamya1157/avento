// Simple in-memory store for signup OTP codes.
//
// NOTE: This lives in server memory, so it works for a single running instance
// (great for local dev). For production with multiple instances, swap this out
// for Redis or a short-lived database collection.

interface OtpEntry {
  otp: string;
  expiresAt: number; // epoch ms
  attempts: number;
}

// Reuse the same Map across hot-reloads in development.
const globalForOtp = globalThis as unknown as {
  otpStore?: Map<string, OtpEntry>;
};

const store = globalForOtp.otpStore ?? new Map<string, OtpEntry>();
globalForOtp.otpStore = store;

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 3;

/** Save an OTP for an email (valid for 10 minutes). */
export function saveOtp(email: string, otp: string): void {
  store.set(email, {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });
}

type VerifyResult =
  | { ok: true }
  | { ok: false; message: string; status: number };

/** Check a submitted OTP. Deletes the entry on success or when it can no longer be used. */
export function verifyOtp(email: string, submittedOtp: string): VerifyResult {
  const entry = store.get(email);

  if (!entry) {
    return { ok: false, message: "OTP expired or invalid. Please request a new OTP.", status: 400 };
  }

  if (Date.now() > entry.expiresAt) {
    store.delete(email);
    return { ok: false, message: "OTP has expired. Please request a new OTP.", status: 400 };
  }

  if (entry.otp !== submittedOtp) {
    entry.attempts += 1;
    if (entry.attempts >= MAX_ATTEMPTS) {
      store.delete(email);
      return { ok: false, message: "Too many failed attempts. Please request a new OTP.", status: 429 };
    }
    return { ok: false, message: "Invalid OTP", status: 400 };
  }

  store.delete(email);
  return { ok: true };
}
