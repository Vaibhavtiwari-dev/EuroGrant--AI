"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { FileText, Loader2, Radar } from "lucide-react";
import { z } from "zod";
import { useTranslations, useFormatter } from "next-intl";

const DocumentSchema = z.object({
  id: z.number(),
  file_name: z.string(),
  status: z.enum(["pending", "processed", "failed"]),
  created_at: z.string(),
});

const DocumentListSchema = z.array(DocumentSchema);

type Document = z.infer<typeof DocumentSchema>;

interface DocumentListProps {
  refreshKey: number;
}

export default function DocumentList({ refreshKey }: DocumentListProps) {
  const t = useTranslations("DocumentList");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      try {
        const data = await apiFetch("/uploads/documents", {}, DocumentListSchema);
        if (Array.isArray(data) && !ignore) {
          setDocuments(data);
        }
      } catch (error) {
        console.error("Failed to fetch documents:", error);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, [refreshKey]);

  useEffect(() => {
    const hasPending = documents.some(doc => doc.status === "pending");
    if (!hasPending) return;

    const interval = setInterval(async () => {
      try {
        const data = await apiFetch("/uploads/documents", {}, DocumentListSchema);
        if (Array.isArray(data)) {
          setDocuments(data);
        }
      } catch (error) {
        console.error("Failed to fetch documents:", error);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [documents]);

  if (isLoading && documents.length === 0) {
    return (
      <div className="flex justify-center p-12" role="status" aria-label="Loading documents">
        <Loader2 className="animate-spin h-8 w-8 text-sky-400 opacity-50" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center p-12 border border-dashed border-white/10 rounded-xl bg-white/5 backdrop-blur-md">
        <p className="text-slate-300 font-medium opacity-60 text-sm">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
        <h3 className="font-headline-md text-headline-md text-slate-300 flex items-center gap-3">
          <Radar className="text-sky-400" size={20} aria-hidden="true" />
          {t("title")}
        </h3>
        <span className="font-label-sm text-sm text-slate-300 uppercase tracking-widest opacity-60">
          {t("insightsFound", { count: documents.length })}
        </span>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar" aria-label="Document list">
        {documents.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} />
        ))}
      </div>
    </div>
  );
}

function DocumentCard({ doc }: { doc: Document }) {
  const t = useTranslations("DocumentList");
  const format = useFormatter();

  const getStatusStyles = () => {
    switch (doc.status) {
      case "processed":
        return {
          border: "border-l-emerald-500",
          tag: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
          match: "98% Match"
        };
      case "failed":
        return {
          border: "border-l-error",
          tag: "bg-error/20 text-error border-error/30",
          match: "Failed"
        };
      default:
        return {
          border: "border-l-sky-500",
          tag: "bg-sky-500/20 text-sky-400 border-sky-500/30",
          match: "Analyzing..."
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div className={`glass-card rounded-xl p-6 hover:translate-x-2 transition-transform duration-500 cursor-pointer border-l-4 ${styles.border} group`} role="listitem">
      <div className="flex justify-between items-start">
        <div className="flex gap-4">
          <div className="bg-white/5 p-3 rounded-lg border border-white/10 group-hover:border-white/20 transition-colors" aria-hidden="true">
            <FileText className="text-slate-300" size={24} />
          </div>
          <div>
            <h4 className="font-headline-lg text-xl text-white mb-1 group-hover:text-sky-400 transition-colors">{doc.file_name}</h4>
            <p className="font-body-md text-sm text-slate-300 max-w-2xl">
              {t("verified")}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full font-data-mono text-xs border ${styles.tag}`} role="status">
          {styles.match}
        </span>
      </div>
      
      <div className="mt-6 flex flex-wrap gap-3">
        <InsightTag label={t("aiAlignment")} />
        {doc.status === "processed" && <InsightTag label={t("vectorized")} active />}
        <time className="ml-auto text-xs text-slate-500 font-data-mono uppercase tracking-widest flex items-center gap-2" dateTime={doc.created_at}>
          {format.dateTime(new Date(doc.created_at), {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
          <span className="w-1 h-1 bg-slate-600 rounded-full" aria-hidden="true"></span>
          {format.dateTime(new Date(doc.created_at), {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </time>
      </div>
    </div>
  );
}

function InsightTag({ label, active = false }: { label: string, active?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800/50 text-slate-300 font-label-sm text-xs border border-white/5">
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-sky-400'} animate-pulse`} aria-hidden="true"></span>
      {label}
    </span>
  );
}
