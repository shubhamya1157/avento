// ===========================================================================
// AdminGuard.tsx — Wrap admin pages so only admins can see them
// ===========================================================================
//
// The admin API routes are already protected on the SERVER (see lib/guards.ts).
// This component is the matching FRONTEND gate: it makes sure a non-admin who
// types "/admin" into the address bar sees a friendly "access denied" screen
// instead of a broken page. Wrap any admin page's contents in <AdminGuard>…
//
// It shows three things depending on the login state:
//   - loading     -> a spinner
//   - not an admin -> an "access denied" message
//   - an admin     -> the actual page (its `children`)
// ===========================================================================

'use client';

import { useSession } from "next-auth/react";
import Nav from "./Nav";
import Footer from "./Footer";
import { Loader2, ShieldAlert } from "lucide-react";

// `children` is whatever JSX we wrap inside <AdminGuard>...</AdminGuard> — the
// real admin page content we only want admins to see.
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  // Still checking who's logged in -> show a spinner.
  if (status === "loading") {
    return (
      <>
        <Nav />
        <div className="flex min-h-screen w-full items-center justify-center bg-black">
          <Loader2 size={36} className="animate-spin text-zinc-500" />
        </div>
        <Footer />
      </>
    );
  }

  // Logged out, or logged in but not an admin -> access denied.
  if (status !== "authenticated" || session?.user?.role !== "admin") {
    return (
      <>
        <Nav />
        <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
          <ShieldAlert size={48} className="mb-6 text-red-400" />
          <h1 className="text-2xl font-black tracking-wide">Access Denied</h1>
          <p className="mt-3 max-w-sm text-sm text-zinc-400">
            This area is for administrators only. If you believe this is a mistake, make sure your
            email is listed in the ADMIN_EMAILS setting and log in again.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  // An admin — show the real page.
  return <>{children}</>;
}
