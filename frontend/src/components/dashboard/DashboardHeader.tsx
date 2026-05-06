"use client";

import React from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

interface DashboardHeaderProps {
  variants: any;
}

export default function DashboardHeader({ variants }: DashboardHeaderProps) {
  return (
    <motion.div variants={variants} className="flex items-baseline justify-between border-b border-white/10 pb-6">
      <div>
        <p className="font-body-lg text-body-lg text-slate-200 mt-2 text-shadow-sm">Executive Intelligence Dashboard</p>
      </div>
      <div className="flex gap-4">
        <button className="px-6 py-2.5 rounded-full border border-white/20 text-white font-label-sm text-label-sm hover:bg-white/5 transition-colors">Export Report</button>
        <button className="px-6 py-2.5 rounded-full bg-slate-800 text-white font-label-sm text-label-sm hover:bg-slate-700 transition-colors shadow-lg flex items-center gap-2">
          <Plus size={14} />
          New Analysis
        </button>
      </div>
    </motion.div>
  );
}
