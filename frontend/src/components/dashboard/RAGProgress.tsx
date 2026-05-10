"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Clock } from "lucide-react";

interface Pipeline {
  id: string;
  title: string;
  status: string;
  progress: number;
  subtext: string;
}

interface RAGProgressProps {
  pipelines: Pipeline[];
}

export default function RAGProgress({ pipelines }: RAGProgressProps) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case "GENERATING":
        return { color: "text-copper bg-copper/10", progressColor: "bg-copper" };
      case "READY":
        return { color: "text-emerald-light bg-emerald/10", progressColor: "bg-emerald-light" };
      default:
        return { color: "text-on-surface-variant bg-surface-variant/50", progressColor: "bg-on-surface-variant/30" };
    }
  };

  return (
    <div className="premium-card p-10 space-y-10">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold flex items-center gap-3">
          <span className="text-copper">#</span>
          RAG Pipeline Progress
        </h3>
        <button className="text-xs font-bold text-emerald-light hover:underline tracking-widest uppercase">View All</button>
      </div>

      <div className="space-y-12">
        {pipelines.length === 0 ? (
          <div className="py-20 text-center space-y-4">
             <div className="w-12 h-12 rounded-full bg-surface-variant/50 flex items-center justify-center mx-auto opacity-30">
                <Clock className="text-on-surface-variant" size={24} />
             </div>
             <p className="text-on-surface-variant text-sm font-bold uppercase tracking-widest opacity-40">No active pipelines detected</p>
             <p className="text-on-surface-variant/50 text-xs">Upload documentation to trigger AI extraction.</p>
          </div>
        ) : (
          pipelines.map((item, i) => {
            const styles = getStatusStyles(item.status);
            return (
              <div key={item.id} className="space-y-4 group">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-black tracking-widest text-on-surface-variant opacity-40">{item.id}</p>
                    <h4 className="text-sm font-bold text-on-surface group-hover:text-emerald-light transition-colors">{item.title}</h4>
                  </div>
                  <div className={`px-3 py-1 rounded-md text-[10px] font-black tracking-widest flex items-center gap-2 border border-outline ${styles.color}`}>
                    {item.status === "GENERATING" && <Loader2 size={10} className="animate-spin" />}
                    {item.status === "READY" && <CheckCircle2 size={10} />}
                    {item.status === "QUEUED" && <Clock size={10} />}
                    {item.status}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant opacity-60">
                    <span>{item.subtext}</span>
                    <span>{item.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-outline rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.progress}%` }}
                      transition={{ duration: 1, delay: i * 0.2 }}
                      className={`h-full ${styles.progressColor}`}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
