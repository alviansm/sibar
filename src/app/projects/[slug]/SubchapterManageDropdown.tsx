'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, BookOpen, Lightbulb, Layers, SlidersHorizontal } from 'lucide-react';

interface SubchapterManageDropdownProps {
  slug: string;
  outlineId: string;
}

export const SubchapterManageDropdown: React.FC<SubchapterManageDropdownProps> = ({
  slug,
  outlineId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const menuItems = [
    {
      label: 'Concepts',
      href: `/projects/${slug}/outlines/${outlineId}/concepts`,
      icon: BookOpen,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      description: 'Core concepts & formulas',
    },
    {
      label: 'Example Problems',
      href: `/projects/${slug}/outlines/${outlineId}/examples`,
      icon: Lightbulb,
      iconColor: 'text-amber-500',
      description: 'Step-by-step worked reps',
    },
    {
      label: 'Exercise',
      href: `/projects/${slug}/outlines/${outlineId}/exercise`,
      icon: Layers,
      iconColor: 'text-violet-600 dark:text-violet-400',
      description: 'Practice quiz & problem sets',
    },
  ];

  return (
    <div className="relative flex-shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm flex items-center gap-2 transition-all m3-ripple ${
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-600 dark:text-indigo-400'
            : 'border-slate-200 dark:border-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700'
        }`}
        title="Manage Subchapter Content"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        <span>Manage</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Subchapter Management
            </p>
          </div>
          <div className="space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className={`w-4 h-4 ${item.iconColor}`} />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="leading-tight">{item.label}</span>
                    <span className="text-[10px] font-normal text-slate-400 leading-tight">
                      {item.description}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
