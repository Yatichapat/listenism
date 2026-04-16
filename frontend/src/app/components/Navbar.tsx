"use client";

import { useEffect, useState } from "react";
import UnloginNav from "./navbar/UnloginNav";
import StudentNav from "./navbar/StudentNav";
import ArtistNav from "./navbar/ArtistNav";
import AdminNav from "./navbar/AdminNav";
import { AUTH_CHANGED_EVENT, clearAccessToken, getAccessToken, getCurrentUser, isAuthError, me, type UserPublic } from "@/services/api/auth";

export type UserRole = "unauthenticated" | "student" | "artist" | "admin";

interface NavbarProps {
  role?: UserRole;
}

export default function Navbar({ role = "unauthenticated" }: NavbarProps) {
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>(role);
  const [isLoading, setIsLoading] = useState<boolean>(role !== "unauthenticated");

  useEffect(() => {
    function getRoleForUser(user: UserPublic | null): UserRole {
      if (!user) {
        return "unauthenticated";
      }
      if (user.role === "artist") {
        return "artist";
      }
      if (user.role === "admin") {
        return "admin";
      }
      return "student";
    }

    async function loadUser() {
      setIsLoading(true);
      const token = getAccessToken();
      if (!token) {
        setCurrentUser(null);
        setCurrentRole("unauthenticated");
        setIsLoading(false);
        return;
      }

      const cachedUser = getCurrentUser();
      if (cachedUser) {
        setCurrentUser(cachedUser);
        setCurrentRole(getRoleForUser(cachedUser));
      }

      try {
        const user = await me(token);
        setCurrentUser(user);
        setCurrentRole(getRoleForUser(user));
      } catch (error) {
        if (isAuthError(error)) {
          clearAccessToken();
          setCurrentUser(null);
          setCurrentRole("unauthenticated");
        } else if (cachedUser) {
          setCurrentUser(cachedUser);
          setCurrentRole(getRoleForUser(cachedUser));
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();

    const onAuthChanged = () => {
      void loadUser();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === "listenism_access_token") {
        void loadUser();
      }
    };

    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (isLoading) {
    return <div className="h-16 border-b border-transparent"></div>; // Placeholder while loading
  }

  // If component was passed a specific role prop that differs from unauthenticated,
  // we can use it to override (e.g. for testing)
  const effectiveRole = role !== "unauthenticated" ? role : currentRole;

  switch (effectiveRole) {
    case "student":
      return <StudentNav user={currentUser} />;
    case "artist":
      return <ArtistNav user={currentUser} />;
    case "admin":
      return <AdminNav user={currentUser} />;
    case "unauthenticated":
    default:
      return <UnloginNav />;
  }
}
