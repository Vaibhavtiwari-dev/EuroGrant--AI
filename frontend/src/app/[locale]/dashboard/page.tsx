"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "@/i18n/routing";
import DocumentUpload from "@/components/DocumentUpload";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import StatsOverview from "@/components/dashboard/StatsOverview";
import RAGProgress from "@/components/dashboard/RAGProgress";
import HotMatches from "@/components/dashboard/HotMatches";
import { useAuth } from "@/context/AuthContext";
import { useDocumentPolling } from "@/hooks/useDocumentPolling";
import { apiFetch } from "@/lib/api";
import { X } from "lucide-react";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

interface DashboardOverview {
  stats: {
    active_high_matches: number;
    ai_generation_quality: number;
    total_pipeline_value: number;
  };
  pipelines: Array<{
    id: string;
    title: string;
    status: string;
    progress: number;
    subtext: string;
  }>;
  hot_matches: Array<{
    title: string;
    desc: string;
    score: number;
    time: string;
  }>;
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { triggerRefresh, refreshKey } = useDocumentPolling();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);

  // Auth Guard
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch Overview Data
  useEffect(() => {
    const fetchOverview = async () => {
      if (user) {
        try {
          const res = await apiFetch("/organizations/dashboard-overview");
          if (res.ok) {
            const data = await res.json();
            setOverview(data);
          }
        } catch (error) {
          console.error("Failed to fetch dashboard overview", error);
        }
      }
    };
    fetchOverview();
  }, [user, refreshKey]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleUploadSuccess = () => {
    triggerRefresh();
    setIsUploadModalOpen(false);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-emerald/10 border-t-emerald-light rounded-full animate-spin"></div>
          <p className="text-emerald-light/60 font-bold uppercase tracking-[0.2em] text-xs animate-pulse">Establishing Secure Uplink...</p>
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
        setIsUploadModalOpen={setIsUploadModalOpen}
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
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-12 lg:col-span-8 space-y-12">
              <StatsOverview variants={itemVariants} stats={overview?.stats} />
              <motion.div variants={itemVariants}>
                <RAGProgress pipelines={overview?.pipelines || []} />
              </motion.div>
            </div>

            <div className="col-span-12 lg:col-span-4">
              <motion.div variants={itemVariants}>
                <HotMatches matches={overview?.hot_matches || []} />
              </motion.div>
            </div>
          </div>
        </div>
      </motion.main>

      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
              onClick={() => setIsUploadModalOpen(false)}
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl premium-card p-10 bg-surface/90 backdrop-blur-xl"
            >
              <button 
                aria-label="Close modal"
                onClick={() => setIsUploadModalOpen(false)}
                className="absolute top-6 right-6 text-on-surface-variant hover:text-emerald-light transition-colors"
              >
                <X size={24} />
              </button>
              <div className="mb-10">
                <h2 className="text-3xl font-bold text-on-surface mb-3">Submit Documentation</h2>
                <p className="text-on-surface-variant text-sm">Upload your business plan, pitch deck, or financials for AI-driven extraction.</p>
              </div>
              <DocumentUpload onUploadSuccess={handleUploadSuccess} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[45] bg-black/60 md:hidden" 
            onClick={() => setIsSidebarOpen(false)}
          ></motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
