"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Loader2, ShieldCheck, FileText } from "lucide-react";
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
        toast.error(error.detail || "Failed to index document. Ensure you are logged in.");
      }
    } catch (error) {
      toast.error("Network analysis failed. Secure uplink unstable.");
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
    <div className="w-full space-y-8">
      <div
        {...getRootProps()}
        className={`relative w-full h-80 rounded-lg flex flex-col items-center justify-center text-center transition-all duration-500 overflow-hidden group
          ${isDragActive ? "border-emerald-light bg-emerald/5 shadow-emerald" : "bg-forest-dark/20 border border-dashed border-outline hover:border-emerald-light/40 hover:bg-forest-dark/40"}
          ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        <input {...getInputProps()} />
        
        {/* Animated background glow for drag active */}
        {isDragActive && (
          <div className="absolute inset-0 bg-emerald/5 animate-pulse pointer-events-none"></div>
        )}

        {isUploading ? (
          <div className="flex flex-col items-center z-10">
            <Loader2 className="h-16 w-16 text-emerald-light animate-spin mb-6" />
            <h3 className="text-xl font-bold text-on-surface mb-2">Analyzing Payload...</h3>
            <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-[0.2em]">Neural extraction in progress</p>
          </div>
        ) : (
          <div className="flex flex-col items-center z-10 p-8">
            <div className={`p-6 rounded-lg mb-6 transition-all duration-500 ${isDragActive ? 'bg-emerald/20 shadow-emerald' : 'bg-surface border border-outline group-hover:bg-emerald/10 group-hover:border-emerald-light/20'}`}>
              <Upload className={`h-10 w-10 transition-colors duration-500 ${isDragActive ? 'text-white' : 'text-on-surface-variant group-hover:text-emerald-light'}`} />
            </div>
            
            <h3 className="text-2xl font-bold text-on-surface mb-3">
              {isDragActive ? "Release to Index" : "Ingest Document"}
            </h3>
            
            <p className="text-on-surface-variant text-sm max-w-[300px] leading-relaxed opacity-70">
              Drag business plans, pitch decks or financials here to trigger automated AI profiling.
            </p>
            
            <div className="mt-10 flex gap-4">
               <FileFormatTag label="PDF" />
               <FileFormatTag label="DOCX" />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3 opacity-60">
          <ShieldCheck className="text-emerald-light" size={16} />
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Secure TLS Transmission Active</span>
        </div>
        <div className="flex items-center gap-2 opacity-60">
           <FileText className="text-copper" size={16} />
           <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Max 25MB</span>
        </div>
      </div>
    </div>
  );
}

function FileFormatTag({ label }: { label: string }) {
  return (
    <span className="bg-surface text-on-surface-variant px-4 py-1.5 rounded-md font-bold text-[10px] border border-outline uppercase tracking-[0.2em] group-hover:text-on-surface group-hover:border-emerald-light/20 transition-all">
      {label}
    </span>
  );
}
