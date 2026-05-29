"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  CheckCircle2, 
  Upload, 
  Zap, 
  Shield, 
  BarChart3, 
  FileText,
  Menu,
  X,
  Play
} from "lucide-react";
import { useState } from "react";

export default function LandingPage() {
  const t = useTranslations("Landing");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: "easeOut" as const }
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background selection:bg-emerald/10 font-inter">
      {/* Navigation */}
      <nav className="glass-header h-20 flex items-center justify-center px-4 md:px-8">
        <div className="max-w-7xl w-full flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-emerald/10 rounded-lg flex items-center justify-center border border-emerald/20 transition-transform group-hover:rotate-12">
                <Shield className="text-emerald-light w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight text-on-surface">EuroGrant <span className="text-emerald-light">AI</span></span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="#" className="text-sm font-medium text-on-surface-variant hover:text-emerald-light transition-colors">{t("navSolutions")}</Link>
              <Link href="#" className="text-sm font-medium text-on-surface-variant hover:text-emerald-light transition-colors">{t("navGrants")}</Link>
              <Link href="#" className="text-sm font-medium text-on-surface-variant hover:text-emerald-light transition-colors">{t("navResources")}</Link>
              <Link href="#" className="text-sm font-medium text-on-surface-variant hover:text-emerald-light transition-colors">{t("navPricing")}</Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-on-surface-variant hover:text-emerald-light px-4 py-2 transition-colors">
              {t("navLogin")}
            </Link>
            <Link href="/register" className="btn-primary py-2.5">
              {t("navGetStarted")}
            </Link>
          </div>

          <button className="md:hidden p-2 text-on-surface-variant" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden fixed inset-x-0 top-20 bg-surface border-b border-outline z-40 p-6 flex flex-col gap-6 shadow-lg"
        >
          <Link href="#" className="text-lg font-medium text-on-surface-variant">{t("navSolutions")}</Link>
          <Link href="#" className="text-lg font-medium text-on-surface-variant">{t("navGrants")}</Link>
          <Link href="#" className="text-lg font-medium text-on-surface-variant">{t("navResources")}</Link>
          <Link href="#" className="text-lg font-medium text-on-surface-variant">{t("navPricing")}</Link>
          <hr className="border-outline" />
          <Link href="/login" className="text-lg font-semibold text-on-surface">{t("navLogin")}</Link>
          <Link href="/register" className="btn-primary text-center">
            {t("navGetStarted")}
          </Link>
        </motion.div>
      )}

      <main>
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden hero-gradient">
          <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col lg:flex-row items-center gap-16">
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex-1 text-center lg:text-left z-10"
            >
              <motion.div 
                variants={itemVariants}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald/5 border border-emerald/10 mb-8"
              >
                <Zap className="w-3.5 h-3.5 text-gold" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-light">Enterprise Grant Automation</span>
              </motion.div>
              
              <motion.h1 
                variants={itemVariants}
                className="text-5xl md:text-7xl font-black text-on-surface leading-[1.1] mb-8"
              >
                {t("heroTitle").split('to').map((part, i) => (
                  <span key={i} className="block">
                    {i === 1 ? 'to ' : ''}
                    <span className={i === 1 ? "text-emerald-light/60" : ""}>{part}</span>
                  </span>
                ))}
              </motion.h1>

              <motion.p 
                variants={itemVariants}
                className="text-lg text-on-surface-variant leading-relaxed max-w-2xl mb-10 mx-auto lg:mx-0 opacity-80"
              >
                {t("heroSubtext")}
              </motion.p>

              <motion.div 
                variants={itemVariants}
                className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
              >
                <Link href="/register" className="btn-primary flex items-center gap-2 shadow-emerald group">
                  {t("ctaStart")}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button className="btn-secondary flex items-center gap-2">
                  <Play className="w-4 h-4 fill-emerald-light" />
                  {t("ctaDemo")}
                </button>
              </motion.div>

              <motion.div 
                variants={itemVariants}
                className="mt-12 flex flex-wrap items-center justify-center lg:justify-start gap-8 opacity-60"
              >
                <div className="flex items-center gap-2 text-gold">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">{t("badgeCompliance")}</span>
                </div>
                <div className="flex items-center gap-2 text-gold">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">{t("badgeData")}</span>
                </div>
              </motion.div>
            </motion.div>

            <div className="flex-1 relative w-full max-w-2xl">
              {/* Floating UI Elements */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="relative z-10"
              >
                <div className="tonal-surface p-1 rounded-lg rotate-3 shadow-2xl overflow-hidden aspect-[4/3] flex items-center justify-center">
                  <div className="w-full h-full bg-forest-dark rounded-lg flex items-center justify-center relative">
                    <Zap className="w-16 h-16 text-emerald opacity-20 absolute" />
                    <div className="flex flex-col items-center gap-4 text-white">
                       <Zap className="w-12 h-12 text-emerald-light" />
                       <div className="h-2 w-32 bg-white/5 rounded-full overflow-hidden border border-white/5">
                         <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: "98%" }}
                            transition={{ duration: 1.5, delay: 1 }}
                            className="h-full bg-emerald-light" 
                          />
                       </div>
                    </div>
                  </div>
                </div>

                {/* Match Card */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-10 -left-10 tonal-surface p-5 flex items-center gap-4 shadow-xl rounded-lg"
                >
                  <div className="w-12 h-12 rounded-lg bg-emerald/10 flex items-center justify-center">
                    <BarChart3 className="text-emerald-light w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Semantic Match</p>
                    <p className="text-2xl font-bold text-on-surface">98%</p>
                  </div>
                </motion.div>

                {/* Status Card */}
                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -bottom-10 -right-6 tonal-surface p-5 flex items-center gap-4 shadow-xl rounded-lg"
                >
                  <div className="w-12 h-12 rounded-lg bg-copper/10 flex items-center justify-center">
                    <FileText className="text-copper w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Proposal Status</p>
                    <p className="text-lg font-bold text-on-surface">Generated</p>
                  </div>
                </motion.div>
              </motion.div>

              {/* Decorative backgrounds */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-emerald/10 rounded-full blur-[100px] -z-10" />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-32 bg-surface">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-on-surface">{t("workflowTitle")}</h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto leading-relaxed text-lg opacity-80">
                {t("workflowSubtext")}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: t("feature1Title"), desc: t("feature1Desc"), icon: Upload, color: "text-emerald-light bg-emerald/10" },
                { title: t("feature2Title"), desc: t("feature2Desc"), icon: Zap, color: "text-gold bg-gold/10" },
                { title: t("feature3Title"), desc: t("feature3Desc"), icon: FileText, color: "text-copper bg-copper/10" }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="premium-card p-6 md:p-10 flex flex-col gap-8 hover:bg-forest-dark/30"
                >
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${feature.color} border border-white/5`}>
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-4 text-on-surface">{feature.title}</h3>
                    <p className="text-on-surface-variant leading-relaxed opacity-70">
                      {feature.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-variant pt-32 pb-16 text-on-surface overflow-hidden relative border-t border-outline">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between gap-16 mb-24 relative z-10">
          <div className="max-w-sm flex flex-col gap-8">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-emerald-light" />
              <span className="font-bold text-2xl tracking-tight">EuroGrant <span className="text-emerald-light">AI</span></span>
            </div>
            <p className="text-lg text-on-surface-variant leading-relaxed opacity-70">
              {t("footerTagline")}
            </p>
            <p className="text-sm text-on-surface-variant opacity-40">© 2026 EuroGrant AI. All rights reserved.</p>
          </div>

          <div className="grid grid-cols-2 gap-16 md:gap-32">
            <div className="flex flex-col gap-8">
              <h4 className="text-xs font-black tracking-[0.3em] uppercase text-on-surface-variant opacity-30">{t("footerLegal")}</h4>
              <nav className="flex flex-col gap-5">
                <Link href="#" className="text-base font-medium text-on-surface-variant hover:text-on-surface transition-colors">Privacy Policy</Link>
                <Link href="#" className="text-base font-medium text-on-surface-variant hover:text-on-surface transition-colors">Terms of Service</Link>
                <Link href="#" className="text-base font-medium text-on-surface-variant hover:text-on-surface transition-colors">Cookie Policy</Link>
              </nav>
            </div>
            <div className="flex flex-col gap-8">
              <h4 className="text-xs font-black tracking-[0.3em] uppercase text-on-surface-variant opacity-30">{t("footerTrust")}</h4>
              <nav className="flex flex-col gap-5">
                <Link href="#" className="text-base font-medium text-on-surface-variant hover:text-on-surface transition-colors">Security</Link>
                <div className="flex items-center gap-3 text-sm font-bold text-gold bg-gold/10 px-4 py-2 rounded-full w-fit">
                  <Shield className="w-4 h-4" />
                  Compliance Ready
                </div>
              </nav>
            </div>
          </div>
        </div>

        {/* Decorative footer glow */}
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald/5 rounded-full blur-[120px] -z-0" />
      </footer>
    </div>
  );
}
