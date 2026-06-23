// ===========================================================================
// ConfirmDialog.tsx — A reusable "are you sure?" pop-up for risky actions
// ===========================================================================
//
// The browser's built-in confirm() box is ugly and can't show a breakdown. This
// is an on-brand replacement (same dark glass look as BookingModal / AuthModal)
// used for DESTRUCTIVE actions like deleting a record. It can list a few "detail"
// lines — e.g. "3 bookings", "8 chat messages" — so the admin sees exactly what a
// cascade delete will remove before committing.
//
// It's a "controlled" component: the PARENT decides when it's open (by rendering
// it or not) and handles onConfirm / onClose. This file just draws it.
// ===========================================================================

'use client';

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  // Optional bullet lines shown in a panel (e.g. the cascade-delete counts).
  details?: string[];
  confirmLabel?: string;   // defaults to "Confirm"
  cancelLabel?: string;    // defaults to "Cancel"
  destructive?: boolean;   // true -> red confirm button (a delete, etc.)
  loading?: boolean;       // true -> spinner on the confirm button + disabled
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  details,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  // A handle on the panel so we can move keyboard focus into it when it opens.
  const panelRef = useRef<HTMLDivElement>(null);

  // While open: close on Escape, lock the page behind it, and focus the panel.
  // Undone on close via the cleanup. Guards on `open` so the hook runs every
  // render (hooks can't sit below an early return) but only acts when shown.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      // Don't let Escape close it mid-delete (avoids a confusing half-action).
      if (e.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, loading, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
          {/* Click-to-close backdrop (disabled while an action is in flight). */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !loading && onClose()}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          <motion.div
            ref={panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/90 p-7 shadow-2xl outline-none backdrop-blur-xl"
          >
            {/* Close (X) — hidden while loading so the action can't be abandoned half-way. */}
            {!loading && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-5 top-5 text-zinc-500 transition hover:text-white"
              >
                <X size={18} />
              </button>
            )}

            {/* Icon + title. For a destructive action we lead with a red warning. */}
            <div className="flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
                  destructive
                    ? "border-red-500/20 bg-red-500/10 text-red-400"
                    : "border-white/15 bg-white/10 text-white"
                }`}
              >
                <AlertTriangle size={20} />
              </div>
              <div className="pt-1">
                <h3 className="text-lg font-black tracking-wide text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{message}</p>
              </div>
            </div>

            {/* The breakdown panel (e.g. what a cascade delete will remove). */}
            {details && details.length > 0 && (
              <ul className="mt-5 space-y-1.5 rounded-2xl border border-white/10 bg-zinc-900/60 p-4 text-sm text-zinc-300">
                {details.map((line) => (
                  <li key={line} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
                    {line}
                  </li>
                ))}
              </ul>
            )}

            {/* Buttons. The confirm turns red for destructive actions. */}
            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-1/3 rounded-xl border border-white/10 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`flex w-2/3 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition active:scale-[0.98] disabled:opacity-60 ${
                  destructive
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-white text-black hover:bg-zinc-200"
                }`}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
