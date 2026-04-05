"use client";

import { useEffect, useState } from "react";
import { getAccessToken, me } from "@/services/api/auth";
import { listReportedUsers, type UserReport } from "@/services/api/admin";

export default function AdminUserReportsPage() {
  const [items, setItems] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const reports = await listReportedUsers(token);
        setItems(reports);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reported users.");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  if (loading) {
    return <main className="mx-auto max-w-6xl p-8 text-sm text-slate-500">Loading reported users...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-bold">Reported Users</h1>
      {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-900/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Reported User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Reported By</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">{item.reported_user_email}</td>
                <td className="px-4 py-3">{item.reporter_email}</td>
                <td className="px-4 py-3">{item.reason || "No reason provided"}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">No reported users.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
