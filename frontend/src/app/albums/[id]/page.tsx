import Link from "next/link";
import { notFound } from "next/navigation";

import SongListRow from "@/app/songs/SongListRow";
import { getAlbumById } from "@/services/api/music";

export const revalidate = 0;

interface AlbumDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AlbumDetailPage({ params }: AlbumDetailPageProps) {
  const resolvedParams = await params;
  const albumId = Number(resolvedParams.id);

  if (!Number.isFinite(albumId)) {
    notFound();
  }

  let album;
  try {
    album = await getAlbumById(albumId);
  } catch {
    notFound();
  }

  const coverUrl = album.cover_url || "https://picsum.photos/seed/album-placeholder/800/800";

  return (
    <div className="min-h-screen bg-transparent">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white/10 dark:text-slate-200"
          >
            <span>←</span>
            Back to Discover
          </Link>
        </div>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-black/10 backdrop-blur-xl dark:bg-black/20">
          <div className="grid gap-8 p-6 md:grid-cols-[320px_1fr] md:p-8 lg:p-10">
            <div className="relative aspect-square overflow-hidden rounded-3xl shadow-xl shadow-indigo-500/10">
              <img
                src={coverUrl}
                alt={album.title}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex flex-col justify-end gap-4">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.35em] text-indigo-400">
                  Album
                </p>
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-5xl">
                  {album.title}
                </h1>
                <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
                  by {album.artist_name}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {album.songs.length} track{album.songs.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Songs inside this album
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Click play on any track to listen.
            </p>
          </div>

          <div className="space-y-3">
            {album.songs.length > 0 ? (
              album.songs.map((song) => (
                <SongListRow
                  key={song.id}
                  id={song.id}
                  title={song.title}
                  artistName={song.artist_name}
                  genre={song.genre}
                  audioUrl={song.audio_url}
                  viewCount={song.view_count ?? 0}
                  likeCount={song.like_count ?? 0}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-500 dark:text-slate-400">
                This album does not have any songs yet.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
