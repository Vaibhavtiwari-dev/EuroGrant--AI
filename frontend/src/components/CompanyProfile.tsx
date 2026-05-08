"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Building2, Users, Shield, Globe, Cpu, Loader2, Sparkles, Activity } from "lucide-react";
import { z } from "zod";
import { useTranslations } from "next-intl";

const OrganizationSchema = z.object({
  name: z.string(),
  subscription_tier: z.string(),
  sector: z.string().optional(),
  headcount_range: z.string().optional(),
  revenue_tier: z.string().optional(),
  legal_entity_type: z.string().optional(),
  countries_of_operation: z.string().optional(),
  core_technologies: z.string().optional(),
});

type Organization = z.infer<typeof OrganizationSchema>;

interface CompanyProfileProps {
  refreshKey: number;
}

export default function CompanyProfile({ refreshKey }: CompanyProfileProps) {
  const t = useTranslations("CompanyProfile");
  const [org, setOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fetchOrg = async () => {
      try {
        const data = await apiFetch("/organizations/me", {}, OrganizationSchema);
        if (data && typeof data === 'object' && 'name' in data && !ignore) {
          setOrg(data as Organization);
        }
      } catch (error) {
        console.error("Failed to fetch organization:", error);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };
    fetchOrg();
    return () => { ignore = true; };
  }, [refreshKey]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12" role="status" aria-label={t("querying")}>
        <Loader2 className="h-8 w-8 text-sky-400 animate-spin mb-4" />
        <p className="text-slate-300 font-bold text-sm">{t("querying")}</p>
      </div>
    );
  }

  if (!org || !org.sector) {
    return (
      <div className="p-12 text-center bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
        <div className="bg-sky-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(56,189,248,0.2)]" aria-hidden="true">
          <Sparkles className="h-8 w-8 text-sky-400" />
        </div>
        <h3 className="text-xl font-headline-md text-white mb-2">{t("noProfileTitle")}</h3>
        <p className="text-slate-300 font-medium text-sm max-w-sm mx-auto">
          {t("noProfileDesc")}
        </p>
      </div>
    );
  }

  const parseJsonSafe = (jsonStr: string | undefined) => {
    if (!jsonStr) return [];
    try {
      return JSON.parse(jsonStr);
    } catch {
      return [];
    }
  };

  const countries = parseJsonSafe(org.countries_of_operation);
  const technologies = parseJsonSafe(org.core_technologies);

  // Calculate dynamic metrics based on profile completeness and data
  const calculateMetrics = () => {
    const techScore = Math.min(60 + (technologies.length * 8), 98);
    const marketScore = Math.min(65 + (countries.length * 10), 96);
    const opScore = org.revenue_tier && org.revenue_tier !== "<1M" ? 92 : 78;
    
    return {
      marketAlignment: Math.round(marketScore),
      operationalCapacity: Math.round(opScore),
      technicalMaturity: Math.round(techScore)
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
      {/* Metrics Section */}
      <div className="col-span-1 space-y-8 pr-8 md:border-r border-white/10">
        <div className="space-y-6" aria-label="Company health metrics">
          <HealthMetric label={t("marketAlignment")} value={metrics.marketAlignment} color="bg-sky-400" glow="shadow-[0_0_10px_rgba(56,189,248,0.5)]" />
          <HealthMetric label={t("operationalCapacity")} value={metrics.operationalCapacity} color="bg-emerald-400" glow="shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
          <HealthMetric label={t("technicalMaturity")} value={metrics.technicalMaturity} color="bg-indigo-400" glow="shadow-[0_0_10px_rgba(129,140,248,0.5)]" />
        </div>

        <div className="pt-8 space-y-4">
          <div className="flex items-center gap-3">
            <Building2 className="text-sky-400" size={16} aria-hidden="true" />
            <span className="text-sm font-data-mono text-slate-300 uppercase tracking-widest">{org.sector}</span>
          </div>
          <div className="flex items-center gap-3">
            <Users className="text-sky-400" size={16} aria-hidden="true" />
            <span className="text-sm font-data-mono text-slate-300 uppercase tracking-widest">{org.headcount_range} {t("personnel")}</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="text-sky-400" size={16} aria-hidden="true" />
            <span className="text-sm font-data-mono text-slate-300 uppercase tracking-widest">{org.legal_entity_type}</span>
          </div>
        </div>
      </div>

      {/* Tags Section */}
      <div className="col-span-2 space-y-10 flex flex-col justify-center">
        <div>
          <h4 className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
            <Globe className="h-3 w-3 text-sky-400" aria-hidden="true" />
            {t("marketReach")}
          </h4>
          <div className="flex flex-wrap gap-2" aria-label="Operating countries">
            {countries.map((country: string) => (
              <span key={country} className="bg-sky-500/10 text-sky-400 px-3 py-1.5 rounded-md font-data-mono text-xs border border-sky-500/20 uppercase tracking-wider">
                {country}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h4 className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
            <Cpu className="h-3 w-3 text-sky-400" aria-hidden="true" />
            {t("techVectors")}
          </h4>
          <div className="flex flex-wrap gap-2" aria-label="Core technologies">
            {technologies.map((tech: string) => (
              <span key={tech} className="bg-white/5 text-slate-300 px-3 py-1.5 rounded-md font-data-mono text-xs border border-white/10 uppercase tracking-wider">
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Decorative Radar Placeholder from design */}
        <div className="relative pt-4 flex items-center gap-4 opacity-40 grayscale hover:grayscale-0 transition-all cursor-default group" aria-hidden="true">
          <div className="relative w-12 h-12 flex items-center justify-center">
             <div className="absolute inset-0 border border-slate-700 rounded-full"></div>
             <Activity className="text-sky-400 group-hover:scale-110 transition-transform" size={20} />
          </div>
          <div>
            <p className="text-xs font-data-mono text-slate-300 uppercase tracking-widest">{t("structuralIntegrity")}</p>
            <p className="text-xs font-body-md text-slate-600">{t("crossValidation")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthMetric({ label, value, color, glow }: { label: string, value: number, color: string, glow: string }) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="font-data-mono text-xs text-slate-500 uppercase tracking-widest">{label}</span>
        <span className="font-data-mono text-xs text-white" aria-label={`${label} score: ${value} out of 100`}>{value}/100</span>
      </div>
      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
        <div 
          className={`h-full ${color} ${glow} rounded-full transition-all duration-1000 ease-out`} 
          style={{ width: `${value}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
        ></div>
      </div>
    </div>
  );
}
