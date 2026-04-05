"use client";

import { useEffect, useMemo, useState } from "react";
import { getAccessToken, me, type UserPublic } from "@/services/api/auth";
import { listMySongs } from "@/services/api/music";
import { type Song } from "@/types/songs";

type GenreStat = {
  genre: string;
  count: number;
};

function compactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return String(value);
}

export default function AnalyticsPage() {
  const [profile, setProfile] = useState<UserPublic | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const token = getAccessToken();
      if (!token) {
        setError("Please login as an artist to view analytics.");
        setLoading(false);
        return;
      }

      try {
        const [user, mySongs] = await Promise.all([me(token), listMySongs(token)]);
        if (user.role !== "artist") {
          setError("Artist access required.");
          setLoading(false);
          return;
        }

        setProfile(user);
        setSongs(mySongs);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const totalSongs = songs.length;
  const totalFollowers = profile?.follower_count ?? 0;

  const totalLikes = useMemo(
    () => songs.reduce((sum, song) => sum + (song.like_count ?? 0), 0),
    [songs],
  );

  const genreStats = useMemo<GenreStat[]>(() => {
    const map = new Map<string, number>();
    for (const song of songs) {
      const genre = song.genre?.trim() || "Unknown";
      map.set(genre, (map.get(genre) ?? 0) + 1);
    }

    return Array.from(map.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count);
  }, [songs]);

  const topSongs = useMemo(
    () => [...songs].sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0)).slice(0, 5),
    [songs],
  );

  if (loading) {
    return <main className="mx-auto max-w-6xl p-8 text-sm text-slate-500">Loading analytics...</main>;
  }

  if (error) {
    return <main className="mx-auto max-w-6xl p-8 text-sm text-rose-500">{error}</main>;
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Artist Analytics</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          {profile?.display_name ? `Welcome back, ${profile.display_name}.` : "Your performance overview."}
        </p>
      </header>

      <section className="grid gap-4 grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm text-slate-500">Total Songs</p>
          <p className="mt-2 text-3xl font-bold">{compactNumber(totalSongs)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm text-slate-500">Total Followers</p>
          <p className="mt-2 text-3xl font-bold">{compactNumber(totalFollowers)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm text-slate-500">Total Likes</p>
          <p className="mt-2 text-3xl font-bold">{compactNumber(totalLikes)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm text-slate-500">Avg Likes / Song</p>
          <p className="mt-2 text-3xl font-bold">{totalSongs > 0 ? (totalLikes / totalSongs).toFixed(1) : "0.0"}</p>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/40">
          <h2 className="text-lg font-semibold">Genre Breakdown</h2>
          {genreStats.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No songs uploaded yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {genreStats.map((item) => (
                <li key={item.genre} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{item.genre}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {item.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/40">
          <h2 className="text-lg font-semibold">Top Songs by Likes</h2>
          {topSongs.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No songs uploaded yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {topSongs.map((song) => (
                <li key={song.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-slate-700 dark:text-slate-200">{song.title}</span>
                  <span className="text-slate-500">{song.like_count ?? 0} likes</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </main>
  );
}
