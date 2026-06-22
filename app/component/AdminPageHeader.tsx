// ===========================================================================
// AdminPageHeader.tsx — One consistent heading for every admin page
// ===========================================================================
//
// Every screen in the admin panel (Dashboard, Approvals, Users, Bookings) opens
// with the same kind of heading: a big title, an optional one-line description,
// and sometimes a small extra on the right (like a "12 total" count). Putting
// that in ONE component means all the pages look identical and we only have to
// adjust the spacing/size in a single place.
//
// Props (the inputs a parent hands in):
//   - eyebrow:     a tiny spaced-out label above the title, e.g. "Control room" (optional)
//   - title:       the big heading text (required)
//   - description: a short muted line under the title (optional)
//   - right:       anything to show on the far right, e.g. a count badge (optional)
// ===========================================================================

import type { ReactNode } from "react";

export default function AdminPageHeader({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        {/* The little spaced-out kicker above the title (a premium touch). */}
        {eyebrow && (
          <span className="block text-xs uppercase tracking-[0.4em] text-zinc-500">{eyebrow}</span>
        )}
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {/* Only render the description line if one was passed in. */}
        {description && (
          <p className="text-sm text-zinc-400">{description}</p>
        )}
      </div>
      {/* The optional right-hand slot (e.g. a "12 total" pill). */}
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
