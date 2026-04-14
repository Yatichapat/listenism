import AlbumCard from "@/app/components/discover/AlbumCard";
import ArtistCard from "@/app/components/discover/ArtistCard";
import SongList from "@/app/components/SongList";
import { searchMusic } from "@/services/api/music";
import { type Album } from "@/types/album";
import { type Artist } from "@/types/artist";
import { type Song } from "@/types/songs";
import SearchInputUI from "./SearchInputUI";

type SearchPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q.trim() : "";

  let songs: Song[] = [];
  let albums: Album[] = [];
  let artists: Artist[] = [];
  let error: string | null = null;

  if (query) {
    try {
      const results = await searchMusic(query, 10);
      songs = results.songs;
      albums = results.albums;
      artists = results.artists;
    } catch (searchError) {
      error = searchError instanceof Error ? searchError.message : "Failed to load search results.";
    }
  }

  return (
    <main className="min-h-screen text-zinc-100">
      {/* Sticky top Search Bar */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 py-6 px-4 sm:px-6 shadow-sm">
        <SearchInputUI initialQuery={query} />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {error && (
          <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {!query && !error && (
          <div className="mt-32 flex flex-col items-center justify-center text-center opacity-60">
            <div className="mb-6 rounded-full bg-white/5 p-6 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search text-zinc-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-wide">Explore Listenism</h2>
            <p className="mt-2 text-zinc-400 max-w-md">Find your favorite songs, discover new albums, and explore artists.</p>
          </div>
        )}

        {query && !error && (
          <div className="animate-in fade-in duration-500 space-y-12 pb-24">
            
            {songs.length > 0 && (
              <section>
                <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">Songs</h2>
                <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                  <div className="grid grid-cols-2 gap-4 justify-items-center sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    <SongList songs={songs} />
                  </div>
                </div>
              </section>
            )}

            {albums.length > 0 && (
              <section>
                <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">Albums</h2>
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {albums.map((album) => (
                    <AlbumCard key={album.id} album={album} />
                  ))}
                </div>
              </section>
            )}

            {artists.length > 0 && (
              <section>
                <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">Artists</h2>
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {artists.map((artist) => (
                    <ArtistCard key={artist.id} artist={artist} />
                  ))}
                </div>
              </section>
            )}

            {songs.length === 0 && albums.length === 0 && artists.length === 0 && (
              <div className="mt-20 text-center">
                <p className="text-xl text-zinc-400">
                  No results found for "<span className="font-semibold text-white">{query}</span>"
                </p>
                <p className="mt-2 text-sm text-zinc-500">Please make sure your words are spelled correctly or use less or different keywords.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}