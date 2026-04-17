import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { mockUsers, Role, User } from "@/lib/mock-data";

interface AuthContextValue {
  user: User | null;
  login: (role: Role) => void;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "attend_role";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const role = localStorage.getItem(STORAGE_KEY) as Role | null;
    if (role && mockUsers[role]) setUser(mockUsers[role]);
  }, []);

  const login = (role: Role) => {
    localStorage.setItem(STORAGE_KEY, role);
    setUser(mockUsers[role]);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const updateProfile = (data: Partial<User>) => {
    setUser((u) => (u ? { ...u, ...data } : u));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
