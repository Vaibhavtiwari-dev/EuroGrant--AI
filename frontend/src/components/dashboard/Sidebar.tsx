"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  BrainCircuit, 
  Compass, 
  Briefcase, 
  LineChart, 
  Upload, 
  LogOut
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

export default function Sidebar({ isMobile, isSidebarOpen, setIsSidebarOpen, setIsUploadModalOpen, logout }: SidebarProps) {
  return (
    <motion.nav 
      initial={false}
      animate={isMobile ? (isSidebarOpen ? "open" : "closed") : "open"}
      variants={sidebarVariants}
      className="fixed left-0 top-0 h-screen w-64 z-50 glass-sidebar flex flex-col py-8"
    >
      <div className="px-6 mb-12">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-lg shadow-sm border border-white/10">
            <BrainCircuit className="text-white h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-headline-lg italic text-white leading-tight">EuroGrant AI</h1>
            <p className="text-[10px] text-slate-300 font-label-sm uppercase tracking-widest mt-0.5">Elite Intelligence</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 px-4 space-y-2">
        <SidebarItem icon={<BrainCircuit size={18} />} label="Intelligence" active />
        <SidebarItem icon={<Compass size={18} />} label="Discovery" />
        <SidebarItem icon={<Briefcase size={18} />} label="Workbench" />
        <SidebarItem icon={<LineChart size={18} />} label="Analytics" />
      </div>

      <div className="px-4 mt-auto space-y-4">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsUploadModalOpen(true)}
          className="w-full py-3 px-4 rounded-lg bg-slate-800/50 border border-white/20 text-white text-sm font-headline-md hover:bg-slate-700/60 transition-colors flex items-center justify-center gap-2 group"
        >
          <span>Submit Documentation</span>
          <Upload size={14} className="group-hover:translate-y-[-2px] transition-transform" />
        </motion.button>
        
        <button 
          onClick={logout}
          className="w-full py-2 px-4 rounded-lg text-slate-300 text-xs font-label-sm hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </motion.nav>
  );
}

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <motion.button 
      whileHover={{ 
        x: 4,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
      }}
      whileTap={{ scale: 0.98 }}
      className={`relative w-full flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-300 ease-out group ${
        active 
          ? "text-white bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] border border-white/10" 
          : "text-slate-400 hover:text-white"
      }`}
    >
      <span className={`transition-all duration-300 ${active ? "text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "text-slate-500 group-hover:text-slate-300"}`}>
        {icon}
      </span>
      <span className="text-sm tracking-wide">{label}</span>
      {active && (
        <motion.div 
          layoutId="activeTab"
          className="absolute left-0 w-1 h-6 bg-sky-400 rounded-r-full shadow-[0_0_12px_rgba(56,189,248,0.8)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}
    </motion.button>
  );
}
