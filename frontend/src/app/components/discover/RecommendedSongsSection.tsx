"use client";

import { useEffect, useState } from "react";
import SectionLayout from "@/app/components/discover/SectionLayout";
import SongList from "@/app/components/SongList";
import { getAccessToken } from "@/services/api/auth";
import { listAIRecommendedSongs, listGenreFallbackSongs } from "@/services/api/music";
import { type Song as SongType } from "@/types/songs";

export default function RecommendedSongsSection() {
  const [songs, setSongs] = useState<SongType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadRecommendations() {
      const token = getAccessToken();
      if (!token) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);

      try {
        let recommendedSongs: SongType[] = [];

        try {
          recommendedSongs = await listAIRecommendedSongs(token, 10);
        } catch (error) {
          // Some accounts may not have AI recommendations yet; fallback below handles this case.
          console.warn("AI recommendations unavailable, trying fallback songs:", error);
        }

        if (recommendedSongs.length === 0) {
          recommendedSongs = await listGenreFallbackSongs(token, 10);
        }

        if (mounted) {
          setSongs(recommendedSongs);
        }
      } catch (error) {
        console.error("Failed to load personalized songs:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadRecommendations();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SectionLayout
      title="Recommended For You"
      subtitle="Personalized by recommendation signals for every role"
    >
      {songs.length > 0 ? (
        <SongList
          songs={songs.map((song) => ({
            ...song,
            view_count: song.view_count ?? 300 + (song.id % 7) * 337,
            like_count: song.like_count ?? 30 + (song.id % 5) * 41,
          }))}
        />
      ) : (
        <div className="rounded-xl border border-slate-200/70 bg-white/60 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          No recommendations yet for this account. Keep listening and interacting to improve suggestions.
        </div>
      )}
    </SectionLayout>
  );
}
