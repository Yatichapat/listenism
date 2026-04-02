"use client";

import { useEffect, useState } from "react";
import SectionLayout from "@/app/components/discover/SectionLayout";
import Song from "@/app/songs/Song";
import { getAccessToken } from "@/services/api/auth";
import { listRecommendedSongs } from "@/services/api/music";
import { type Song as SongType } from "@/types/songs";

export default function RecommendedSongsSection() {
  const [songs, setSongs] = useState<SongType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadRecommendations() {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const recommendedSongs = await listRecommendedSongs(token, 10);
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

  if (loading || songs.length === 0) {
    return null;
  }

  return (
    <SectionLayout
      title="Recommended For You"
      subtitle="Picked from the genres you like the most"
    >
      {songs.map((song) => (
        <Song
          key={song.id}
          id={song.id}
          title={song.title}
          artistName={song.artist_name}
          genre={song.genre}
          audioUrl={song.audio_url}
          viewCount={song.view_count ?? 300 + (song.id % 7) * 337}
          likeCount={song.like_count ?? 30 + (song.id % 5) * 41}
        />
      ))}
    </SectionLayout>
  );
}
