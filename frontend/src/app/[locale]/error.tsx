'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { AlertCircle, RefreshCcw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('Error')

  useEffect(() => {
    // Log the error to an observability provider (as per GEMINI.md mandate)
    console.error('Next.js Error Boundary caught error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in duration-700">
      <div className="glass-card p-12 max-w-xl rounded-3xl border-error/20 bg-surface/80 backdrop-blur-2xl">
        <div className="flex justify-center mb-8">
          <div className="p-4 rounded-full bg-error/10 border border-error/30 animate-pulse">
            <AlertCircle className="w-12 h-12 text-error" />
          </div>
        </div>
        
        <h2 className="text-3xl font-headline-lg text-white mb-4 tracking-tight">
          {t('title')}
        </h2>
        
        <p className="font-body-md text-slate-400 mb-10 leading-relaxed">
          {t('description')}
          {error.digest && (
            <span className="block mt-4 text-[10px] uppercase tracking-widest text-slate-500 font-data-mono">
              Diagnostic ID: {error.digest}
            </span>
          )}
        </p>
        
        <button
          onClick={() => reset()}
          className="group flex items-center gap-2 mx-auto px-8 py-4 bg-sky-400 hover:bg-sky-300 text-black font-bold rounded-full transition-all duration-300 active:scale-95 shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_30px_rgba(56,189,248,0.5)]"
          aria-label={t('retry')}
        >
          <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
          {t('retry')}
        </button>
      </div>
    </div>
  )
}
