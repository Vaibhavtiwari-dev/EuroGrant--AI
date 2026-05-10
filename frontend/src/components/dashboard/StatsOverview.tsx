"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { ArrowUpRight, Target, Zap, Euro } from "lucide-react";

interface StatsOverviewProps {
  variants?: Variants;
  stats?: {
    active_high_matches: number;
    ai_generation_quality: number;
    total_pipeline_value: number;
  };
}

export default function StatsOverview({ variants, stats }: StatsOverviewProps) {
  // Use real data or fallback to defaults (avoiding hardcoded defaults where possible)
  const activeMatches = stats?.active_high_matches ?? 0;
  const quality = stats?.ai_generation_quality ?? 0;
  const pipelineValue = stats?.total_pipeline_value ?? 0;

  return (
    <motion.div variants={variants} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-on-surface mb-2">Executive Overview</h2>
          <p className="text-on-surface-variant opacity-70">Real-time telemetry on active funding opportunities and generation pipelines.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant bg-surface-variant/50 px-3 py-1.5 rounded-full border border-outline">
          <Zap size={12} className="text-emerald-light" />
          <span>Last synced: Just now</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active High Matches */}
        <div className="premium-card p-8 flex flex-col justify-between group">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60 mb-1">Active High Matches</p>
              <h3 className="text-5xl font-bold text-on-surface">{activeMatches}</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald/10 flex items-center justify-center border border-emerald/20">
              <Target className="text-emerald-light w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald/10 text-emerald-light text-[10px] font-bold border border-emerald/20">
              <ArrowUpRight size={10} />
              <span>{activeMatches > 0 ? "12%" : "0%"}</span>
            </div>
            <p className="text-xs text-on-surface-variant opacity-50">Across Horizon Europe & EIC</p>
          </div>
        </div>

        {/* AI Generation Quality */}
        <div className="premium-card p-8 border-l-4 border-l-emerald flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60 mb-1">AI Generation Quality</p>
              <h3 className="text-5xl font-bold text-emerald-light">{quality}<span className="text-2xl opacity-60">%</span></h3>
            </div>
          </div>
          <div className="space-y-3">
             <div className="h-1.5 w-full bg-emerald/10 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${quality}%` }}
                 transition={{ duration: 1.5, ease: "easeOut" }}
                 className="h-full bg-emerald-light" 
               />
             </div>
             <p className="text-xs text-on-surface-variant opacity-50 leading-relaxed">Average match score to evaluator criteria</p>
          </div>
        </div>

        {/* Total Pipeline Value */}
        <div className="premium-card p-8 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60 mb-1">Total Pipeline Value</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-emerald-light">€</span>
                <h3 className="text-5xl font-bold text-on-surface">{pipelineValue.toFixed(1)}<span className="text-2xl opacity-60">M</span></h3>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-copper/10 flex items-center justify-center border border-copper/20">
              <Euro className="text-copper w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-on-surface-variant opacity-50">Projected funding from active generations</p>
        </div>
      </div>
    </motion.div>
  );
}
