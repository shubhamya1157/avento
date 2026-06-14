'use client';

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { User, LogOut, Menu, X, Calendar } from "lucide-react";
import AuthModal from "./AuthModal";

export default function Nav() {
  const { data: session } = useSession();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/vehicles", label: "Vehicles" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <>
      <nav className="fixed top-4 left-1/2 z-[9999] w-[95%] max-w-7xl -translate-x-1/2">
        <div className="relative flex h-20 items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-6 md:px-8 backdrop-blur-xl">
          <Link href="/">
            <h1 className="cursor-pointer bg-gradient-to-r from-white via-gray-200 to-gray-500 bg-clip-text text-2xl font-black tracking-[0.3em] text-transparent">
              AVENTO
            </h1>
          </Link>

          <div className="hidden md:flex flex-1 justify-center items-center gap-8 lg:gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-zinc-300 transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
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

          <div className="hidden md:flex items-center gap-3 min-w-[160px] justify-end">
            {session ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200">
                  <User size={14} className="text-zinc-400" />
                  <span className="font-medium max-w-[120px] truncate">
                    {session.user?.name || "User"}
                  </span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-1 text-sm font-medium text-zinc-400 transition hover:text-white"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            ) : (
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

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>

        {mobileMenuOpen && (
          <div className="mt-2 flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/90 p-6 backdrop-blur-xl md:hidden">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
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

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}
