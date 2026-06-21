// ===========================================================================
// AdminShell.tsx — The frame around every admin page (sidebar + content area)
// ===========================================================================
//
// This is what turns "/admin" from a normal page into a real, SEPARATE admin
// PANEL. Instead of the public floating navbar, admin pages sit inside this
// shell: a fixed sidebar on the left (Dashboard, Approvals, Users, Bookings),
// and the page's content on the right.
//
// It's applied to ALL admin pages at once by app/admin/layout.tsx, so every
// page under /admin automatically gets the same sidebar without repeating it.
//
// On phones the sidebar is hidden and slides in from the left when you tap the
// ☰ button in the small top bar.
// ===========================================================================

'use client';

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";        // tells us the current URL
import { useSession, signOut } from "next-auth/react"; // who's the admin / log out
import {
  LayoutDashboard, CarFront, Users, CalendarCheck,
  ExternalLink, LogOut, Menu, X, ShieldCheck,
} from "lucide-react";

// The sidebar links, kept as data so we can render them in a loop. `exact` marks
// the dashboard link, which should only highlight on EXACTLY "/admin" (otherwise
// it would also light up on /admin/users, etc., since those all start with it).
const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/vehicles", label: "Approvals", icon: CarFront },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();              // e.g. "/admin/users"
  const { data: session } = useSession();      // the logged-in admin's details
  const [mobileOpen, setMobileOpen] = useState(false); // is the phone drawer open?

  // Is a given link the page we're currently on? Exact links must match fully;
  // the others match if the URL starts with them.
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  // The sidebar contents, written once and reused for both the desktop sidebar
  // and the mobile slide-in drawer (so they never drift apart).
  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Brand / panel title */}
      <div className="flex items-center gap-2 px-6 py-6">
        <ShieldCheck size={20} className="text-emerald-400" />
        <div>
          <p className="text-sm font-black tracking-[0.25em] text-white">AVENTO</p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Admin panel</p>
        </div>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)} // close the drawer after tapping
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer of the sidebar: who's logged in, a link back to the public site,
          and a logout button. */}
      <div className="space-y-1 border-t border-white/10 p-3">
        {session?.user?.name && (
          <p className="truncate px-4 py-2 text-xs text-zinc-500">
            Signed in as <span className="text-zinc-300">{session.user.name}</span>
          </p>
        )}
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          <ExternalLink size={18} /> Back to site
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
        >
          <LogOut size={18} /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ---- Desktop sidebar: fixed on the left, shown from lg screens up. ---- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/10 bg-zinc-950 lg:block">
        {sidebar}
      </aside>

      {/* ---- Mobile top bar: only on small screens (the sidebar is hidden). ---- */}
      <div className="flex items-center gap-3 border-b border-white/10 bg-zinc-950 px-4 py-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open admin menu"
          className="rounded-lg border border-white/10 p-2 text-white"
        >
          <Menu size={20} />
        </button>
        <span className="text-sm font-black tracking-[0.25em]">AVENTO ADMIN</span>
      </div>

      {/* ---- Mobile drawer: the same sidebar, slid in over a dark backdrop. ---- */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Tap the dark backdrop to close. */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 border-r border-white/10 bg-zinc-950">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close admin menu"
              className="absolute right-3 top-5 rounded-lg p-1 text-zinc-400 hover:text-white"
            >
              <X size={20} />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      {/* ---- The actual page content. On large screens we leave room for the
              fixed sidebar with lg:pl-64. ---- */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-10">{children}</div>
      </main>
    </div>
  );
}
