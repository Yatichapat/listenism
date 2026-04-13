"use client";

import Link from "next/link";
import { UserPublic } from "@/services/api/auth";
import ProfileDropdown from "@/app/components/ProfileDropdown";

interface NavProps {
  user?: UserPublic | null;
}

export default function StudentNav({ user }: NavProps) {

  return (
    <div className="flex items-center justify-between px-6 py-4 backdrop-blur-md bg-white/10 dark:bg-black/10 border-b border-white/20 dark:border-white/10 sticky top-0 z-50 transition-all duration-300">
      <div className="flex items-center space-x-8">
        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-500 to-green-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
          Listenism
        </Link>
        <nav className="hidden md:flex space-x-6">
          <Link href="/" className="text-sm font-medium hover:text-blue-500 transition-colors">Home</Link>
          <Link href="/playlists" className="text-sm font-medium hover:text-blue-500 transition-colors">Library</Link>
        </nav>
      </div>
      <div className="flex items-center space-x-4">
        <ProfileDropdown user={user} />
      </div>
    </div>
  );
}
