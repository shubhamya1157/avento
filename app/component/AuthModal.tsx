"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, CheckCircle2 } from "lucide-react";

type AuthMode = "login" | "signup";
type SignupStep = "form" | "otp" | "success";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

function AuthModalPanel({
  initialMode,
  onClose,
}: {
  initialMode: AuthMode;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [signupStep, setSignupStep] = useState<SignupStep>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
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

      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to send OTP");
      }

      setSignupStep("otp");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
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

      setSignupStep("success");

      // Auto-login after successful verification
      setTimeout(async () => {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.ok) {
          handleClose();
        }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.25 }}
      className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/95 p-6 sm:p-8 text-white shadow-2xl backdrop-blur-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={handleClose}
        className="absolute right-5 top-5 text-zinc-500 transition hover:text-white cursor-pointer"
        aria-label="Close"
      >
        <X size={20} />
      </button>

      <div className="mb-6 space-y-1.5">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          AVENTO CLUB ACCESS
        </span>
        <h2 className="text-2xl font-black tracking-tight text-white uppercase">
          {mode === "login"
            ? "RE-ESTABLISH CONNECTION"
            : signupStep === "form"
            ? "JOIN THE COLLECTIVE"
            : signupStep === "otp"
            ? "VERIFY YOUR EMAIL"
            : "ACCESS GRANTED"}
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed font-light">
          {mode === "login"
            ? "Enter your credentials to access your personal dashboard and bookings."
            : signupStep === "form"
            ? "Register access keys to unlock immediate booking across our luxury fleet."
            : signupStep === "otp"
            ? "Enter the 6-digit code sent to your email."
            : "Your account has been created and verified successfully!"}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {mode === "login" ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Email / Member ID
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="e.g. shubhamya.1157@gmail.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none transition-all focus:border-white/20 focus:bg-white/8"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Password / Passphrase
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none transition-all focus:border-white/20 focus:bg-white/8"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-bold text-black transition-all hover:bg-zinc-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            INITIATE SESSION
          </button>
        </form>
      ) : signupStep === "form" ? (
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Shubham Yadav"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none transition-all focus:border-white/20 focus:bg-white/8"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Email / Member ID
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="e.g. shubhamya.1157@gmail.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none transition-all focus:border-white/20 focus:bg-white/8"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Password / Passphrase
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none transition-all focus:border-white/20 focus:bg-white/8"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-bold text-black transition-all hover:bg-zinc-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            COMMISSION ACCESS
          </button>
        </form>
      ) : signupStep === "otp" ? (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs text-zinc-400 mb-2">Verification code sent to:</p>
            <p className="text-sm font-semibold text-white break-all">{email}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Enter OTP (6 digits)
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
              placeholder="000000"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-white placeholder-zinc-700 outline-none transition-all focus:border-white/20 focus:bg-white/8 text-center tracking-widest font-mono"
            />
            <p className="text-[10px] text-zinc-500">OTP expires in 10 minutes</p>
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-bold text-black transition-all hover:bg-zinc-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            VERIFY & ACTIVATE
          </button>

          <button
            type="button"
            onClick={() => {
              setOtp("");
              setSignupStep("form");
              setError(null);
            }}
            className="w-full text-xs text-zinc-400 hover:text-zinc-200 transition"
          >
            Back to Registration
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center">
            <CheckCircle2 size={64} className="text-green-500 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-zinc-300">Your account is being activated...</p>
            <p className="text-xs text-zinc-500">Redirecting to dashboard</p>
          </div>
        </div>
      )}

      {mode === "login" && (
        <>
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600">AUTHENTICATION CHANNEL</span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/10 cursor-pointer"
          >
            Continue with Google
          </button>
        </>
      )}

      <p className="mt-6 text-center text-xs text-zinc-500">
        {mode === "login" ? "New to the collective?" : "Already initiated?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setSignupStep("form");
            setError(null);
            setOtp("");
          }}
          className="font-semibold text-white underline underline-offset-4 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          {mode === "login" ? "Commission access keys" : "Authenticate keys"}
        </button>
      </p>
    </motion.div>
  );
}

export default function AuthModal({ open, onClose, initialMode = "login" }: AuthModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          <AuthModalPanel key={initialMode} initialMode={initialMode} onClose={onClose} />
        </div>
      )}
    </AnimatePresence>
  );
}
