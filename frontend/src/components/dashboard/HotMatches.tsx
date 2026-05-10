"use client";

import React from "react";
import { motion } from "framer-motion";
import { Flame, Target } from "lucide-react";

interface Match {
  title: string;
  desc: string;
  score: number;
  time: string;
}

interface HotMatchesProps {
  matches: Match[];
}

export default function HotMatches({ matches }: HotMatchesProps) {
  return (
    <div className="premium-card p-10 border-l-4 border-l-copper space-y-10">
      <div className="flex items-center gap-3">
        <Flame className="text-copper w-6 h-6" />
        <h3 className="text-2xl font-bold">Hot Matches</h3>
      </div>

      <div className="space-y-8">
        {matches.length === 0 ? (
          <div className="py-20 text-center space-y-4">
             <div className="w-12 h-12 rounded-full bg-surface-variant/50 flex items-center justify-center mx-auto opacity-30">
                <Target className="text-on-surface-variant" size={24} />
             </div>
             <p className="text-on-surface-variant text-sm font-bold uppercase tracking-widest opacity-40">Scanning for matches...</p>
             <p className="text-on-surface-variant/50 text-xs">AI is currently indexing your profile.</p>
          </div>
        ) : (
          matches.map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-lg bg-surface-variant/30 border border-outline hover:border-emerald-light/30 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="px-2 py-0.5 rounded bg-copper/10 text-gold text-[10px] font-black tracking-widest">{item.score}% Match</span>
                <span className="text-[10px] font-black text-on-surface-variant opacity-40">{item.time}</span>
              </div>
              <h4 className="text-sm font-bold text-on-surface mb-2 group-hover:text-gold transition-colors">{item.title}</h4>
              <p className="text-xs text-on-surface-variant opacity-60 leading-relaxed line-clamp-2">{item.desc}</p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
