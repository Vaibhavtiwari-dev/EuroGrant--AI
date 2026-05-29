"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Search, Loader2, Calendar, Award, ExternalLink, Filter, HelpCircle } from "lucide-react";
import { z } from "zod";

const GrantSchema = z.object({
  id: z.number(),
  external_id: z.string(),
  title: z.string(),
  description: z.string(),
  deadline: z.string(),
  funding_range: z.string().optional().nullable(),
  eligibility_criteria: z.string().optional().nullable(),
  source_url: z.string().optional().nullable(),
  sector_tags: z.string().optional().nullable(),
});

const GrantListSchema = z.array(GrantSchema);
type Grant = z.infer<typeof GrantSchema>;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } }
};

export default function GrantSearchPage() {
  const { user, loading, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const [query, setQuery] = useState("");
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async (isInitial = false) => {
    setIsSearching(true);
    try {
      const payload = {
        query: isInitial ? "" : query,
        limit: 10,
        offset: 0,
        sectors: selectedSectors.length > 0 ? selectedSectors : undefined
      };
      
      const res = await apiFetch("/grants/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const rawData = await res.json();
        const parsed = GrantListSchema.safeParse(rawData);
        if (parsed.success) {
          setGrants(parsed.data);
        } else {
          console.error("Schema validation failed for grants list:", parsed.error);
        }
      }
    } catch (err) {
      console.error("Failed to query grants:", err);
    } finally {
      setIsSearching(false);
      if (!isInitial) {
        setSearched(true);
      }
    }
  }, [query, selectedSectors]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Initial Load - Get all available grants
  const hasInitialLoad = useRef(false);
  useEffect(() => {
    if (user && !hasInitialLoad.current) {
      hasInitialLoad.current = true;
      handleSearch(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggleSector = (sector: string) => {
    setSelectedSectors(prev => 
      prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector]
    );
  };

  const parseTags = (tagsStr: string | null | undefined): string[] => {
    if (!tagsStr) return [];
    try {
      return JSON.parse(tagsStr);
    } catch {
      return [];
    }
  };

  const formatDeadline = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "N/A";
    }
  };

  const availableSectors = ["SaaS", "GreenTech", "DeepTech", "AI", "Quantum", "ESG", "FinTech", "Enterprise"];

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-emerald/10 border-t-emerald-light rounded-full animate-spin"></div>
          <p className="text-emerald-light/60 font-bold uppercase tracking-[0.2em] text-xs animate-pulse">Syncing Opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background selection:bg-emerald/10">
      <Sidebar 
        isMobile={isMobile}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        setIsUploadModalOpen={() => {}}
        logout={logout}
      />

      <Header 
        user={user}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <motion.main 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 md:ml-64 pt-12 px-12 pb-32 min-h-screen hero-gradient"
      >
        <div className="max-w-6xl mx-auto">
          {/* Headline */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-on-surface mb-3 flex items-center gap-4">
              <Search className="text-emerald-light" size={32} />
              AI Grant Recommendation Engine
            </h1>
            <p className="text-on-surface-variant max-w-xl text-sm leading-relaxed">
              Query our secure database of public tender listings dynamically integrated with high-fidelity semantic embeddings.
            </p>
          </div>

          {/* Search Console */}
          <div className="premium-card p-8 bg-surface/50 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl mb-12 space-y-6">
            <div className="relative">
              <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search semantic matches (e.g. Estonian circular energy systems or B2B export financing...)"
                className="w-full pl-14 pr-32 py-5 bg-background/80 rounded-xl border border-white/10 text-on-surface placeholder:text-on-surface-variant/40 focus:border-emerald-light focus:ring-1 focus:ring-emerald-light outline-none transition-all text-base font-medium shadow-inner"
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={24} />
              <button 
                onClick={() => handleSearch()}
                disabled={isSearching}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-3 bg-emerald hover:bg-emerald-light text-surface font-semibold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
              >
                {isSearching ? <Loader2 className="animate-spin h-5 w-5" /> : "Recommend"}
              </button>
            </div>

            {/* Filter tags */}
            <div className="flex flex-wrap items-center gap-4 border-t border-white/5 pt-6">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 flex items-center gap-2">
                <Filter size={14} /> Sector Filters:
              </span>
              <div className="flex flex-wrap gap-2">
                {availableSectors.map(sec => {
                  const isSelected = selectedSectors.includes(sec);
                  return (
                    <button
                      key={sec}
                      onClick={() => toggleSector(sec)}
                      className={`px-4 py-2 rounded-full text-xs font-semibold border tracking-wide transition-all ${
                        isSelected 
                          ? "bg-emerald/20 border-emerald text-emerald-light shadow-[0_0_10px_rgba(16,185,129,0.15)]" 
                          : "bg-background/40 border-white/5 text-on-surface-variant hover:border-white/20"
                      }`}
                    >
                      {sec}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <div className="space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 border-b border-white/5 pb-4">
              Matched Opportunities ({grants.length})
            </h2>

            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-10 w-10 text-emerald animate-spin mb-4" />
                <p className="text-on-surface-variant text-sm font-semibold tracking-wider animate-pulse">Running semantic cosine similarity matching...</p>
              </div>
            ) : grants.length === 0 ? (
              <div className="text-center py-20 premium-card bg-surface/20 backdrop-blur-md rounded-2xl border border-dashed border-white/10">
                <HelpCircle className="h-12 w-12 text-on-surface-variant/40 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-on-surface mb-2">No matching grants found</h3>
                <p className="text-on-surface-variant max-w-sm mx-auto text-xs leading-relaxed">
                  Try widening your search terms or relaxing sector filter bounds. 
                  {searched ? "" : " Crawlers gather new opportunities daily."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {grants.map((grant) => (
                  <motion.div 
                    key={grant.id}
                    variants={itemVariants}
                    className="premium-card p-8 bg-surface/30 hover:bg-surface/50 backdrop-blur-md rounded-2xl border border-white/5 shadow-lg transition-all group relative overflow-hidden"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-light uppercase tracking-widest bg-emerald/10 border border-emerald/20 px-3 py-1 rounded-full mb-3 inline-block">
                          {grant.external_id}
                        </span>
                        <h3 className="text-2xl font-bold text-on-surface group-hover:text-emerald-light transition-colors leading-tight">
                          {grant.title}
                        </h3>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-right">
                        {grant.funding_range && (
                          <div className="text-lg font-bold text-emerald-light bg-emerald/10 border border-emerald/20 px-4 py-1.5 rounded-lg flex items-center gap-2">
                            <Award size={18} />
                            {grant.funding_range}
                          </div>
                        )}
                        <span className="text-xs text-on-surface-variant/60 flex items-center gap-1.5 font-medium">
                          <Calendar size={14} />
                          Deadline: {formatDeadline(grant.deadline)}
                        </span>
                      </div>
                    </div>

                    <p className="text-on-surface-variant text-sm leading-relaxed mb-6 border-b border-white/5 pb-6">
                      {grant.description}
                    </p>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      {/* Eligibility summary */}
                      <div className="text-xs text-on-surface-variant max-w-lg leading-relaxed">
                        <strong className="text-on-surface font-semibold">Eligibility: </strong>
                        {grant.eligibility_criteria || "SMEs registered inside European territories."}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                          {parseTags(grant.sector_tags).map(tag => (
                            <span key={tag} className="text-[10px] font-semibold bg-background/50 border border-white/5 px-2.5 py-1 rounded text-on-surface-variant/80">
                              {tag}
                            </span>
                          ))}
                        </div>
                        {grant.source_url && (
                          <a 
                            href={grant.source_url}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2.5 bg-background/60 hover:bg-emerald/10 text-on-surface hover:text-emerald-light border border-white/5 hover:border-emerald/20 rounded-lg transition-all shadow active:scale-95 flex items-center justify-center"
                            aria-label="View source details"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.main>
    </div>
  );
}
