"use client";

import { useEffect, useState } from "react";
import SectionLayout from "@/app/components/discover/SectionLayout";
import SongList from "@/app/components/SongList";
import { getAccessToken } from "@/services/api/auth";
import { listFollowingFeedSongs } from "@/services/api/music";
import { type Song as SongType } from "@/types/songs";

export default function FollowingFeedSection() {
  const [songs, setSongs] = useState<SongType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadFeed() {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const feedSongs = await listFollowingFeedSongs(token, 10);
        if (mounted) {
          setSongs(feedSongs);
        }
      } catch (error) {
        console.error("Failed to load following feed:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadFeed();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading || songs.length === 0) {
    return null;
  }

  return (
    <SectionLayout title="Following Feed" subtitle="Songs from artists you follow">
      <SongList songs={songs} />
    </SectionLayout>
  );
}