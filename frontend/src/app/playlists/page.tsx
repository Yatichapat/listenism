import demoSongsJson from "@/mockupData/songs.json";
import { listSongs } from "@/services/api/music";
import { type Song as SongItem } from "@/types/songs";
import SongListRow from "@/app/songs/SongListRow";

const demoSongs = demoSongsJson as SongItem[];

export default async function PlaylistsPage() {
  let songs = demoSongs;
  let songStatus: "ready" | "error" = "ready";

  try {
    const items = await listSongs();
    songs = items.length > 0 ? items : demoSongs;
  } catch {
    songs = demoSongs;
    songStatus = "error";
  }

  // Calculate totals
  const totalSongs = songs.length;
  // A rough estimate of time (assuming 3 mins avg per song)
  const totalDurationMinutes = totalSongs * 3;
  const hours = Math.floor(totalDurationMinutes / 60);
  const minutes = totalDurationMinutes % 60;

  const timeString = hours > 0
    ? `${hours} hr ${minutes} min`
    : `${minutes} min`;

  return (
    <div className="min-h-screen bg-transparent transition-colors duration-500">
      <main className="mx-auto flex w-full max-w-6xl flex-col pb-20 pt-8 px-4 sm:px-6 lg:px-8">

        {/* Playlist Header Section */}
        <section className="relative flex flex-col md:flex-row items-end gap-6 overflow-hidden rounded-3xl p-8 mb-8 mt-4">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/80 via-purple-500/80 to-pink-500/80 backdrop-blur-xl -z-10" />

          {/* Playlist Icon/Image */}
          <div className="relative flex h-48 w-48 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-400 to-purple-600 shadow-2xl transition-transform hover:scale-105 duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-20 h-20 opacity-90 drop-shadow-md">
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
          </div>

          <div className="flex flex-col text-white z-10 w-full">
            <span className="text-sm font-medium uppercase tracking-wider opacity-80 mb-2">Playlist</span>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4 drop-shadow-md">Liked Songs</h1>
            <div className="flex items-center gap-2 text-sm font-medium opacity-90">
              <span className="font-semibold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md">Listenism User</span>
              <span>•</span>
              <span>{totalSongs} songs, {timeString}</span>
            </div>
          </div>
        </section>

        {/* Playlist Controls & Actions */}
        <div className="flex items-center gap-6 mb-8 px-4">
          <button className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 text-white shadow-xl shadow-blue-500/30 transition-all hover:scale-105 hover:bg-blue-400 active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 ml-1">
              <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
            </svg>
          </button>
          <button className="text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </button>
          <button className="text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </button>

          {songStatus === "error" ? (
            <p className="ml-auto text-xs font-medium text-amber-500 border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
              Demo audio mode
            </p>
          ) : null}
        </div>

        {/* Songs List Header */}
        <div className="flex items-center w-full px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 mb-4 sticky top-16 z-10 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md">
          <div className="w-10 text-center">#</div>
          <div className="flex-1 ml-4">Title</div>
          <div className="hidden md:block w-32 ml-4">Genre</div>
          <div className="w-48 text-right pr-4">Metrics</div>
        </div>

        {/* Songs List */}
        <section className="flex flex-col gap-3 w-full">
          {songs.map((song, idx) => (
            <div key={song.id} className="group relative flex items-center w-full rounded-2xl transition-colors hover:bg-slate-100 dark:hover:bg-white/5">
              <div className="w-10 flex shrink-0 justify-center text-sm font-medium text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <SongListRow
                  id={song.id}
                  title={song.title}
                  artistName={song.artist_name}
                  genre={song.genre}
                  audioUrl={song.audio_url}
                  viewCount={song.view_count ?? 1200 + (song.id % 7) * 437}
                  likeCount={song.like_count ?? 120 + (song.id % 5) * 53}
                />
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
