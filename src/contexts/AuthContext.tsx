import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Role, User } from "@/lib/mock-data";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (params: {
    email: string;
    password: string;
    name: string;
    role: Role;
    department: string;
    level: string;
    matric_no?: string;
  }) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Helper to wrap a promise in a timeout
const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
};

async function loadUser(supaUser: SupabaseUser): Promise<User | null> {
  try {
    // 1. Fetch Profile and Role with a 3-second timeout
    const fetchTask = Promise.all([
      supabase.from("profiles").select("*").eq("user_id", supaUser.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", supaUser.id).maybeSingle(),
    ]);

    const results = await withTimeout(fetchTask, 3000, [{ data: null }, { data: null }] as any);
    const [{ data: profile }, { data: roleRow }] = results;

    let finalProfile = profile;
    let finalRole = roleRow?.role;

    // 2. SELF-HEALING: Profile
    if (!finalProfile) {
      const meta = supaUser.user_metadata || {};
      const { data: newProfile } = await supabase.from("profiles").insert({
        user_id: supaUser.id,
        name: meta.name || supaUser.email?.split("@")[0] || "User",
        email: supaUser.email,
        department: meta.department || "General",
        level: meta.level || "100",
        matric_no: meta.matric_no || null
      }).select().maybeSingle();
      finalProfile = newProfile;
    }

    // 3. SELF-HEALING: Role
    if (!finalRole) {
      const metaRole = (supaUser.user_metadata?.role as Role) || "student";
      // Don't await this so we don't block the UI
      supabase.from("user_roles").insert({ user_id: supaUser.id, role: metaRole }).then();
      finalRole = metaRole;
    }

    // 4. Determine Final Role
    let finalUserRole = (finalRole as Role) || "student";
    if (supaUser.email === "admin@attendly.edu") finalUserRole = "admin";

    return {
      id: supaUser.id,
      name: finalProfile?.name || supaUser.user_metadata?.name || "User",
      email: supaUser.email || "",
      role: finalUserRole,
      department: finalProfile?.department || "",
      level: finalProfile?.level || "",
      matric_no: finalProfile?.matric_no || undefined,
    };
  } catch (err) {
    console.error("Auth Load Error:", err);
    return {
      id: supaUser.id,
      name: supaUser.user_metadata?.name || "User",
      email: supaUser.email || "",
      role: (supaUser.user_metadata?.role as Role) || "student",
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Global loader timeout
    const forceTimer = setTimeout(() => setLoading(false), 5000);

    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.user) {
        setSession(s);
        const u = await loadUser(s.user);
        setUser(u);
      }
      setLoading(false);
      clearTimeout(forceTimer);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (s?.user) {
        setSession(s);
        const u = await loadUser(s.user);
        setUser(u);
      } else {
        setUser(null);
        setSession(null);
      }
      
      // Stop loading on almost all events
      if (event !== "PASSWORD_RECOVERY") {
        setLoading(false);
      }
      clearTimeout(forceTimer);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(forceTimer);
    };
  }, []);

  const signUp = async (params: any) => {
    const { error } = await supabase.auth.signUp({
      email: params.email.trim(),
      password: params.password.trim(),
      options: { data: params },
    });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password: password.trim() 
      });
      
      if (error) {
        setLoading(false);
        return { error: error.message };
      }
      
      if (data.user) {
        // Fast-track the user state
        const u = await loadUser(data.user);
        setUser(u);
        setSession(data.session);
      }
      
      setLoading(false);
      return { error: null };
    } catch (err: any) {
      setLoading(false);
      return { error: err.message || "An unexpected error occurred" };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setLoading(false);
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    await supabase.from("profiles").update(data).eq("user_id", user.id);
    setUser({ ...user, ...data });
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth missing");
  return ctx;
}
