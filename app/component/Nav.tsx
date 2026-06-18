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

// 'use client' tells Next.js this file runs in the visitor's BROWSER (not only
// on the server). We need that here because the nav bar is interactive: it has
// buttons to click, popups to open, and it remembers things while you use it.
'use client';

// "import" means: borrow a tool that was built somewhere else so we can use it
// here. Each line below pulls in one or more named tools.
import { useState } from "react";                      // useState = React's memory tool (explained below)
import Link from "next/link";                          // Link = Next.js's fast in-app link (no full page reload)
import { useSession, signOut } from "next-auth/react"; // login helpers: read who's logged in / log them out
import { User, LogOut, Menu, X, Calendar } from "lucide-react"; // ready-made icon shapes
import AuthModal from "./AuthModal";                   // our own login/sign-up popup, from a sibling file

// A "component" is a reusable piece of screen, written as a function that
// returns the markup to show. "export default" makes Nav the main thing this
// file hands out, so other files can drop <Nav /> into their pages.
export default function Nav() {
  // A "hook" is a special React function whose name starts with "use". Hooks let
  // a component tap into React features like memory and login state.
  // useSession() asks the login system who is signed in. We pull out its `data`
  // field and rename it to `session` ({ data: session } is "destructuring" —
  // unpacking one named value out of a bigger object).
  // `session` is the logged-in user's info, or null/undefined if logged out.
  const { data: session } = useSession();

  // useState is React's MEMORY. It gives back two things in an array:
  //   [theCurrentValue, aFunctionToChangeIt]
  // We unpack them with [a, b] = ... . Whenever we call the change-function,
  // React automatically re-draws this component with the new value.
  // Here: is the login/sign-up popup open? It starts closed (false).
  const [authOpen, setAuthOpen] = useState(false);
  // Which tab the popup opens on. The <"login" | "signup"> part is TypeScript
  // promising this can only ever be one of those two exact words.
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  // Whether the small-screen dropdown menu is open. Starts closed.
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // This is an "arrow function" — a small reusable action written as
  // (inputs) => { steps }. We give it a name, openAuth, so buttons can call it.
  // Open the auth popup in a chosen mode, and close the mobile menu at the same
  // time (so they don't overlap). Reused by several buttons below.
  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);     // remember which tab to show
    setAuthOpen(true);     // make the popup visible
    setMobileMenuOpen(false); // tidy up: close the phone menu if it was open
  };

  // An "array" is just an ordered list, written inside [ ]. Here each item is an
  // "object" ({ ... }), a little bundle of labelled values — a web address
  // (href) and the text to show (label).
  // The page links, kept in one array so we can render them with a loop instead
  // of copy-pasting the same markup four times.
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/vehicles", label: "Vehicles" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  // Everything after "return (" is JSX: HTML-like markup that describes what to
  // put on screen. Inside JSX you write comments as {/* like this */}, because
  // the normal // would be treated as text and break the layout.
  return (
    // The <> ... </> is a "Fragment": an empty wrapper that lets us return the
    // nav bar AND the auth popup side by side without adding an extra <div>.
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
            {/* .map() walks through every item in a list and produces one piece
                of markup per item — like a stamp pressed once per link. Curly
                braces { } let us drop this JavaScript result into the JSX.
                Loop over navLinks and draw one <Link> for each. React needs a
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
                  // onClick says "when this button is clicked, run this action".
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

      {/* The login/signup popup itself. The things we pass into it (open,
          onClose, initialMode) are called "props" — inputs handed to a child
          component, like settings you flip when you place it.
          It sits here always, but only shows when `authOpen` is true.
          onClose is the action it runs to close itself (we set authOpen back to
          false). `initialMode` decides which tab it opens on. */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}
