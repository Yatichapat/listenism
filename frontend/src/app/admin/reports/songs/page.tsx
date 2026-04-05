"use client";

import { useEffect, useState } from "react";
import { getAccessToken, me } from "@/services/api/auth";
import { deleteSongAsAdmin, listReportedSongs, type SongReport } from "@/services/api/admin";

export default function AdminSongReportsPage() {
  const [items, setItems] = useState<SongReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingSongId, setDeletingSongId] = useState<number | null>(null);

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

  async function onDeleteSong(songId: number) {
    const token = getAccessToken();
    if (!token) {
      setError("Please login as admin.");
      return;
    }

    setDeletingSongId(songId);
    try {
      await deleteSongAsAdmin(token, songId);
      setItems((prev) => prev.filter((item) => item.song_id !== songId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete song.");
    } finally {
      setDeletingSongId(null);
    }
  }

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
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">{item.song_title}</td>
                <td className="px-4 py-3">{item.reporter_email}</td>
                <td className="px-4 py-3">{item.reason || "No reason provided"}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => void onDeleteSong(item.song_id)}
                    disabled={deletingSongId === item.song_id}
                    className="rounded bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    {deletingSongId === item.song_id ? "Deleting..." : "Delete Song"}
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">No reported songs.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
