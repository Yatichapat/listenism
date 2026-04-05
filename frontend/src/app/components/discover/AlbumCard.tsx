import { Album } from "@/types/album";
import Link from "next/link";

interface AlbumCardProps {
  album: Album;
}

export default function AlbumCard({ album }: AlbumCardProps) {
  const coverUrl = album.cover_url || "https://picsum.photos/seed/placeholder/300/300";

  return (
    <Link href={`/albums/${album.id}`} className="group flex w-48 shrink-0 snap-start flex-col gap-3 transition-transform hover:-translate-y-1">
      <article>
        <div className="relative aspect-square w-full overflow-hidden rounded-xl shadow-md transition-shadow group-hover:shadow-xl group-hover:shadow-indigo-500/20">
          <img
            src={coverUrl}
            alt={album.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center backdrop-blur-[2px]">
            <div className="rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/40 transition-transform group-hover:scale-105">
              View Album
            </div>
          </div>
        </div>
        <div>
          <h3 className="truncate font-semibold text-slate-900 dark:text-white text-base">{album.title}</h3>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400 mt-0.5">{album.artist_name}</p>
        </div>
      </article>
    </Link>
  );
}
