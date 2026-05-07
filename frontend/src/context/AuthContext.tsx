"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  organization_id: number;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName: string, organizationName: string, inviteCode: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  bypassLogin: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem("token");
      if (token === "dev-bypass-token") {
        setUser({
          id: 1,
          email: "admin@eurogrant.ai",
          full_name: "Elite Administrator",
          role: "ADMIN",
          organization_id: 1,
          created_at: new Date().toISOString(),
        });
        setLoading(false);
        return;
      }

      if (token) {
        try {
          const res = await apiFetch("/users/me");
          if (res && res.ok) {
            const userData = await res.json();
            setUser(userData);
          } else {
            localStorage.removeItem("token");
          }
        } catch (error) {
          console.error("Auth check failed", error);
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const login = async (email: string, password: string) => {
    // Local Bypass check for rapid UI work
    if (email === "admin@test.com" && password === "password123") {
      bypassLogin();
      return { success: true };
    }

    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.access_token);
        const userRes = await apiFetch("/users/me");
        if (userRes && userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
        }
        router.push("/dashboard");
        return { success: true };
      } else {
        const error = await res.json();
        return { success: false, error: error.detail };
      }
    } catch {
      return { success: false, error: "Network error" };
    }
  };

  const register = async (email: string, password: string, fullName: string, organizationName: string, inviteCode: string) => {
    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ 
          email, 
          password, 
          full_name: fullName, 
          organization_name: organizationName,
          invite_code: inviteCode
        }),
      });

      if (res && res.ok) {
        return { success: true };
      } else if (res) {
        const error = await res.json();
        return { success: false, error: error.detail };
      }
      return { success: false, error: "Unknown error" };
    } catch {
      return { success: false, error: "Network error" };
    }
  };

  const bypassLogin = () => {
    const dummyUser = {
      id: 1,
      email: "admin@eurogrant.ai",
      full_name: "Elite Administrator",
      role: "ADMIN",
      organization_id: 1,
      created_at: new Date().toISOString(),
    };
    localStorage.setItem("token", "dev-bypass-token");
    setUser(dummyUser);
    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, bypassLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
