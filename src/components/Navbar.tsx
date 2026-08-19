'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, User, Settings, LogOut, ChevronDown, Sparkles, BarChart2, Flame } from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';

interface NavbarProps {
  username?: string;
  fullName?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({ username = 'admin', fullName }) => {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Compute initials for the avatar circle
  const getInitials = () => {
    if (fullName && fullName.trim().length > 0) {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (username && username.length > 0) {
      const parts = username.replace(/[-_]/g, ' ').trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return username.substring(0, 2).toUpperCase();
    }
    return 'SB';
  };

  const displayName = fullName || username;
  const initials = getInitials();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 group min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform p-1.5 flex-shrink-0">
            <img src="/favicon.ico" alt="Sibar Icon" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">Sibar</span>
              <span className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200/60 dark:border-indigo-800 hidden xs:inline-block">
                v1.0
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">Sinau Bareng Archive</p>
          </div>
        </Link>

        {/* Navigation Links & User Avatar Dropdown */}
        <nav className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <Link
            href="/dashboard"
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              pathname === '/dashboard'
                ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
            <span className="hidden xs:inline">Dashboard</span>
          </Link>

          <Link
            href="/stats"
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              pathname === '/stats'
                ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart2 className="w-4 h-4 flex-shrink-0" />
            <span className="hidden xs:inline">Statistics</span>
          </Link>

          {/* User Profile Avatar Dropdown Menu */}
          <div className="relative pl-1 sm:pl-2 ml-1 border-l border-slate-200 dark:border-slate-800" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
              title="User Profile Menu"
              className="flex items-center gap-1.5 sm:gap-2.5 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 group"
            >
              {/* Clickable Circle User Icon */}
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white font-extrabold text-xs tracking-wider flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-md group-hover:scale-105 group-hover:shadow-indigo-500/25 transition-all flex-shrink-0">
                {initials}
              </div>

              <div className="hidden sm:flex flex-col text-left pr-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[120px] truncate leading-tight">
                  {displayName}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Scholar</span>
              </div>

              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 hidden sm:block ${isDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
            </button>

            {/* Context Menu Dropdown */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 sm:w-64 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Signed in as</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                    @{username}
                  </p>
                </div>

                {/* Dropdown Action Items */}
                <div className="p-1.5 space-y-0.5">
                  <Link
                    href="/stats"
                    onClick={() => setIsDropdownOpen(false)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      pathname === '/stats'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <BarChart2 className="w-4 h-4 text-indigo-500" />
                    <span>Statistics</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      pathname === '/settings'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span>Profile &amp; Settings</span>
                  </Link>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                {/* Sign Out Action */}
                <div className="p-1.5">
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};
