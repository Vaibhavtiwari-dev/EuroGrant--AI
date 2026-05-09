"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { 
  LayoutDashboard, 
  BarChart2, 
  Search, 
  FileText, 
  Settings,
  Plus,
  Shield
} from "lucide-react";

interface SidebarProps {
  isMobile: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  setIsUploadModalOpen: (open: boolean) => void;
  logout: () => void;
}

const sidebarVariants = {
  open: { 
    x: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 30 }
  },
  closed: { 
    x: "-100%",
    transition: { type: "spring" as const, stiffness: 300, damping: 30 }
  }
};

export default function Sidebar({ isMobile, isSidebarOpen, setIsUploadModalOpen }: SidebarProps) {
  const t = useTranslations("Sidebar");

  return (
    <motion.nav 
      initial={false}
      animate={isMobile ? (isSidebarOpen ? "open" : "closed") : "open"}
      variants={sidebarVariants}
      className="fixed left-0 top-0 h-screen w-64 z-50 bg-surface border-r border-outline flex flex-col py-10"
    >
      <div className="px-8 mb-12">
        <div className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-emerald/10 rounded-lg flex items-center justify-center border border-emerald/20 transition-transform group-hover:rotate-6">
            <Shield className="text-emerald h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-emerald-light tracking-tight">EuroGrant <span className="text-white/90">AI</span></h1>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-[0.1em] mt-0.5 opacity-60">The Modern Atelier</p>
          </div>
        </div>
      </div>

      <div className="px-6 mb-10">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsUploadModalOpen(true)}
          className="w-full py-4 px-4 rounded-lg bg-copper text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-copper/10 hover:brightness-110 transition-all"
        >
          <Plus size={18} />
          <span>New Proposal</span>
        </motion.button>
      </div>
      
      <div className="flex-1 px-4 space-y-2">
        <SidebarItem icon={<LayoutDashboard size={20} />} label={t("dashboard")} active />
        <SidebarItem icon={<BarChart2 size={20} />} label={t("analytics")} />
        <SidebarItem icon={<Search size={20} />} label="Grant Search" />
        <SidebarItem icon={<FileText size={20} />} label="My Proposals" />
      </div>

      <div className="px-4 mt-auto">
        <SidebarItem icon={<Settings size={20} />} label={t("settings")} />
      </div>
    </motion.nav>
  );
}

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <motion.button 
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      className={`relative w-full flex items-center gap-4 px-5 py-3.5 rounded-lg font-semibold transition-all duration-200 group ${
        active 
          ? "text-emerald-light bg-emerald/5 border border-emerald/10 shadow-sm" 
          : "text-on-surface-variant hover:text-white"
      }`}
    >
      <span className={`transition-all duration-300 ${active ? "text-emerald-light" : "text-on-surface-variant group-hover:text-emerald-light opacity-60 group-hover:opacity-100"}`}>
        {icon}
      </span>
      <span className="text-sm tracking-tight">{label}</span>
      {active && (
        <motion.div 
          layoutId="activeIndicator"
          className="absolute left-0 w-1 h-6 bg-copper rounded-r-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}
    </motion.button>
  );
}
