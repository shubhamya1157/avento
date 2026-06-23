// ===========================================================================
// use-cascade-delete.ts — A small React hook for the admin "Delete" flow
// ===========================================================================
//
// Three admin lists (bookings, vehicles, users) all delete a row the same way:
//   1. The admin clicks Delete -> we ask the server (dryRun) how much a delete
//      would remove, and open a confirm dialog showing that breakdown.
//   2. The admin confirms -> we actually delete, then drop the row from the list.
//
// Rather than copy that dance into every page, it lives here once. This is a
// CLIENT hook (it runs in the browser and uses React state) — it talks to the
// DELETE API routes by URL and never imports server code, so the type below is
// declared locally rather than pulled from app/lib/cascade-delete.ts.
// ===========================================================================

'use client';

import { useState } from "react";

// The count summary the DELETE routes return (mirror of DeleteSummary on the
// server — kept here so this client file imports no server module).
export interface DeleteCounts {
  bookings: number;
  vehicles: number;
  reviews: number;
  messages: number;
  users: number;
}

// What the admin asked to delete: its id, a human label for the dialog, and
// which COUNT field represents the row itself (so we don't list "1 booking" when
// the dialog already says "Delete this booking").
export interface PendingDelete {
  id: string;
  label: string;
  self: keyof DeleteCounts;
}

// Turn a count summary into friendly bullet lines for the dialog, skipping the
// "self" field (the row itself) and any zero counts. e.g. ["3 bookings",
// "8 chat messages"]. Empty array -> the dialog shows just its message.
export function describeCounts(counts: DeleteCounts | null, self: keyof DeleteCounts): string[] {
  if (!counts) return [];
  const labels: [keyof DeleteCounts, string, string][] = [
    ["users", "user account", "user accounts"],
    ["vehicles", "vehicle", "vehicles"],
    ["bookings", "booking", "bookings"],
    ["reviews", "review", "reviews"],
    ["messages", "chat message", "chat messages"],
  ];
  return labels
    .filter(([key]) => key !== self && counts[key] > 0)
    .map(([key, singular, plural]) => `${counts[key]} ${counts[key] === 1 ? singular : plural}`);
}

export function useCascadeDelete(opts: {
  // Build the DELETE url for a given id (e.g. id => `/api/admin/users/${id}`).
  endpoint: (id: string) => string;
  // Remove the just-deleted row from the page's local list state.
  onDeleted: (id: string) => void;
  // Surface an error message in the page's banner.
  onError?: (message: string) => void;
}) {
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [counts, setCounts] = useState<DeleteCounts | null>(null);
  const [busy, setBusy] = useState(false); // the real delete is in flight

  // Step 1: open the dialog, then fetch the preview counts (best-effort — the
  // dialog still works if the preview fails, it just won't show the breakdown).
  const ask = async (target: PendingDelete) => {
    setPending(target);
    setCounts(null);
    try {
      const res = await fetch(`${opts.endpoint(target.id)}?dryRun=1`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) setCounts(data.deleted as DeleteCounts);
    } catch {
      /* preview is optional; ignore and let the admin confirm without counts */
    }
  };

  // Close the dialog (ignored while a delete is actually running).
  const cancel = () => {
    if (busy) return;
    setPending(null);
    setCounts(null);
  };

  // Step 2: actually delete, then drop the row.
  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const res = await fetch(opts.endpoint(pending.id), { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete");
      opts.onDeleted(pending.id);
      setPending(null);
      setCounts(null);
    } catch (err) {
      opts.onError?.(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  };

  return { pending, counts, busy, ask, cancel, confirm };
}
