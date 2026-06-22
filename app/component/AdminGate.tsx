// ===========================================================================
// AdminGate.tsx — Keeps admins inside the admin panel, off the public site
// ===========================================================================
//
// A real admin dashboard behaves like a separate product: once you're signed in
// as an admin you live in the panel — you don't browse the public storefront
// (Home, Vehicles, About, Contact, …). This component enforces that.
//
// HOW IT WORKS:
// It wraps the whole app (it's mounted inside <SessionProvider> in Providers.tsx,
// so it can read the login session). On every page it asks two questions:
//   1. Is the logged-in person an admin?
//   2. Are they on a page that ISN'T part of the admin experience?
// If both are true, it forwards them to "/admin" and shows a tidy little
// "Opening admin panel…" screen INSTEAD of the public page — so the storefront
// never flashes up for an admin.
//
// Non-admins (normal users, partners, logged-out visitors) are never affected:
// the gate simply renders the page as usual for them.
// ===========================================================================

'use client';

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

// The only paths an admin is allowed to open OUTSIDE the "/admin" panel:
//   - /admin       … the panel itself (and all its sub-pages)
//   - /trip        … live trip tracking, which admins launch from /admin/bookings
//   - /admin-entry … the tiny post-login router that forwards admins into /admin
//   - /vehicles    … the fleet, so an admin can pick a vehicle to book…
//   - /ride        … …request a ride…
//   - /bookings    … …and manage / pay for their own bookings.
// (Admins may now book like anyone else, so the booking screens are allowed.)
// Anything else is "public site" and gets redirected away.
const ADMIN_ALLOWED_PREFIXES = [
  "/admin",
  "/trip",
  "/admin-entry",
  "/vehicles",
  "/ride",
  "/bookings",
];

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession(); // who's logged in (and is it settled yet?)
  const pathname = usePathname();                 // the current URL, e.g. "/vehicles"
  const router = useRouter();                      // lets us send them elsewhere

  const isAdmin = session?.user?.role === "admin";

  // Is the current path part of the admin experience? A prefix matches the path
  // itself ("/admin") or anything nested under it ("/admin/users", "/trip/123").
  const onAllowedPath = ADMIN_ALLOWED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // Only redirect once the session is actually known ("authenticated"), so we
  // don't bounce people around while it's still "loading".
  const mustRedirect = status === "authenticated" && isAdmin && !onAllowedPath;

  // The redirect itself is a side effect, so it goes in useEffect (you can't
  // navigate while React is in the middle of rendering).
  useEffect(() => {
    if (mustRedirect) router.replace("/admin");
  }, [mustRedirect, router]);

  // While we're sending an admin back to the panel, show a calm placeholder
  // instead of the public page — that's what stops the storefront flashing up.
  if (mustRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <Loader2 size={18} className="animate-spin" /> Opening admin panel…
        </div>
      </div>
    );
  }

  // Everyone else (and admins already inside the panel) see the page normally.
  return <>{children}</>;
}
