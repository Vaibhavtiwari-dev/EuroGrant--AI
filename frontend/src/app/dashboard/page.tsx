"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import DocumentUpload from "@/components/DocumentUpload";
import DocumentList from "@/components/DocumentList";
import CompanyProfile from "@/components/CompanyProfile";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ProbabilityIndicator from "@/components/dashboard/ProbabilityIndicator";
import { useAuth } from "@/context/AuthContext";
import { useDocumentPolling } from "@/hooks/useDocumentPolling";
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

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { refreshKey, triggerRefresh } = useDocumentPolling();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Auth Guard
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-label-sm uppercase tracking-widest animate-pulse">Establishing Secure Uplink...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-on-background relative">
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
        className="relative z-10 md:ml-64 pt-8 px-12 pb-24 min-h-screen"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          <DashboardHeader variants={itemVariants} />

          <div className="grid grid-cols-12 gap-8">
            <ProbabilityIndicator variants={itemVariants} />

            <motion.div variants={itemVariants} className="col-span-12 lg:col-span-8">
              <DocumentList refreshKey={refreshKey} />
            </motion.div>

            <motion.div variants={itemVariants} className="col-span-12">
              <div className="glass-card rounded-2xl p-8">
                <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                  <h3 className="font-headline-md text-headline-md text-slate-300 text-shadow-sm">Company Intelligence Profile</h3>
                  <button className="text-sky-400 font-label-sm text-label-sm hover:text-sky-300 transition-colors">View Deep Dive</button>
                </div>
                <CompanyProfile refreshKey={refreshKey} />
              </div>
            </motion.div>
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
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" 
              onClick={() => setIsUploadModalOpen(false)}
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl glass-card rounded-2xl p-8"
            >
              <button 
                aria-label="Close modal"
                onClick={() => setIsUploadModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              <div className="mb-8">
                <h2 className="text-2xl font-headline-lg text-white mb-2">Submit Documentation</h2>
                <p className="text-slate-300 text-sm">Upload your business plan, pitch deck, or financials for AI-driven extraction.</p>
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
