// ===========================================================================
// admin/users/page.tsx — The "/admin/users" account list (admins only)
// ===========================================================================
//
// Folder "admin/users" -> web address "/admin/users". The admin guard and the
// sidebar frame come from app/admin/layout.tsx, so this file only returns the
// content: a searchable table of every account with its role and join date.
// (Read-only — admin promotion is controlled by the ADMIN_EMAILS setting.)
// ===========================================================================

'use client';

import { useState, useEffect, useMemo } from "react";
import { Loader2, AlertCircle, Search, ShieldCheck, Handshake, User as UserIcon } from "lucide-react";

// The shape of a user as /api/admin/users returns it (password is never sent).
interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: "user" | "partner" | "admin";
  emailVerified: boolean;
  createdAt: string;
}

// A little coloured badge per role, so admins/partners stand out at a glance.
const ROLE_STYLES: Record<AdminUser["role"], { label: string; cls: string; icon: typeof UserIcon }> = {
  admin: { label: "Admin", cls: "bg-emerald-500/15 text-emerald-400", icon: ShieldCheck },
  partner: { label: "Partner", cls: "bg-sky-500/15 text-sky-400", icon: Handshake },
  user: { label: "User", cls: "bg-white/10 text-zinc-300", icon: UserIcon },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(""); // the search box text

  // Load every user once when the page opens.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/users");
        if (!res.ok) throw new Error("Failed to load users");
        const data = await res.json();
        if (!cancelled) setUsers(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Filter by name or email as the admin types. useMemo avoids recomputing the
  // filtered list on every unrelated re-render.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <span className="text-xs uppercase tracking-[0.5em] text-zinc-500">Admin</span>
        <h1 className="text-3xl font-black tracking-wide md:text-4xl">Users</h1>
      </div>

      {/* Search box */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/30"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-zinc-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 py-16 text-center text-sm text-zinc-400">
          No users found.
        </div>
      ) : (
        // The table scrolls sideways on small screens so columns never squash.
        <div className="overflow-x-auto rounded-3xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Verified</th>
                <th className="px-5 py-3 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const role = ROLE_STYLES[u.role] ?? ROLE_STYLES.user;
                const RoleIcon = role.icon;
                return (
                  <tr key={u._id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                    <td className="px-5 py-4 font-semibold text-white">{u.name}</td>
                    <td className="px-5 py-4 text-zinc-400">{u.email}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${role.cls}`}>
                        <RoleIcon size={12} /> {role.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {u.emailVerified ? (
                        <span className="text-emerald-400">Yes</span>
                      ) : (
                        <span className="text-zinc-500">No</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-zinc-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
