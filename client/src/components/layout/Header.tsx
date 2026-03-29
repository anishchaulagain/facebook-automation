"use client";

import { Bell, Search, Activity } from "lucide-react";

export default function Header() {
  return (
    <header className="h-16 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-8">
      {/* Left items - Mobile Menu Toggle placeholder */}
      <div className="flex items-center md:hidden">
        <span className="font-bold text-indigo-400">FB Auto</span>
      </div>

      {/* Middle - Search placeholder */}
      <div className="hidden md:flex flex-1 max-w-md ml-4">
        <div className="relative w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Search recent posts..." 
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-full py-1.5 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
          />
        </div>
      </div>

      {/* Right items */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-full border border-slate-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs font-medium text-slate-300">System Online</span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 border-2 border-slate-900 rounded-full"></span>
        </button>

        {/* Profile */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-slate-800 shadow-sm overflow-hidden flex items-center justify-center">
          <span className="text-xs font-bold text-white">OA</span>
        </div>
      </div>
    </header>
  );
}
