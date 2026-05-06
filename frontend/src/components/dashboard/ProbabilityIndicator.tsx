"use client";

import React from "react";
import { motion } from "framer-motion";

interface ProbabilityIndicatorProps {
  variants: any;
  probability?: number;
}

export default function ProbabilityIndicator({ variants, probability = 94 }: ProbabilityIndicatorProps) {
  return (
    <motion.div variants={variants} className="col-span-12 lg:col-span-4 h-full">
      <div className="glass-card rounded-2xl p-8 h-full flex flex-col items-center justify-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/50 pointer-events-none"></div>
        <h3 className="font-headline-md text-headline-md text-slate-300 mb-8 self-start absolute top-8 left-8 text-shadow-sm">Global Probability</h3>
        <div className="relative w-48 h-48 mt-12 flex items-center justify-center">
          {/* Glowing Ring */}
          <div className="absolute inset-0 rounded-full neon-ring animate-[spin_10s_linear_infinite]"></div>
          {/* Inner Dark Circle to mask ring */}
          <div className="absolute inset-2 rounded-full bg-surface-container-low z-10"></div>
          <div className="relative z-20 text-center">
            <span className="font-display-xl text-5xl text-white">{probability}</span><span className="font-headline-lg text-slate-400">%</span>
            <p className="font-label-sm text-label-sm text-sky-400 mt-2 uppercase tracking-widest">Optimal</p>
          </div>
        </div>
        <p className="font-body-md text-body-md text-slate-300 text-center mt-8 z-10">Based on active parameters across EU frameworks.</p>
      </div>
    </motion.div>
  );
}
