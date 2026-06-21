// ===========================================================================
// admin/page.tsx — The "/admin" dashboard (admins only)
// ===========================================================================
//
// Folder "admin" -> web address "/admin". The admin-only guard AND the sidebar
// frame are applied by app/admin/layout.tsx, so this file only has to return the
// dashboard CONTENT: a few headline numbers and quick links to the other admin
// sections.
// ===========================================================================

'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Loader2, Clock, CheckCircle2, Users, Handshake, CalendarCheck,
  ArrowRight, CarFront,
} from "lucide-react";

// The shape of the numbers our /api/admin/stats route returns.
interface Stats {
  pending: number;
  approved: number;
  partners: number;
  users: number;
  bookings: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load the headline numbers once when the dashboard appears.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) throw new Error("Failed to load dashboard stats");
        const data = await res.json();
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load stats");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // The stat cards, described as data so we can render them in a loop.
  const cards = [
    { label: "Pending requests", value: stats?.pending, icon: Clock, accent: "text-amber-400" },
    { label: "Approved vehicles", value: stats?.approved, icon: CheckCircle2, accent: "text-emerald-400" },
    { label: "Partners", value: stats?.partners, icon: Handshake, accent: "text-sky-400" },
    { label: "Total users", value: stats?.users, icon: Users, accent: "text-violet-400" },
    { label: "Total bookings", value: stats?.bookings, icon: CalendarCheck, accent: "text-rose-400" },
  ];

  // The quick-action cards linking to the other admin sections.
  const actions = [
    {
      href: "/admin/vehicles",
      title: "Review submissions",
      desc: "Approve or reject vehicles partners have submitted.",
      icon: CarFront,
      badge: stats?.pending ? `${stats.pending} waiting` : undefined,
    },
    {
      href: "/admin/users",
      title: "Manage users",
      desc: "Browse every account and see their role at a glance.",
      icon: Users,
    },
    {
      href: "/admin/bookings",
      title: "Manage bookings",
      desc: "View all reservations and cancel one if needed.",
      icon: CalendarCheck,
    },
  ];

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <span className="text-xs uppercase tracking-[0.5em] text-zinc-500">Control room</span>
        <h1 className="text-3xl font-black tracking-wide md:text-4xl">Dashboard</h1>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
      )}

      {/* Stat cards. While stats load, each value shows a small spinner. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="rounded-3xl border border-white/10 bg-zinc-950/60 p-6">
            <Icon size={20} className={accent} />
            <p className="mt-4 text-3xl font-black">
              {value === undefined ? <Loader2 size={20} className="animate-spin text-zinc-600" /> : value}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick links to the rest of the panel. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map(({ href, title, desc, icon: Icon, badge }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
          >
            <div>
              <div className="flex items-center justify-between">
                <Icon className="text-zinc-300" />
                {badge && (
                  <span className="rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    {badge}
                  </span>
                )}
              </div>
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-1 text-sm text-zinc-400">{desc}</p>
            </div>
            <ArrowRight className="mt-6 text-zinc-500 transition group-hover:translate-x-1 group-hover:text-white" />
          </Link>
        ))}
      </div>
    </div>
  );
}
