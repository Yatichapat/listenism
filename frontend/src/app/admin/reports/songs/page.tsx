"use client";

import { useEffect, useState } from "react";
import { getAccessToken, me } from "@/services/api/auth";
import { listReportedSongs, type SongReport } from "@/services/api/admin";

export default function AdminSongReportsPage() {
  const [items, setItems] = useState<SongReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      const reports = await listReportedSongs(token);
      setItems(reports);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reported songs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  if (loading) {
    return <main className="mx-auto max-w-6xl p-8 text-sm text-slate-500">Loading reported songs...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-bold">Reported Songs</h1>
      {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-900/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Song</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Reported By</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">{item.song_title}</td>
                <td className="px-4 py-3">{item.reporter_email}</td>
                <td className="px-4 py-3">{item.reason || "No reason provided"}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">No reported songs.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
