"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Calendar, Award, ExternalLink, ArrowRight, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { z } from "zod";

const GrantSchema = z.object({
  id: z.number(),
  external_id: z.string(),
  title: z.string(),
  description: z.string(),
  deadline: z.string(),
  funding_range: z.string().nullable().optional(),
  eligibility_criteria: z.string().nullable().optional(),
  scoring_rubric: z.string().nullable().optional(),
  source_url: z.string().nullable().optional(),
  sector_tags: z.string().nullable().optional(),
});

const GrantMatchSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  grant_id: z.number(),
  score: z.number(),
  explanation: z.string().nullable().optional(),
  created_at: z.string(),
  grant: GrantSchema,
});

const GrantMatchesListSchema = z.array(GrantMatchSchema);
type GrantMatch = z.infer<typeof GrantMatchSchema>;

interface MatchedGrantsProps {
  refreshKey?: number;
}

export default function MatchedGrants({ refreshKey = 0 }: MatchedGrantsProps) {
  const [matches, setMatches] = useState<GrantMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/grants/matches", {}, GrantMatchesListSchema);
      if (Array.isArray(data)) {
        setMatches(data);
      }
    } catch (err) {
      console.error("Failed to fetch grant matches:", err);
      setError("Failed to fetch matches. Please make sure the backend is active.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMatches();
  }, [refreshKey, fetchMatches]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[400px]">
        <Loader2 className="h-10 w-10 text-emerald-light animate-spin mb-4" />
        <p className="text-emerald-light/60 font-bold uppercase tracking-[0.2em] text-xs">Evaluating Match Matrices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center bg-red-500/5 rounded-2xl border border-red-500/20 backdrop-blur-md">
        <AlertCircle className="h-10 w-10 text-red-500/80 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Security Pipeline Interrupted</h3>
        <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">{error}</p>
        <button
          onClick={fetchMatches}
          className="px-5 py-2.5 rounded-lg bg-surface border border-outline hover:border-red-500/40 text-xs font-bold uppercase tracking-wider flex items-center gap-2 mx-auto text-white transition-all"
        >
          <RefreshCw size={14} />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="p-16 text-center bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="bg-emerald/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 border border-emerald/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
          <Sparkles className="h-8 w-8 text-emerald-light" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">No High-Probability Matches Detected</h3>
        <p className="text-slate-400 font-medium text-sm max-w-md mx-auto leading-relaxed">
          AI has not identified grant proposals exceeding your current organization profile match threshold. Update your company documentation or adjust threshold settings to broaden discovery.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">Semantic AI Match Matrix</h2>
          <p className="text-xs text-on-surface-variant opacity-60 uppercase tracking-widest mt-1">High-probability grant opportunities matched via cosine vector indexing</p>
        </div>
        <button
          onClick={fetchMatches}
          className="p-3 rounded-lg bg-surface border border-outline hover:border-emerald-light/30 transition-all text-on-surface-variant hover:text-white"
          title="Force Matrix Re-computation"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {matches.map((item, index) => {
            const displayScore = Math.round(item.score * 100);
            const formattedDeadline = new Date(item.grant.deadline).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="premium-card p-8 bg-surface/50 border border-white/5 rounded-2xl relative overflow-hidden group hover:border-emerald-light/20 shadow-xl transition-all"
              >
                {/* Visual Glow Indicator */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald/5 rounded-full blur-3xl group-hover:bg-emerald/10 transition-colors pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Match Badge */}
                      <span className="px-3 py-1 rounded bg-emerald/10 text-emerald-light border border-emerald/20 text-[10px] font-black tracking-widest uppercase">
                        {displayScore}% Compatible
                      </span>
                      {item.grant.funding_range && (
                        <span className="px-3 py-1 rounded bg-copper/10 text-gold border border-copper/20 text-[10px] font-black tracking-widest uppercase flex items-center gap-1">
                          <Award size={10} />
                          {item.grant.funding_range}
                        </span>
                      )}
                      <span className="px-3 py-1 rounded bg-white/5 text-slate-400 border border-white/10 text-[10px] font-black tracking-widest uppercase flex items-center gap-1">
                        <Calendar size={10} />
                        Deadline: {formattedDeadline}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white group-hover:text-gold transition-colors">{item.grant.title}</h3>
                    <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">{item.grant.description}</p>

                    {/* Why it Matches (AI Explanation) */}
                    {item.explanation && (
                      <div className="p-4 rounded-xl bg-emerald/5 border border-emerald/10 border-l-4 border-l-emerald mt-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Sparkles size={14} className="text-emerald-light" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-light">AI Synergy Verdict</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed italic">“{item.explanation}”</p>
                      </div>
                    )}
                  </div>

                  {/* Actions Area */}
                  <div className="flex flex-row md:flex-col gap-3 min-w-[160px] self-stretch md:self-auto justify-end">
                    {item.grant.source_url && (
                      <a
                        href={item.grant.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 md:flex-none py-3 px-4 rounded-lg bg-surface border border-outline hover:border-emerald-light/20 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 text-slate-300 hover:text-white transition-all"
                      >
                        <span>Official Portal</span>
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button
                      onClick={() => alert("RAG proposal generation is scheduled for implementation in Phase 10!")}
                      className="flex-1 md:flex-none py-3 px-4 rounded-lg bg-copper text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-md shadow-copper/15 group-hover:shadow-copper/30"
                    >
                      <span>Draft Proposal</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
