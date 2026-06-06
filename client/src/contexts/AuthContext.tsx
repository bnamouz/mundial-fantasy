import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  isPaid: boolean;
  budget: number;
  totalPoints: number;
  rank: number;
  isAdmin: boolean;
  invoiceNumber?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; phone: string; password: string }) => Promise<{ paymentUrl: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      (window as any).__authToken__ = token;
    } else {
      delete (window as any).__authToken__;
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    setToken(res.token);
    setUser(res.user);
    (window as any).__authToken__ = res.token;
  };

  const register = async (data: { name: string; email: string; phone: string; password: string }) => {
    // 1. Create user account
    const res = await apiRequest("POST", "/api/auth/register", {
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash: data.password,
    });
    setToken(res.token);
    setUser(res.user);
    (window as any).__authToken__ = res.token;

    // 2. Get PayPlus payment link
    const payRes = await apiRequest("POST", "/api/payment/checkout", {});
    return { paymentUrl: payRes.paymentUrl };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    delete (window as any).__authToken__;
  };

  const refreshUser = async () => {
    try {
      const me = await apiRequest("GET", "/api/auth/me");
      setUser(me);
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
