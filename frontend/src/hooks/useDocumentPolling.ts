"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

export function useDocumentPolling(intervalMs: number = 5000) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const checkStatus = useCallback(async () => {
    try {
      const response = await apiFetch("/uploads/documents");
      if (response.ok) {
        const docs = await response.json();
        const hasPending = docs.some((doc: any) => doc.status === "pending");
        
        if (!hasPending && isProcessing) {
          // Just finished processing
          setIsProcessing(false);
          setRefreshKey(prev => prev + 1);
        } else if (hasPending) {
          setIsProcessing(true);
        }
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  }, [isProcessing]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isProcessing) {
      interval = setInterval(checkStatus, intervalMs);
    } else {
      // Periodic check even if not processing to keep UI fresh
      interval = setInterval(checkStatus, intervalMs * 4);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing, checkStatus, intervalMs]);

  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setIsProcessing(true);
  };

  return { isProcessing, refreshKey, triggerRefresh };
}
