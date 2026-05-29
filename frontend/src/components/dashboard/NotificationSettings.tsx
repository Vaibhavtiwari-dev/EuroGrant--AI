"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Sliders, Save, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { z } from "zod";

const OrganizationSchema = z.object({
  id: z.number(),
  name: z.string(),
  subscription_tier: z.string(),
  sector: z.string().nullable().optional(),
  headcount_range: z.string().nullable().optional(),
  revenue_tier: z.string().nullable().optional(),
  legal_entity_type: z.string().nullable().optional(),
  countries_of_operation: z.string().nullable().optional(),
  core_technologies: z.string().nullable().optional(),
  match_threshold: z.number(),
  alert_email_enabled: z.boolean(),
  created_at: z.string(),
});

type Organization = z.infer<typeof OrganizationSchema>;

export default function NotificationSettings() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [threshold, setThreshold] = useState(0.7);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchOrgSettings = async () => {
      try {
        const data = await apiFetch("/organizations/me", {}, OrganizationSchema);
        if (data) {
          setEmailAlerts(data.alert_email_enabled);
          setThreshold(data.match_threshold);
        }
      } catch (err) {
        console.error("Failed to load organization settings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrgSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await apiFetch(
        "/organizations/me",
        {
          method: "PUT",
          body: JSON.stringify({
            alert_email_enabled: emailAlerts,
            match_threshold: threshold,
          }),
        },
        OrganizationSchema
      );
      if (updated) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[300px]">
        <Loader2 className="h-8 w-8 text-emerald-light animate-spin mb-4" />
        <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Retrieving Security Profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <Bell className="text-copper" size={24} />
          <span>Alert Rules & Thresholds</span>
        </h2>
        <p className="text-xs text-on-surface-variant opacity-60 uppercase tracking-widest mt-1">Configure automated discovery notifications and matching strictness</p>
      </div>

      <form onSubmit={handleSave} className="premium-card p-10 bg-surface/50 border border-white/5 rounded-2xl relative overflow-hidden space-y-10 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-copper/5 rounded-full blur-3xl pointer-events-none" />

        {/* Toggle Switch */}
        <div className="flex items-center justify-between gap-6 pb-8 border-b border-white/5 relative z-10">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Automated Email Alerts</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md">Receive high-priority notifications immediately when a new grant is indexed with an compatibility score higher than your threshold.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={emailAlerts}
            onClick={() => setEmailAlerts(!emailAlerts)}
            className={`w-14 h-8 flex items-center rounded-full p-1 transition-all ${
              emailAlerts ? "bg-emerald" : "bg-slate-800 border border-white/10"
            }`}
          >
            <motion.div
              layout
              className="bg-white w-6 h-6 rounded-full shadow-md"
              animate={{ x: emailAlerts ? 24 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        {/* Cosine Slider */}
        <div className="space-y-4 relative z-10">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders size={18} className="text-emerald-light" />
                <span>Cosine Similarity Threshold</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md font-medium">Controls the strictness of semantic matching. Lowering the threshold returns more generalized matches, while raising it returns only elite fits.</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-gold tracking-tight">{Math.round(threshold * 100)}%</span>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Min Compatibility</p>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-emerald-light border border-white/5"
            />
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span>0.50 (Inclusive)</span>
              <span>0.75 (Recommended)</span>
              <span>1.00 (Perfect Match)</span>
            </div>
          </div>
        </div>

        {/* Security Compliance Banner */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3 relative z-10">
          <ShieldCheck className="text-emerald-light shrink-0 mt-0.5" size={16} />
          <div>
            <h4 className="text-xs font-bold text-white">Autonomous Policy Safeguard</h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Changes to email notification parameters are locked to your organization namespace. No metrics are shared externally or exposed to public indexers.</p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-white/5 relative z-10">
          <div>
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-emerald-light text-xs font-bold flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                <span>Configuration secure. Organization settings saved successfully.</span>
              </motion.div>
            )}
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="py-3 px-6 rounded-lg bg-copper text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all shadow-md shadow-copper/10"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Securing Settings...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Alert Rules</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
