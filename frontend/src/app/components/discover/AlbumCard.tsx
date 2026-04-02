import { Album } from "@/types/album";
import Image from "next/image";

interface AlbumCardProps {
  album: Album;
}

export default function AlbumCard({ album }: AlbumCardProps) {
  const coverUrl = album.cover_url || "https://picsum.photos/seed/placeholder/300/300";

  return (
    <article className="group flex w-48 shrink-0 snap-start flex-col gap-3 transition-transform hover:-translate-y-1">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl shadow-md transition-shadow group-hover:shadow-xl group-hover:shadow-indigo-500/20">
        <img
          src={coverUrl}
          alt={album.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center backdrop-blur-[2px]">
          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/40 hover:scale-105 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 ml-1">
              <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      <div>
        <h3 className="truncate font-semibold text-slate-900 dark:text-white text-base">{album.title}</h3>
        <p className="truncate text-sm text-slate-500 dark:text-slate-400 mt-0.5">{album.artist_name}</p>
      </div>
    </article>
  );
}
