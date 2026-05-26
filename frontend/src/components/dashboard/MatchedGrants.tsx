"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { Award, Calendar, Euro, Loader2, Sparkles, ExternalLink } from "lucide-react";

interface Grant {
  id: number;
  external_id: string;
  title: string;
  description: string;
  deadline: string | null;
  funding_range: string | null;
  eligibility_criteria: string | null;
  scoring_rubric: string | null;
  source_url: string | null;
  sector_tags: string | null;
}

interface GrantMatch {
  id: number;
  score: number;
  explanation: string | null;
  grant: Grant;
}

export default function MatchedGrants() {
  const t = useTranslations("MatchedGrants");
  const [matches, setMatches] = useState<GrantMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const response = await apiFetch("/grants/matches");
        if (response.ok) {
          const data = await response.json();
          setMatches(data);
        } else {
          throw new Error("Failed to fetch");
        }
      } catch (err) {
        console.warn("Backend match endpoint failed or not implemented, using mock matched grants", err);
        // Load fallback mock data
        setMatches([
          {
            id: 1,
            score: 0.94,
            explanation: "Direct alignment with your IoT hardware expansion and eco-friendly manufacturing initiatives in northern Europe.",
            grant: {
              id: 101,
              external_id: "HORIZON-CL4-2024-DATA-01-01",
              title: "Horizon Europe: Smart Green Manufacturing and IoT Infrastructure",
              description: "Funding for SMEs developing innovative hardware/software solutions that reduce carbon emissions in manufacturing processes using AI and IoT.",
              deadline: "2026-10-15T17:00:00Z",
              funding_range: "€1.5M - €2.5M",
              eligibility_criteria: "EU-based SMEs with validated prototypes (TRL 5+).",
              scoring_rubric: "Technology excellence (30%), Impact (40%), Implementation quality (30%).",
              source_url: "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/horizon-cl4-2024-data-01-01",
              sector_tags: '["Manufacturing", "IoT", "GreenTech"]'
            }
          },
          {
            id: 2,
            score: 0.88,
            explanation: "Matches your deep learning technology stack and your focus on predictive analytics for industrial asset management.",
            grant: {
              id: 102,
              external_id: "EIC-2024-ACCELERATOR-02",
              title: "EIC Accelerator: DeepTech AI for Industrial Telemetry",
              description: "Supporting disruptive deeptech startups and SMEs scale up breakthrough artificial intelligence technologies with industrial applications.",
              deadline: "2026-09-08T17:00:00Z",
              funding_range: "€500k - €1.5M",
              eligibility_criteria: "SMEs with high-risk, high-impact innovations seeking equity or grant funding.",
              scoring_rubric: "Innovation breakthrough (40%), Market scale potential (40%), Team execution (20%).",
              source_url: "https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator_en",
              sector_tags: '["Artificial Intelligence", "DeepTech", "Industrial"]'
            }
          },
          {
            id: 3,
            score: 0.72,
            explanation: "Relevant to your team expansion plans and cloud security architecture, though the focus is broader on digital transition.",
            grant: {
              id: 103,
              external_id: "DIGITAL-2024-CLOUD-01",
              title: "Digital Europe Programme: Federated Secure Cloud Services",
              description: "Grants to support the deployment of cloud-to-edge federated infrastructure and services across EU member states.",
              deadline: "2026-11-21T17:00:00Z",
              funding_range: "€2.0M - €4.0M",
              eligibility_criteria: "Consortium of EU companies, research organizations, and public sector bodies.",
              scoring_rubric: "Alignment with EU cloud strategy (50%), Technical viability (35%), Scalability (15%).",
              source_url: "https://digital-strategy.ec.europa.eu/en/activities/digital-programme",
              sector_tags: '["Cloud Computing", "Cybersecurity", "Infrastructure"]'
            }
          }
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-10 h-10 text-emerald-light animate-spin" />
        <p className="text-on-surface-variant text-sm font-bold uppercase tracking-widest animate-pulse">
          {t("loading")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-4xl font-bold text-on-surface mb-2">{t("title")}</h2>
        <p className="text-on-surface-variant opacity-70">{t("description")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {matches.length === 0 ? (
          <div className="premium-card p-12 text-center space-y-4">
            <Award className="w-12 h-12 text-on-surface-variant/30 mx-auto" />
            <h3 className="text-xl font-bold">{t("noMatchesTitle")}</h3>
            <p className="text-on-surface-variant text-sm max-w-md mx-auto">
              {t("noMatchesDesc")}
            </p>
          </div>
        ) : (
          matches.map((match, i) => {
            const pct = Math.round(match.score * 100);
            let tags: string[] = [];
            try {
              if (match.grant.sector_tags) {
                tags = JSON.parse(match.grant.sector_tags);
              }
            } catch {
              if (typeof match.grant.sector_tags === "string") {
                tags = [match.grant.sector_tags];
              }
            }

            return (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="premium-card p-8 border-l-4 border-l-copper hover:border-emerald-light transition-all flex flex-col justify-between"
              >
                <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] font-mono bg-surface-variant/60 px-2 py-1 rounded text-on-surface-variant border border-outline">
                        {match.grant.external_id}
                      </span>
                      <div className="flex gap-2">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-semibold bg-emerald/10 text-emerald-light px-2.5 py-0.5 rounded-full border border-emerald/20"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold text-on-surface transition-colors">
                      {match.grant.title}
                    </h3>

                    <p className="text-sm text-on-surface-variant/80 leading-relaxed">
                      {match.grant.description}
                    </p>

                    {match.explanation && (
                      <div className="p-4 rounded-lg bg-emerald/5 border border-emerald/10 space-y-1.5">
                        <div className="flex items-center gap-2 text-emerald-light">
                          <Sparkles size={14} />
                          <span className="text-[10px] font-black uppercase tracking-[0.1em]">{t("whyItMatches")}</span>
                        </div>
                        <p className="text-xs text-on-surface-variant/90 leading-relaxed font-medium">
                          {match.explanation}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-outline pt-6 lg:pt-0 lg:pl-6 gap-6 min-w-[200px]">
                    <div className="text-left lg:text-right space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60 mb-1">
                          {t("compatibility")}
                        </p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-gold">{pct}%</span>
                          <span className="text-[10px] font-bold text-on-surface-variant opacity-50">Match</span>
                        </div>
                      </div>

                      {match.grant.funding_range && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60 mb-0.5">
                            {t("funding")}
                          </p>
                          <div className="flex items-center gap-1.5 text-sm font-bold text-on-surface">
                            <Euro size={14} className="text-emerald-light" />
                            <span>{match.grant.funding_range}</span>
                          </div>
                        </div>
                      )}

                      {match.grant.deadline && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60 mb-0.5">
                            {t("deadline")}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface">
                            <Calendar size={14} className="text-copper" />
                            <span>{new Date(match.grant.deadline).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-4 mt-8 pt-6 border-t border-outline">
                  {match.grant.source_url && (
                    <a
                      href={match.grant.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-surface-variant hover:bg-surface-variant/80 border border-outline text-xs font-bold text-on-surface flex items-center gap-2 transition-all"
                    >
                      <span>{t("viewDetails")}</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <button className="px-5 py-2.5 rounded-lg bg-copper hover:brightness-110 shadow-md shadow-copper/10 text-xs font-black tracking-wider text-white uppercase transition-all">
                    {t("generateProposal")}
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
