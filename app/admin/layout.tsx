// ===========================================================================
// admin/layout.tsx — The shared wrapper for EVERY page under "/admin"
// ===========================================================================
//
// In Next.js, a "layout.tsx" inside a folder wraps every page in that folder
// (and its subfolders). So this one file applies to /admin, /admin/vehicles,
// /admin/users and /admin/bookings all at once.
//
// We use it to enforce two things in ONE place instead of repeating them on
// every admin page:
//   1. <AdminGuard> — only admins get past it (non-admins see "access denied").
//   2. <AdminShell> — the sidebar + content frame that makes this a real panel.
//
// Because of this, the individual admin pages below only need to return their
// own content — no Nav, no guard, no sidebar boilerplate.
// ===========================================================================

import AdminGuard from "@/app/component/AdminGuard";
import AdminShell from "@/app/component/AdminShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}
