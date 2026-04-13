"use client";

import Link from "next/link";
import { UserPublic } from "@/services/api/auth";
import ProfileDropdown from "@/app/components/ProfileDropdown";
import SearchIconLink from "@/app/components/SearchIconLink";
import SearchForm from "@/app/components/SearchForm";

interface NavProps {
  user?: UserPublic | null;
}

export default function AdminNav({ user }: NavProps) {
   return (
    <div className="flex items-center justify-between px-6 py-4 backdrop-blur-md bg-white/10 dark:bg-black/10 border-b border-white/20 dark:border-white/10 sticky top-0 z-50 transition-all duration-300">
      <div className="flex items-center space-x-8">
        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
          Listenism Admin
        </Link>
        <nav className="hidden md:flex space-x-6">
          <Link href="/admin" className="text-sm font-medium hover:text-purple-500 transition-colors">Dashboard</Link>
          <Link href="/admin/users" className="text-sm font-medium hover:text-purple-500 transition-colors">Users</Link>
          <Link href="/admin/reports/songs" className="text-sm font-medium hover:text-purple-500 transition-colors">Song Reports</Link>
          <Link href="/admin/reports/users" className="text-sm font-medium hover:text-purple-500 transition-colors">User Reports</Link>
          <Link href="/admin/analytics" className="text-sm font-medium hover:text-purple-500 transition-colors">Analytics</Link>
        </nav>
      </div>
      <div className="flex items-center space-x-4">
        <SearchIconLink className="xl:hidden" />
        <div className="hidden xl:block">
          <SearchForm compact />
        </div>
        <ProfileDropdown user={user} />
      </div>
    </div>
  );
}

