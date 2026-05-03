import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
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

const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
};

async function loadUser(supaUser: SupabaseUser): Promise<User | null> {
  try {
    const fetchTask = Promise.all([
      supabase.from("profiles").select("*").eq("user_id", supaUser.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", supaUser.id),
    ]);

    const results = await withTimeout(fetchTask, 3000, [{ data: null }, { data: null }] as any);
    const [{ data: profile }, { data: roleRow }] = results;
    const roleRows = roleRow; // Aliasing for compatibility with rest of function

    // Pick highest-priority role if user has multiple rows (admin > lecturer > student)
    const rolesList = (roleRows ?? []).map((r: any) => r.role);
    const pickRole = (list: string[]) =>
      list.includes("admin") ? "admin" : list.includes("lecturer") ? "lecturer" : list.includes("student") ? "student" : undefined;

    let finalProfile = profile;
    let finalRole: any = pickRole(rolesList);

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

    if (!finalRole) {
      const metaRole = (supaUser.user_metadata?.role as Role) || "student";
      supabase.from("user_roles").insert({ user_id: supaUser.id, role: metaRole }).then();
      finalRole = metaRole;
    }

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
  const loadingUserRef = useRef<string | null>(null);

  const syncUser = async (s: Session | null) => {
    if (!s?.user) {
      setUser(null);
      setSession(null);
      setLoading(false);
      return;
    }

    // Prevent duplicate loading tasks for the same user
    if (loadingUserRef.current === s.user.id) return;
    loadingUserRef.current = s.user.id;
    
    setSession(s);
    const u = await loadUser(s.user);
    setUser(u);
    setLoading(false);
    loadingUserRef.current = null;
  };

  useEffect(() => {
    const forceTimer = setTimeout(() => setLoading(false), 5000);

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      syncUser(s);
      clearTimeout(forceTimer);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      syncUser(s);
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
      
      if (data.session) {
        await syncUser(data.session);
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
    loadingUserRef.current = null;
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
