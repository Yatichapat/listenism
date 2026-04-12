"use client";

import { useState } from "react";
import Song from "@/app/songs/Song";
import { type Song as SongType } from "@/types/songs";

interface SongListProps {
  songs: SongType[];
}

export default function SongList({ songs }: SongListProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      {songs.map((song, index) => (
        <Song
          key={song.id}
          id={song.id}
          title={song.title}
          artistName={song.artist_name}
          genre={song.genre}
          audioUrl={song.audio_url}
          coverUrl={song.cover_url}
          viewCount={song.view_count ?? 0}
          likeCount={song.like_count ?? 0}
          // Controlled drawer state
          drawerOpen={openIndex === index}
          onOpenDrawer={() => setOpenIndex(index)}
          onCloseDrawer={() => setOpenIndex(null)}
          // Prev / next navigation
          onPrev={index > 0 ? () => setOpenIndex(index - 1) : undefined}
          onNext={index < songs.length - 1 ? () => setOpenIndex(index + 1) : undefined}
        />
      ))}
    </>
  );
}
