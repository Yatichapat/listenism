import Link from "next/link";
import { Search } from "lucide-react";

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
      <button
        type="submit"
        className="rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
      >
        <Search className="h-5 w-5" />
      </button>
      <Link href="/search" className="sr-only">
        Open search page
      </Link>
    </form>
  );
}