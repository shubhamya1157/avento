// ===========================================================================
// Nav.tsx — The floating navigation bar at the top of every page
// ===========================================================================
//
// This bar shows the AVENTO logo, the page links, and either Login/Sign-Up
// buttons (when logged out) or the user's name + Logout (when logged in). On
// small screens the links collapse into a "hamburger" menu (the ☰ icon).
//
// WHAT IT NEEDS TO REMEMBER (state):
//   - is the login popup open, and in which mode (login or signup)?
//   - is the mobile hamburger menu open?
// And it asks `useSession()` whether someone is currently logged in.
// ===========================================================================

'use client';

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { User, LogOut, Menu, X, Calendar } from "lucide-react";
import AuthModal from "./AuthModal";

export default function Nav() {
  // `session` is the logged-in user's info, or null/undefined if logged out.
  const { data: session } = useSession();

  // Whether the login/signup popup is open, and which tab it should show.
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  // Whether the small-screen dropdown menu is open.
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Open the auth popup in a chosen mode, and close the mobile menu at the same
  // time (so they don't overlap). Reused by several buttons below.
  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
    setMobileMenuOpen(false);
  };

  // The page links, kept in one array so we can render them with a loop instead
  // of copy-pasting the same markup four times.
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/vehicles", label: "Vehicles" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    // The <> ... </> fragment lets us return the nav bar AND the auth popup
    // side by side without an extra wrapper element.
    <>
      <nav className="fixed top-4 left-1/2 z-[9999] w-[95%] max-w-7xl -translate-x-1/2">
        <div className="relative flex h-20 items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-6 md:px-8 backdrop-blur-xl">
          {/* Logo — clicking it returns home */}
          <Link href="/">
            <h1 className="cursor-pointer bg-gradient-to-r from-white via-gray-200 to-gray-500 bg-clip-text text-2xl font-black tracking-[0.3em] text-transparent">
              AVENTO
            </h1>
          </Link>

          {/* Center links — hidden on phones ("hidden md:flex" = show only from
              medium screens up), shown as a row on larger screens. */}
          <div className="hidden md:flex flex-1 justify-center items-center gap-8 lg:gap-10">
            {/* Loop over navLinks and draw one <Link> for each. React needs a
                unique `key` on each looped item to track them efficiently. */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-zinc-300 transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            {/* "My Bookings" only appears when logged in. The `session && (...)`
                trick means: if session exists, render what's in the parens. */}
            {session && (
              <Link
                href="/bookings"
                className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 transition hover:text-white"
              >
                <Calendar size={14} />
                My Bookings
              </Link>
            )}
          </div>

          {/* Right side (desktop): show user info+Logout, OR Login+Sign-Up.
              The "? :" is a ternary — a compact if/else inside the markup. */}
          <div className="hidden md:flex items-center gap-3 min-w-[160px] justify-end">
            {session ? (
              // ----- Logged IN -----
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200">
                  <User size={14} className="text-zinc-400" />
                  <span className="font-medium max-w-[120px] truncate">
                    {/* Show their name, or "User" as a fallback if missing */}
                    {session.user?.name || "User"}
                  </span>
                </div>
                <button
                  // signOut logs them out, then sends them to the home page.
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-1 text-sm font-medium text-zinc-400 transition hover:text-white"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            ) : (
              // ----- Logged OUT -----
              <>
                <button
                  onClick={() => openAuth("login")}
                  className="rounded-full px-4 py-2 text-sm font-medium text-zinc-300 transition hover:text-white"
                >
                  Login
                </button>
                <button
                  onClick={() => openAuth("signup")}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black shadow-sm transition-transform duration-150 hover:scale-105"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>

          {/* Hamburger button — only shown on phones ("md:hidden"). Clicking it
              flips the mobile menu open/closed, swapping between ☰ and ✕. */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* A thin glowing line along the bottom edge of the bar (decoration) */}
          <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>

        {/* The dropdown panel for phones. Only rendered when mobileMenuOpen is
            true. It repeats the same links and auth buttons in a vertical stack. */}
        {mobileMenuOpen && (
          <div className="mt-2 flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/90 p-6 backdrop-blur-xl md:hidden">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)} // close menu after tap
                className="text-sm font-medium text-zinc-300 transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            {session && (
              <Link
                href="/bookings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 transition hover:text-white"
              >
                <Calendar size={14} />
                My Bookings
              </Link>
            )}

            <div className="my-2 h-px bg-white/10" />

            {session ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <User size={16} className="text-zinc-500" />
                  <span>{session.user?.name || "User"}</span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="flex items-center gap-2 text-left text-sm font-medium text-zinc-400 transition hover:text-white"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => openAuth("login")}
                  className="text-left text-sm font-medium text-zinc-300 transition hover:text-white"
                >
                  Login
                </button>
                <button
                  onClick={() => openAuth("signup")}
                  className="rounded-full border border-white/10 bg-white/10 py-2.5 text-center text-sm font-medium text-white transition-all hover:bg-white/20"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* The login/signup popup itself. It sits here always, but only shows when
          `authOpen` is true. `initialMode` decides which tab it opens on. */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}
