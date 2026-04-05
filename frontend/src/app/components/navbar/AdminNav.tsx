"use client";

import Link from "next/link";
import { UserPublic } from "@/services/api/auth";
import ProfileDropdown from "@/app/components/ProfileDropdown";

interface NavProps {
  user?: UserPublic | null;
}

export default function AdminNav({ user }: NavProps) {
   return (
    <div className="flex items-center justify-between px-6 py-4 backdrop-blur-md bg-white/10 dark:bg-black/10 border-b border-white/20 dark:border-white/10 sticky top-0 z-50 transition-all duration-300">
      <div className="flex items-center space-x-8">
        <Link href="/admin" className="text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
          Listenism Admin
        </Link>
        <nav className="hidden md:flex space-x-6">
          <Link href="/admin/reports/songs" className="text-sm font-medium hover:text-purple-500 transition-colors">Report Songs</Link>
          <Link href="/admin/reports/users" className="text-sm font-medium hover:text-purple-500 transition-colors">Report Users</Link>
          <Link href="/admin/users" className="text-sm font-medium hover:text-purple-500 transition-colors">Users</Link>
        </nav>
      </div>
      <div className="flex items-center space-x-4">
        <ProfileDropdown user={user} />
      </div>
    </div>
  );
}

// // export default function ArtistNav({ user }: NavProps) {
//   return (
//     <div className="flex items-center justify-between px-6 py-4 backdrop-blur-md bg-white/10 dark:bg-black/10 border-b border-white/20 dark:border-white/10 sticky top-0 z-50 transition-all duration-300">
//       <div className="flex items-center space-x-8">
//         <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
//           Listenism Artist
//         </Link>
//         <nav className="hidden md:flex space-x-6">
//           <Link href="/artist-upload" className="text-sm font-medium hover:text-purple-500 transition-colors">My Songs</Link>
//           <Link href="/analytics" className="text-sm font-medium hover:text-purple-500 transition-colors">Analytics</Link>
//         </nav>
//       </div>
//       <div className="flex items-center space-x-4">
//         <Link href="/artist-upload" className="text-sm font-medium px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/30">
//           + Add Song
//         </Link>
//         <ProfileDropdown user={user} />
//       </div>
//     </div>
//   );
// }
