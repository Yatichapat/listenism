"use client";

import Link from "next/link";
import { UserPublic } from "@/services/api/auth";
import ProfileDropdown from "@/app/components/ProfileDropdown";

interface NavProps {
  user?: UserPublic | null;
}

export default function AdminNav({ user }: NavProps) {

  return (
    <div className="flex items-center justify-between px-6 py-4 backdrop-blur-md bg-slate-900/80 border-b border-indigo-500/30 sticky top-0 z-50 transition-all duration-300">
      <div className="flex items-center space-x-8">
        <Link href="/admin" className="text-xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
          Listenism Admin
        </Link>
        <nav className="hidden md:flex space-x-6">
          <Link href="/admin/dashboard" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Dashboard</Link>
          <Link href="/admin/users" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Manage Users</Link>
          <Link href="/admin/content" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Content Moderation</Link>
          <Link href="/admin/logs" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">System Logs</Link>
        </nav>
      </div>
      <div className="flex items-center space-x-4">
        <ProfileDropdown user={user} />
      </div>
    </div>
  );
}
