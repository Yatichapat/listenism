import Link from "next/link";

type SearchFormProps = {
  initialQuery?: string;
  compact?: boolean;
  className?: string;
};

export default function SearchForm({ initialQuery = "", compact = false, className = "" }: SearchFormProps) {
  return (
    <form action="/search" method="GET" className={`flex items-center gap-2 ${className}`}>
      <label className="sr-only" htmlFor="site-search">
        Search songs, albums, or artists
      </label>
      <input
        id="site-search"
        name="q"
        type="search"
        defaultValue={initialQuery}
        placeholder="Search songs, albums, artists..."
        className={`w-full rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 transition focus:border-blue-400 focus:bg-white/20 dark:text-white ${compact ? "max-w-[240px]" : "max-w-md"}`}
      />
      <button
        type="submit"
        className="rounded-full bg-gradient-to-r from-blue-500 to-green-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Search
      </button>
      <Link href="/search" className="sr-only">
        Open search page
      </Link>
    </form>
  );
}