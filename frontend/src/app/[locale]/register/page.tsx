"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link, useRouter } from "@/i18n/routing";
import { motion } from "framer-motion";
import { Mail, Lock, User, Building, KeyRound, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await register(email, password, fullName, organizationName, inviteCode);
    if (res.success) {
      router.push("/login");
    } else {
      setError(res.error || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative bg-background overflow-hidden font-inter">
      {/* Premium Ambient Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-copper/5 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-md w-full z-10 py-12"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-on-surface tracking-tight mb-3">
            EuroGrant <span className="text-emerald-light">AI</span>
          </h1>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest opacity-60">
            Elite Intelligence Enrollment
          </p>
        </div>

        <div className="tonal-surface rounded-lg p-10 relative overflow-hidden backdrop-blur-xl border border-outline shadow-2xl">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-2xl font-bold text-on-surface">Create Account</h2>
            <div className="h-[1px] flex-1 bg-outline opacity-40" />
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-error-container/20 border border-error/20 text-error text-[10px] font-black uppercase tracking-widest p-4 rounded-lg text-center"
              >
                {error}
              </motion.div>
            )}
            
            <div className="space-y-4">
              <div className="group relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40 group-focus-within:text-emerald-light group-focus-within:opacity-100 transition-all">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  className="w-full bg-background border border-outline rounded-lg py-3.5 pl-12 pr-4 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-4 focus:ring-emerald/5 focus:border-emerald-light/50 transition-all text-sm font-medium"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="group relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40 group-focus-within:text-emerald-light group-focus-within:opacity-100 transition-all">
                  <Building size={18} />
                </div>
                <input
                  type="text"
                  required
                  className="w-full bg-background border border-outline rounded-lg py-3.5 pl-12 pr-4 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-4 focus:ring-emerald/5 focus:border-emerald-light/50 transition-all text-sm font-medium"
                  placeholder="Organization Name"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                />
              </div>

              <div className="group relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40 group-focus-within:text-emerald-light group-focus-within:opacity-100 transition-all">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  className="w-full bg-background border border-outline rounded-lg py-3.5 pl-12 pr-4 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-4 focus:ring-emerald/5 focus:border-emerald-light/50 transition-all text-sm font-medium"
                  placeholder="Intelligence ID (Email)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="group relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40 group-focus-within:text-emerald-light group-focus-within:opacity-100 transition-all">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  className="w-full bg-background border border-outline rounded-lg py-3.5 pl-12 pr-4 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-4 focus:ring-emerald/5 focus:border-emerald-light/50 transition-all text-sm font-medium"
                  placeholder="Security Key (Password)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="group relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40 group-focus-within:text-emerald-light group-focus-within:opacity-100 transition-all">
                  <KeyRound size={18} />
                </div>
                <input
                  type="text"
                  required
                  className="w-full bg-background border border-outline rounded-lg py-3.5 pl-12 pr-4 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-4 focus:ring-emerald/5 focus:border-emerald-light/50 transition-all text-sm font-medium"
                  placeholder="Master Invite Code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="group relative w-full py-4 bg-copper text-white font-bold uppercase tracking-widest text-xs rounded-lg overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 hover:brightness-110 shadow-lg shadow-copper/10 mt-4"
            >
              <span>Enroll Agent</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-10 text-center border-t border-outline pt-8">
            <Link href="/login" className="group inline-flex items-center gap-2 text-[10px] font-bold text-on-surface-variant hover:text-emerald-light uppercase tracking-widest transition-all">
              <span>Secure Sign In</span>
              <div className="w-4 h-[1px] bg-outline opacity-40 group-hover:bg-emerald-light group-hover:w-8 group-hover:opacity-100 transition-all" />
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
