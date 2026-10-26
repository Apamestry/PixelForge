"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { removeToken, apiFetch } from "@/lib/api";
import { LogOut, User, ChevronDown } from "lucide-react";

export function TopBar({ title, children }) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await apiFetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          setUserEmail(data.email || "");
        }
      } catch {
        // Ignored if me endpoint not reachable
      }
    }
    fetchMe();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    removeToken();
    router.push("/login");
  }

  return (
    <header className="h-14 border-b border-border bg-white px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center space-x-6">
        <Link
          href="/projects"
          className="text-base font-bold tracking-tight text-text hover:text-accent transition flex items-center space-x-2"
        >
          <span>PixelForge</span>
        </Link>
        {title && <span className="text-sm font-medium text-text-muted">{title}</span>}
      </div>

      <div className="flex items-center space-x-4">
        {children}

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center space-x-2 rounded px-2.5 py-1.5 text-xs text-text hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-accent/20"
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-text font-medium text-xs border border-border">
              <User size={14} strokeWidth={1.75} />
            </div>
            <span className="font-medium max-w-[140px] truncate">{userEmail || "Account"}</span>
            <ChevronDown size={14} strokeWidth={1.75} className="text-text-muted" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-48 rounded border border-border bg-white py-1 shadow-lg z-30">
              {userEmail && (
                <div className="px-3 py-2 border-b border-border text-[11px] text-text-muted truncate">
                  Signed in as <br />
                  <span className="font-medium text-text">{userEmail}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-danger hover:bg-red-50 text-left transition"
              >
                <LogOut size={14} strokeWidth={1.75} />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
