"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Loader2, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface DocumentUploadProps {
  onUploadSuccess: () => void;
}

export default function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await apiFetch("/uploads/company-document", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast.success("Intelligence indexed successfully.");
        onUploadSuccess();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to index document");
      }
    } catch (error) {
      toast.error("Network analysis failed");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="w-full space-y-6">
      <div
        {...getRootProps()}
        className={`relative w-full h-72 rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-700 overflow-hidden group
          ${isDragActive ? "neon-ring shadow-[0_0_50px_rgba(56,189,248,0.3)]" : "bg-slate-900/40 border border-dashed border-white/10 hover:border-sky-500/40 hover:bg-slate-900/60"}
          ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        <input {...getInputProps()} />
        
        {/* Animated background glow for drag active */}
        {isDragActive && (
          <div className="absolute inset-0 bg-sky-500/5 animate-pulse pointer-events-none"></div>
        )}

        {isUploading ? (
          <div className="flex flex-col items-center z-10">
            <Loader2 className="h-14 w-14 text-sky-400 animate-spin mb-6" />
            <h3 className="text-xl font-headline-md text-white mb-2">Analyzing Payload...</h3>
            <p className="text-slate-500 text-xs font-data-mono uppercase tracking-[0.2em]">Neural extraction in progress</p>
          </div>
        ) : (
          <div className="flex flex-col items-center z-10 p-8">
            <div className={`p-5 rounded-2xl mb-6 transition-all duration-500 ${isDragActive ? 'bg-sky-500/20 shadow-[0_0_20px_rgba(56,189,248,0.4)]' : 'bg-white/5 border border-white/5 group-hover:bg-sky-500/10 group-hover:border-sky-500/20'}`}>
              <Upload className={`h-10 w-10 transition-colors duration-500 ${isDragActive ? 'text-white' : 'text-slate-300 group-hover:text-sky-400'}`} />
            </div>
            
            <h3 className="text-xl font-headline-md text-white mb-3">
              {isDragActive ? "Commit to Index" : "Ingest Document"}
            </h3>
            
            <p className="text-slate-300 font-body-md text-sm max-w-[280px] leading-relaxed">
              Drag business plans or financials here to trigger automated AI profiling.
            </p>
            
            <div className="mt-8 flex gap-3">
               <FileFormatTag label="PDF" />
               <FileFormatTag label="DOCX" />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 opacity-50">
          <ShieldCheck className="text-emerald-400" size={14} />
          <span className="text-[10px] font-data-mono text-slate-300 uppercase tracking-widest">Secure TLS Transmission Active</span>
        </div>
        <span className="text-[10px] font-data-mono text-slate-500 uppercase tracking-widest">Max 25MB Per file</span>
      </div>
    </div>
  );
}

function FileFormatTag({ label }: { label: string }) {
  return (
    <span className="bg-slate-800/50 text-slate-500 px-3 py-1 rounded font-data-mono text-[9px] border border-white/5 uppercase tracking-[0.2em] group-hover:text-slate-300 group-hover:border-white/10 transition-all">
      {label}
    </span>
  );
}
