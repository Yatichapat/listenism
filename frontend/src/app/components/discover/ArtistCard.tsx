import { Artist } from "@/types/artist";

interface ArtistCardProps {
  artist: Artist;
  subtitleLabel?: string;
}

export default function ArtistCard({ artist, subtitleLabel }: ArtistCardProps) {
  const avatarUrl = artist.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${artist.name}&backgroundColor=6366f1`;
  
  // Format followers if we want to display it
  const displayFollowers = artist.followers_count ? `${artist.followers_count} Followers` : "New Artist";
  
  return (
    <article className="group flex w-40 shrink-0 snap-start flex-col items-center gap-4 transition-transform hover:-translate-y-1">
      <div className="relative aspect-square w-full overflow-hidden rounded-full shadow-md transition-all group-hover:shadow-xl group-hover:shadow-indigo-500/20 ring-4 ring-transparent group-hover:ring-indigo-500/30">
        <img
          src={avatarUrl}
          alt={artist.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="text-center w-full">
        <h3 className="truncate font-semibold text-slate-900 dark:text-white text-base">{artist.name}</h3>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
          {subtitleLabel || displayFollowers}
        </p>
      </div>
    </article>
  );
}
