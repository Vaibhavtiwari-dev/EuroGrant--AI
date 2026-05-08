"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { 
  Menu, 
  Search, 
  Bell, 
  Settings
} from "lucide-react";

interface HeaderProps {
  user: { full_name?: string | null; email: string } | null;
  setIsSidebarOpen: (open: boolean) => void;
}

export default function Header({ user, setIsSidebarOpen }: HeaderProps) {
  const t = useTranslations("Header");

  const getInitials = () => {
    if (!user) return "??";
    if (user.full_name) {
      return user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="md:ml-64 h-20 sticky top-0 z-40 bg-transparent flex justify-between items-center px-10 text-slate-200 font-headline-md tracking-wide transition-all duration-300"
    >
      <div className="flex items-center">
        <Menu className="md:hidden mr-4 cursor-pointer text-white" onClick={() => setIsSidebarOpen(true)} />
        <h2 className="text-xl text-white opacity-90 hidden md:block text-shadow-sm">{t("dashboardTitle")}</h2>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <label htmlFor="search-insights" className="sr-only">{t("searchPlaceholder")}</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            id="search-insights"
            className="pl-10 pr-4 py-2 rounded-full bg-slate-900/50 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 w-64 backdrop-blur-md transition-all focus:w-80" 
            placeholder={t("searchPlaceholder")} 
            type="text"
          />
        </div>
        <div className="flex items-center gap-4">
          <button aria-label="Notifications" className="p-2 rounded-full text-slate-300 hover:bg-slate-800/40 transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-sky-400 rounded-full"></span>
          </button>
          <button aria-label="Settings" className="p-2 rounded-full text-slate-300 hover:bg-slate-800/40 transition-colors">
            <Settings size={18} />
          </button>
          <div className="flex items-center gap-3 ml-2 group cursor-pointer">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white group-hover:text-sky-300 transition-colors leading-none">{user?.full_name || t("authorizedAgent")}</p>
              <p className="text-[10px] text-slate-300 font-label-sm uppercase tracking-tighter mt-1">{t("clearanceLevel")}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center alpine-shadow group-hover:border-sky-400 transition-all">
              <span className="text-sm font-bold text-white group-hover:text-sky-300">{getInitials()}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

