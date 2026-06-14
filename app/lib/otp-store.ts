// ===========================================================================
// otp-store.ts — Temporary storage for sign-up verification codes (OTPs)
// ===========================================================================
//
// WHAT IS AN OTP?
// OTP = "One-Time Password": a short code (here, 6 digits) we email to someone
// during sign-up to prove they really own that email address. They type the
// code back to us; if it matches, we know the email is theirs.
//
// WHERE DO WE KEEP THE CODE WHILE WE WAIT?
// We keep it in a "Map" — a built-in JavaScript structure that stores
// key → value pairs, like a dictionary. Here the key is the email and the
// value is the code (plus when it expires and how many tries were used).
//
// NOTE: This Map lives in the server's memory (RAM). That's perfect for local
// development, but it has two consequences: (1) all codes vanish if the server
// restarts, and (2) it only works for a single server. For a real production
// app running on many servers, you'd swap this for Redis or a database table.
// ===========================================================================

// The shape of one stored OTP entry.
interface OtpEntry {
  otp: string;       // the 6-digit code
  expiresAt: number; // the moment it stops being valid, as epoch milliseconds
  attempts: number;  // how many wrong guesses have been made so far
}

// ---------------------------------------------------------------------------
// Keep the SAME Map across hot-reloads in development by stashing it on the
// global object (same trick as the database connection in db.ts). Without
// this, every code save during dev would land in a fresh, empty Map.
// ---------------------------------------------------------------------------
const globalForOtp = globalThis as unknown as {
  otpStore?: Map<string, OtpEntry>;
};

// Reuse the existing Map if present, otherwise make a new empty one, then make
// sure it's stored globally for next time.
const store = globalForOtp.otpStore ?? new Map<string, OtpEntry>();
globalForOtp.otpStore = store;

// Configuration constants. Naming them makes the rules obvious and easy to
// change in one place.
const OTP_TTL_MS = 10 * 60 * 1000; // "Time To Live": 10 minutes in milliseconds
const MAX_ATTEMPTS = 3;            // lock the code after 3 wrong guesses

// ---------------------------------------------------------------------------
// saveOtp: remember a freshly generated code for an email. Calling it again
// for the same email overwrites the old code and resets the attempt counter.
// ---------------------------------------------------------------------------
/** Save an OTP for an email (valid for 10 minutes). */
export function saveOtp(email: string, otp: string): void {
  store.set(email, {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS, // now + 10 minutes
    attempts: 0,
  });
}

// The two possible outcomes of checking a code. A "discriminated union": when
// `ok` is true there's nothing else; when `ok` is false we also get a message
// and an HTTP status code to send back. TypeScript forces us to check `ok`
// before reading `message`, preventing mistakes.
type VerifyResult =
  | { ok: true }
  | { ok: false; message: string; status: number };

// ---------------------------------------------------------------------------
// verifyOtp: check a code the user submitted. We delete the stored entry as
// soon as it can no longer be used (correct guess, expired, or too many tries)
// so a code can never be reused.
// ---------------------------------------------------------------------------
/** Check a submitted OTP. Deletes the entry on success or when it can no longer be used. */
export function verifyOtp(email: string, submittedOtp: string): VerifyResult {
  const entry = store.get(email);

  // No saved code for this email — they never requested one, or it already
  // expired/was used and got deleted.
  if (!entry) {
    return { ok: false, message: "OTP expired or invalid. Please request a new OTP.", status: 400 };
  }

  // The code is too old. Remove it and ask for a new one.
  if (Date.now() > entry.expiresAt) {
    store.delete(email);
    return { ok: false, message: "OTP has expired. Please request a new OTP.", status: 400 };
  }

  // The code doesn't match. Count the failed attempt.
  if (entry.otp !== submittedOtp) {
    entry.attempts += 1;
    // Too many wrong guesses: throw the code away so an attacker can't keep
    // guessing forever. 429 means "Too Many Requests".
    if (entry.attempts >= MAX_ATTEMPTS) {
      store.delete(email);
      return { ok: false, message: "Too many failed attempts. Please request a new OTP.", status: 429 };
    }
    return { ok: false, message: "Invalid OTP", status: 400 };
  }

  // Correct! Delete the entry so the same code can't be used twice, then
  // report success.
  store.delete(email);
  return { ok: true };
}
