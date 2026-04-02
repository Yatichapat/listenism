"use client";

import { useState, useRef, useEffect } from "react";
import { UserPublic, clearAccessToken } from "@/services/api/auth";

interface ProfileDropdownProps {
  user?: UserPublic | null;
}

export default function ProfileDropdown({ user }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initial = user?.display_name ? user.display_name.charAt(0).toUpperCase() : "U";
  const isArtist = user?.role === "artist";

  const handleLogout = () => {
    clearAccessToken();
    window.location.href = "/";
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20 text-blue-500 font-semibold hover:bg-blue-500/30 transition-colors"
        title={user?.display_name || "User"}
      >
        {initial}
      </button>

      {isOpen && user && (
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{user.display_name}</p>
                <p className="text-xs text-white/80 capitalize">{user.role || "listener"}</p>
              </div>
            </div>
          </div>

          {/* Stats Section - Show for artists */}
          {isArtist && (
            <div className="border-t border-gray-700 px-4 py-3 bg-gray-800/50">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{user.like_count || 0}</p>
                  <p className="text-xs text-gray-400">Likes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">{user.follower_count || 0}</p>
                  <p className="text-xs text-gray-400">Followers</p>
                </div>
              </div>
            </div>
          )}

          {/* User Info */}
          <div className="border-t border-gray-700 px-4 py-3 bg-gray-800/30">
            <p className="text-xs text-gray-400">Email</p>
            <p className="text-sm text-gray-200 truncate">{user.email}</p>
          </div>

          {/* Logout Button */}
          <div className="border-t border-gray-700 px-4 py-2">
            <button
              onClick={handleLogout}
              className="w-full text-sm font-medium text-red-400 hover:text-red-300 py-2 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
