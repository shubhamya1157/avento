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

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Loader2, AlertCircle, Search, ShieldCheck, Handshake, User as UserIcon, Trash2 } from "lucide-react";
import AdminPageHeader from "@/app/component/AdminPageHeader";
import ConfirmDialog from "@/app/component/ConfirmDialog";
import { useCascadeDelete, describeCounts } from "@/app/lib/use-cascade-delete";

// The shape of a user as /api/admin/users returns it (password is never sent).
interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: "user" | "partner" | "admin";
  emailVerified: boolean;
  createdAt: string;
}

// A badge per role. We stay monochrome and lean on BRIGHTNESS for hierarchy:
// the most privileged role (admin) is the brightest (solid white), partners sit
// in the middle, and ordinary users are the most muted.
const ROLE_STYLES: Record<AdminUser["role"], { label: string; cls: string; icon: typeof UserIcon }> = {
  admin: { label: "Admin", cls: "bg-white text-black", icon: ShieldCheck },
  partner: { label: "Partner", cls: "bg-white/10 text-white", icon: Handshake },
  user: { label: "User", cls: "bg-white/5 text-zinc-400", icon: UserIcon },
};

export default function AdminUsersPage() {
  const { data: session } = useSession(); // to spot the admin's OWN row
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(""); // the search box text

  // Load every user. `silent` polls skip the spinner + error banner so the list
  // refreshes quietly in the background.
  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      setUsers(await res.json());
      setError(null);
    } catch (err) {
      if (!opts?.silent) setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // The Delete flow (preview counts -> confirm -> cascade delete -> drop the row).
  const del = useCascadeDelete({
    endpoint: (id) => `/api/admin/users/${id}`,
    onDeleted: (id) => setUsers((prev) => prev.filter((u) => u._id !== id)),
    onError: setError,
  });

  // Live auto-refresh every 10s, paused while the delete dialog/action is busy.
  useEffect(() => {
    const timer = setInterval(() => {
      if (del.pending || del.busy) return;
      load({ silent: true });
    }, 10000);
    return () => clearInterval(timer);
  }, [load, del.pending, del.busy]);

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
      <AdminPageHeader
        eyebrow="Directory"
        title="Users"
        description="Every account on the platform with its role and join date."
        right={
          !loading && (
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
              {users.length} total
            </span>
          )
        }
      />

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
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
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
                        <span className="text-white">Yes</span>
                      ) : (
                        <span className="text-zinc-600">No</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-zinc-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {/* Delete is hidden for admins and for the admin's own row —
                          the server enforces the same two rules, this just keeps
                          the button from showing where it would be refused. */}
                      {u.role !== "admin" && u._id !== session?.user?.id ? (
                        <button
                          onClick={() => del.ask({ id: u._id, label: `${u.name} (${u.email})`, self: "users" })}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/40 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/15 active:scale-95"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* The delete confirmation, listing what the cascade will remove. */}
      <ConfirmDialog
        open={Boolean(del.pending)}
        title="Delete user?"
        message={`This permanently removes ${del.pending?.label ?? "this account"} and everything tied to it. This can't be undone.`}
        details={describeCounts(del.counts, "users")}
        confirmLabel="Delete"
        destructive
        loading={del.busy}
        onConfirm={del.confirm}
        onClose={del.cancel}
      />
    </div>
  );
}
