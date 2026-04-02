import SectionLayout from "@/app/components/discover/SectionLayout";
import AlbumCard from "@/app/components/discover/AlbumCard";
import ArtistCard from "@/app/components/discover/ArtistCard";
import Song from "@/app/songs/Song";
import {
  listNewestAlbums,
  listNewestSongs,
  listHotSongs,
  listHotArtists,
  listNewestArtists,
} from "@/services/api/music";
import { type Album } from "@/types/album";
import { type Artist } from "@/types/artist";
import { type Song as SongType } from "@/types/songs";

export const revalidate = 0;

export default async function Home() {
  let newestAlbums: Album[] = [];
  let newestSongs: SongType[] = [];
  let hotSongs: SongType[] = [];
  let hotArtists: Artist[] = [];
  let newestArtists: Artist[] = [];

  let fetchError = false;

  try {
    const [albums, newSongs, popularSongs, popularArtists, recentArtists] = await Promise.all([
      listNewestAlbums(10),
      listNewestSongs(10),
      listHotSongs(10),
      listHotArtists(10),
      listNewestArtists(10),
    ]);

    newestAlbums = albums;
    newestSongs = newSongs;
    hotSongs = popularSongs;
    hotArtists = popularArtists;
    newestArtists = recentArtists;
  } catch (error) {
    console.error("Failed to fetch home datasets:", error);
    fetchError = true;
  }

  return (
    <div className="min-h-screen bg-transparent transition-colors duration-500">
      <main className="mx-auto flex w-full max-w-7xl flex-col pb-24 pt-8">
        <section className="relative overflow-hidden rounded-3xl p-10 mx-4 sm:mx-6 lg:mx-8 mb-6 mt-4">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/80 via-indigo-600/80 to-purple-700/80 backdrop-blur-3xl -z-10" />
          <div className="relative z-10 text-white w-full">
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-3 drop-shadow-md">Home</h1>
            <p className="text-lg md:text-xl font-medium opacity-90 max-w-2xl text-blue-50">
              Discover what is trending now across albums, songs, and artists.
            </p>
          </div>
        </section>

        {fetchError && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-500 text-sm backdrop-blur-sm">
            Failed to load the latest datasets from the backend. Make sure the API is running and the database is seeded.
          </div>
        )}

        {newestAlbums.length > 0 && (
          <SectionLayout title="Newest Albums" subtitle="Freshly dropped records just for you">
            {newestAlbums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </SectionLayout>
        )}

        {newestSongs.length > 0 && (
          <SectionLayout title="Newest Singles" subtitle="The latest drops and new releases">
            {newestSongs.map((song) => (
              <Song
                key={song.id}
                id={song.id}
                title={song.title}
                artistName={song.artist_name}
                genre={song.genre}
                audioUrl={song.audio_url}
                viewCount={song.view_count ?? 120 + (song.id % 7) * 437}
                likeCount={song.like_count ?? 12 + (song.id % 5) * 53}
              />
            ))}
          </SectionLayout>
        )}

        {hotSongs.length > 0 && (
          <SectionLayout title="Hot Songs" subtitle="Most played tracks setting the charts on fire">
            {hotSongs.map((song) => (
              <Song
                key={song.id}
                id={song.id}
                title={song.title}
                artistName={song.artist_name}
                genre={song.genre}
                audioUrl={song.audio_url}
                viewCount={song.view_count ?? 25000 + (song.id % 7) * 1037}
                likeCount={song.like_count ?? 4000 + (song.id % 5) * 453}
              />
            ))}
          </SectionLayout>
        )}

        {hotArtists.length > 0 && (
          <SectionLayout title="Hot Artists" subtitle="The musicians everyone is following right now">
            {hotArtists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </SectionLayout>
        )}

        {newestArtists.length > 0 && (
          <SectionLayout title="Fresh Faces" subtitle="Newest artists that just uploaded their songs">
            {newestArtists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} subtitleLabel="Just Dropped" />
            ))}
          </SectionLayout>
        )}
      </main>
    </div>
  );
}
