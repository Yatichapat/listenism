import Link from "next/link";
import { Search } from "lucide-react";

type SearchIconLinkProps = {
  className?: string;
};

export default function SearchIconLink({ className = "" }: SearchIconLinkProps) {
  return (
    <Link
      href="/search"
      aria-label="Search songs, albums, or artists"
      title="Search"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-slate-900 transition hover:border-blue-400 hover:bg-white/20 hover:text-blue-500 dark:text-white ${className}`}
    >
      <Search className="h-5 w-5" />
    </Link>
  );
}