// ===========================================================================
// AuthModal.tsx — The login / sign-up popup ("modal")
// ===========================================================================
//
// A "modal" is a popup box that appears on top of the page with a dark, blurred
// backdrop behind it, forcing the user to focus on it (here, logging in).
//
// This file does a lot, so here's the map:
//   - LOGIN: one form -> email + password -> NextAuth checks it.
//   - SIGN-UP: THREE steps tracked by `signupStep`:
//       "form"    -> collect name/email/password, then email an OTP code
//       "otp"     -> user types the 6-digit code we emailed them
//       "success" -> account created; we auto-log them in
//
// There are two components below:
//   - AuthModalPanel: the actual box and all the form logic.
//   - AuthModal:      the wrapper that handles the backdrop and open/close.
// ===========================================================================

// "use client" tells Next.js this file runs in the visitor's browser (not just
// on the server). We need that here because the popup reacts to typing and
// clicks, which can only happen in the browser.
"use client";

// `useState` is a React "hook" — a special function (its name starts with
// "use") that lets a component remember a value between redraws. When that value
// changes, React automatically re-draws the screen to match.
import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, CheckCircle2 } from "lucide-react";

// The official multi-colour Google "G" mark, as an inline SVG so it needs no
// extra file or icon package. Used on the "Continue with Google" button.
function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-23.5Z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 0 0 6.3 14.7Z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44Z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.8 36 44 30.6 44 24c0-1.2-.1-2.4-.4-3.5Z"/>
    </svg>
  );
}

// These "type" lines list the only allowed values for our two mode trackers,
// so a typo like "signin" would be caught immediately by the editor.
type AuthMode = "login" | "signup";
type SignupStep = "form" | "otp" | "success";

// The props (inputs) this modal accepts from whoever uses it (e.g. Nav.tsx).
interface AuthModalProps {
  open: boolean;          // should the popup be visible?
  onClose: () => void;    // function to call when it should close
  initialMode?: AuthMode; // open on "login" or "signup"? (optional)
}

// ---------------------------------------------------------------------------
// The inner panel: the white box with the forms. It's a separate component so
// that each time the popup opens it starts FRESH (see the `key` trick at the
// very bottom), clearing any half-typed input from last time.
// ---------------------------------------------------------------------------
function AuthModalPanel({
  initialMode,
  onClose,
}: {
  initialMode: AuthMode;
  onClose: () => void;
}) {
  // Which screen are we on, and the values typed into each input field.
  // Each useState gives back a PAIR: the current value (e.g. `mode`) and a
  // function to change it (e.g. `setMode`). Calling the setter updates the value
  // AND tells React to redraw with the new value. The text in useState(...) is
  // the starting value.
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [signupStep, setSignupStep] = useState<SignupStep>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  // `loading` is true while we wait for the server, so we can disable buttons
  // and show a spinner. `error` holds a message to display if something fails.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `router` lets us send the user to another page in code (e.g. straight to the
  // admin panel after an admin signs in).
  const router = useRouter();

  const handleClose = () => {
    onClose();
  };

  // Called right after a successful email/password login. We ask the server for
  // the fresh session so we can read the user's role: admins are taken straight
  // to the admin panel, everyone else just stays where they are (popup closes).
  const finishLogin = async () => {
    const session = await getSession();
    handleClose();
    if (session?.user?.role === "admin") {
      router.push("/admin");
    }
  };

  // -------------------------------------------------------------------------
  // LOGIN: send email + password to NextAuth and react to the result.
  //
  // `async` marks a function that does slow work (like talking to a server) and
  // can "pause" without freezing the page. `await` is that pause: it waits for a
  // "promise" (a placeholder for a result that isn't ready yet) to finish, then
  // hands back the real value. `signIn` is NextAuth's helper that checks the
  // login. `e` is the form-submit event the browser gives us.
  // -------------------------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    // A "form submit" happens when the user presses the submit button. By
    // default the browser would reload the whole page; preventDefault() stops
    // that so our code can handle the login instead.
    e.preventDefault();   // stop the browser's default "reload the page" on submit
    setLoading(true);
    setError(null);

    try {
      // `redirect: false` means "don't navigate away; just tell me the result"
      // so we can show errors inside this popup.
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // NextAuth only returns the error code "CredentialsSignin" to the
        // browser, so show a friendly message instead of the raw code.
        setError("Invalid email or password. Make sure your email is verified.");
        return;
      }

      await finishLogin(); // logged in — close the popup (admins go to /admin)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      // `finally` always runs, success or failure — perfect for turning the
      // loading spinner back off.
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // SIGN-UP STEP 1: ask the server to email a verification code.
  // -------------------------------------------------------------------------
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Call our own API route. `fetch` sends an HTTP request from the browser.
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // we're sending JSON
        body: JSON.stringify({ email }),                 // turn data into JSON text
      });

      const data = await res.json(); // read the server's JSON reply

      // res.ok is true for success codes (200–299). If not ok, show the error.
      if (!res.ok) {
        throw new Error(data.message || "Failed to send OTP");
      }

      setSignupStep("otp"); // move on to the "enter the code" screen
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // SIGN-UP STEP 2: send the typed code + details; the server creates the
  // account, then we automatically log the new user in.
  // -------------------------------------------------------------------------
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Quick client-side check before bothering the server.
      if (!otp || otp.length !== 6) {
        throw new Error("Please enter a valid 6-digit OTP");
      }

      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, name, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "OTP verification failed");
      }

      setSignupStep("success"); // show the success checkmark screen

      // Auto-login after successful verification. We wait 1.5s (setTimeout) so
      // the user briefly sees the "Access Granted" message before we sign them
      // in and close the popup.
      setTimeout(async () => {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.ok) {
          await finishLogin(); // admins land on /admin, others just close
        }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // The sign-up "form" step's submit handler: validate the fields, then reuse
  // handleSendOTP to actually email the code.
  // -------------------------------------------------------------------------
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      setError("All fields are required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    await handleSendOTP(e);
  };

  // -------------------------------------------------------------------------
  // The visible part. `motion.div` is an animated div (it scales/fades in).
  // Below it, the big "? :" chains pick WHICH form to show based on `mode` and
  // `signupStep`.
  // -------------------------------------------------------------------------
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.25 }}
      className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/95 p-6 sm:p-8 text-white shadow-2xl backdrop-blur-xl"
      // Clicking inside the box should NOT close it. stopPropagation stops the
      // click from "bubbling up" to the backdrop, whose job is to close on click.
      onClick={(e) => e.stopPropagation()}
    >
      {/* The X close button in the top-right corner */}
      <button
        type="button"
        onClick={handleClose}
        className="absolute right-5 top-5 text-zinc-500 transition hover:text-white cursor-pointer"
        aria-label="Close"
      >
        <X size={20} />
      </button>

      {/* The heading + subtitle, whose text changes for each screen */}
      <div className="mb-6 space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
          AVENTO
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          {/* A "ternary" (condition ? A : B) is a compact if/else: it shows A
              when the condition is true, otherwise B. Chaining them picks one
              of several headings depending on which screen we're on. */}
          {mode === "login"
            ? "Welcome back"
            : signupStep === "form"
            ? "Create your account"
            : signupStep === "otp"
            ? "Verify your email"
            : "You're all set"}
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          {mode === "login"
            ? "Sign in to access your bookings and dashboard."
            : signupStep === "form"
            ? "Sign up to start booking from our fleet."
            : signupStep === "otp"
            ? "Enter the 6-digit code we sent to your email."
            : "Your account has been created successfully."}
        </p>
      </div>

      {/* If there's an error message, show it in a red box. Otherwise show nothing. */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* ---- WHICH FORM TO SHOW ---- */}
      {mode === "login" ? (
        // ===== LOGIN FORM =====
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">
              Email
            </label>
            {/* A "controlled input": its value comes from state (email), and
                onChange updates that state on every keystroke. */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-white/20 focus:bg-white/8"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">
              Password
            </label>
            <input
              type="password" // hides the characters as dots
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-white/20 focus:bg-white/8"
            />
          </div>

          <button
            type="submit"
            disabled={loading} // can't click again while a request is in flight
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-bold text-black transition-all hover:bg-zinc-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
          >
            {/* Show a spinning icon while loading */}
            {loading && <Loader2 size={16} className="animate-spin" />}
            Sign in
          </button>
        </form>
      ) : signupStep === "form" ? (
        // ===== SIGN-UP STEP 1: details form =====
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">
              Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your name"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-white/20 focus:bg-white/8"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-white/20 focus:bg-white/8"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-white/20 focus:bg-white/8"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-bold text-black transition-all hover:bg-zinc-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Create account
          </button>
        </form>
      ) : signupStep === "otp" ? (
        // ===== SIGN-UP STEP 2: enter the emailed code =====
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs text-zinc-400 mb-2">Verification code sent to:</p>
            <p className="text-sm font-semibold text-white break-all">{email}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">
              6-digit code
            </label>
            <input
              type="text"
              value={otp}
              // This onChange keeps ONLY digits and trims to 6 characters:
              //   replace(/\D/g, '') deletes anything that's not a digit,
              //   slice(0, 6) keeps at most the first 6.
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
              placeholder="000000"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-white placeholder-zinc-700 outline-none transition-all focus:border-white/20 focus:bg-white/8 text-center tracking-widest font-mono"
            />
            <p className="text-[11px] text-zinc-500">The code expires in 10 minutes.</p>
          </div>

          <button
            type="submit"
            // Disabled until exactly 6 digits are entered (and not loading).
            disabled={loading || otp.length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-bold text-black transition-all hover:bg-zinc-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Verify & continue
          </button>

          {/* Let the user go back to fix their details and resend a code */}
          <button
            type="button"
            onClick={() => {
              setOtp("");
              setSignupStep("form");
              setError(null);
            }}
            className="w-full text-xs text-zinc-400 hover:text-zinc-200 transition"
          >
            Back
          </button>
        </form>
      ) : (
        // ===== SIGN-UP STEP 3: success screen (auto-login happens behind it) =====
        <div className="space-y-4">
          <div className="flex justify-center">
            <CheckCircle2 size={64} className="text-green-500 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-zinc-300">Signing you in…</p>
            <p className="text-xs text-zinc-500">Taking you to your dashboard.</p>
          </div>
        </div>
      )}

      {/* "Continue with Google" — shown on the login screen and the first step of
          sign-up (not during OTP entry or the success screen). */}
      {(mode === "login" || (mode === "signup" && signupStep === "form")) && (
        <>
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            // Start the Google login flow, returning home afterward.
            onClick={() => signIn("google", { callbackUrl: "/admin-entry" })}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 cursor-pointer"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </>
      )}

      {/* The bottom link that flips between login and sign-up modes */}
      <p className="mt-6 text-center text-sm text-zinc-500">
        {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            // Flip the mode, and reset the sign-up flow + clear errors/code.
            setMode(mode === "login" ? "signup" : "login");
            setSignupStep("form");
            setError(null);
            setOtp("");
          }}
          className="font-semibold text-white underline underline-offset-4 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          {mode === "login" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// The outer wrapper: the dark backdrop + centering, and the open/close logic.
// AnimatePresence lets the popup animate OUT smoothly when it closes (without
// it, a closing element would just vanish instantly).
// ---------------------------------------------------------------------------
export default function AuthModal({ open, onClose, initialMode = "login" }: AuthModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* The dark, blurred backdrop. Clicking it calls onClose. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* The panel. The `key={initialMode}` forces React to build a brand-new
              panel whenever the mode changes, which resets all its typed-in
              fields to empty — a clean slate each time it opens. */}
          <AuthModalPanel key={initialMode} initialMode={initialMode} onClose={onClose} />
        </div>
      )}
    </AnimatePresence>
  );
}
