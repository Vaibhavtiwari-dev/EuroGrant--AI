"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import { useAuth } from "@/context/AuthContext";
import { BarChart2, TrendingUp, Target, Award, Calendar, Loader2 } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
};

export default function AnalyticsPage() {
  const { user, loading, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="w-16 h-16 border-4 border-emerald/10 border-t-emerald-light rounded-full animate-spin" />
          <p className="text-emerald-light/60 font-bold uppercase tracking-[0.2em] text-xs animate-pulse">Loading Analytics...</p>
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

      <Header user={user} setIsSidebarOpen={setIsSidebarOpen} />

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 md:ml-64 pt-12 px-12 pb-32 min-h-screen hero-gradient"
      >
        <div className="max-w-6xl mx-auto space-y-10">
          {/* Page Header */}
          <motion.div variants={itemVariants}>
            <h1 className="text-4xl font-bold text-on-surface mb-3 flex items-center gap-4">
              <BarChart2 className="text-emerald-light" size={32} />
              Grant Performance Analytics
            </h1>
            <p className="text-on-surface-variant max-w-xl text-sm leading-relaxed">
              Historical telemetry on grant discovery pipelines, proposal win rates, and sector breakdown analytics.
            </p>
          </motion.div>

          {/* Coming Soon Banner */}
          <motion.div
            variants={itemVariants}
            className="premium-card p-16 bg-surface/30 backdrop-blur-md rounded-2xl border border-dashed border-white/10 text-center"
          >
            <div className="bg-emerald/10 p-5 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-8 border border-emerald/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <BarChart2 className="h-10 w-10 text-emerald-light" />
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-4">Analytics Dashboard — Coming Soon</h2>
            <p className="text-on-surface-variant max-w-lg mx-auto text-sm leading-relaxed mb-10">
              Real-time grant performance telemetry is scheduled for Phase 11. Historical match data, proposal win rates, and category breakdowns will be available here.
            </p>

            {/* Skeleton stat cards to convey intent */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {[
                { icon: <TrendingUp size={20} />, label: "Total Matched", sub: "Est. 0 grants this month" },
                { icon: <Target size={20} />, label: "Win Rate", sub: "Est. 0% proposal success" },
                { icon: <Award size={20} />, label: "Total Pipeline Value", sub: "€0 secured" },
              ].map((card, i) => (
                <div
                  key={i}
                  className="p-6 rounded-xl bg-white/5 border border-white/5 flex items-start gap-4"
                >
                  <div className="p-3 rounded-lg bg-emerald/10 text-emerald-light">{card.icon}</div>
                  <div>
                    <p className="text-white font-bold text-lg">{card.label}</p>
                    <p className="text-on-surface-variant text-xs mt-1">{card.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Placeholder chart area */}
          <motion.div
            variants={itemVariants}
            className="premium-card p-10 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Grant Category Breakdown</h3>
                <p className="text-xs text-on-surface-variant mt-1">Distribution of indexed opportunities by sector</p>
              </div>
              <Calendar size={18} className="text-on-surface-variant/50" />
            </div>
            <div className="flex items-end gap-3 h-40">
              {["SaaS", "GreenTech", "DeepTech", "AI", "FinTech"].map((label, i) => (
                <div key={label} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-emerald/20 rounded-t-md animate-pulse"
                    style={{ height: `${[60, 45, 80, 35, 50][i]}%` }}
                  />
                  <span className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.main>
    </div>
  );
}