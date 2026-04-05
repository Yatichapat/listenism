"use client";

import { useEffect, useState } from "react";
import { getAccessToken, me } from "@/services/api/auth";
import { deleteUserAsAdmin, listAllUsers, type AdminUser } from "@/services/api/admin";

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      const token = getAccessToken();
      if (!token) {
        setError("Please login as admin.");
        setLoading(false);
        return;
      }

      try {
        const profile = await me(token);
        if (profile.role !== "admin") {
          setError("Admin access required.");
          setLoading(false);
          return;
        }
        setCurrentAdminId(profile.id);

        const users = await listAllUsers(token);
        setItems(users);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users.");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  async function onDeleteUser(userId: number) {
    const token = getAccessToken();
    if (!token) {
      setError("Please login as admin.");
      return;
    }

    const confirmed = window.confirm("Delete this account permanently? This action cannot be undone.");
    if (!confirmed) {
      return;
    }

    setDeletingUserId(userId);
    setError(null);
    try {
      await deleteUserAsAdmin(token, userId);
      setItems((prev) => prev.filter((item) => item.id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user.");
    } finally {
      setDeletingUserId(null);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-6xl p-8 text-sm text-slate-500">Loading users...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-bold">All Users</h1>
      {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-900/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Display Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Likes</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Followers</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">{item.email}</td>
                <td className="px-4 py-3">{item.display_name}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{item.role}</span>
                </td>
                <td className="px-4 py-3">{item.like_count}</td>
                <td className="px-4 py-3">{item.follower_count}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={deletingUserId === item.id || currentAdminId === item.id}
                    onClick={() => void onDeleteUser(item.id)}
                    className="rounded bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingUserId === item.id ? "Deleting..." : currentAdminId === item.id ? "Current Admin" : "Delete Account"}
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
