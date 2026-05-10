import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Role, User } from "@/lib/mock-data";

interface SignUpParams {
  email: string;
  password: string;
  name: string;
  role: "student" | "lecturer";
  department: string;
  level: string;
  matric_no?: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (params: SignUpParams) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchUser(supaUser: SupabaseUser): Promise<User> {
  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", supaUser.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", supaUser.id),
  ]);

  // Determine highest-priority role from DB
  const roles: string[] = (roleRows ?? []).map((r: any) => r.role);
  let role: Role = "student";
  if (roles.includes("admin")) role = "admin";
  else if (roles.includes("lecturer")) role = "lecturer";
  else if (roles.includes("student")) role = "student";
  else {
    // No DB role yet — seed from signup metadata, never allow admin via metadata
    const metaRole = supaUser.user_metadata?.role as string;
    role = metaRole === "lecturer" ? "lecturer" : "student";
    supabase.from("user_roles").insert({ user_id: supaUser.id, role }).then();
  }

  // Create profile if missing
  if (!profile) {
    const meta = supaUser.user_metadata || {};
    supabase.from("profiles").insert({
      user_id: supaUser.id,
      name: meta.name || supaUser.email?.split("@")[0] || "User",
      email: supaUser.email,
      department: meta.department || "General",
      level: meta.level || "100",
      matric_no: meta.matric_no || null,
    }).then();
  }

  return {
    id: supaUser.id,
    name: profile?.name || supaUser.user_metadata?.name || "User",
    email: supaUser.email || "",
    role,
    department: profile?.department || supaUser.user_metadata?.department || "",
    level: profile?.level || supaUser.user_metadata?.level || "100",
    matric_no: profile?.matric_no || undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s?.user) {
        setSession(s);
        fetchUser(s.user).then(u => {
          setUser(u);
          setLoading(false);
        }).catch(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s?.user) {
        setSession(s);
        fetchUser(s.user).then(u => {
          setUser(u);
          setLoading(false);
        }).catch(() => setLoading(false));
      } else {
        setUser(null);
        setSession(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });
    if (error) {
      setLoading(false);
      return { error: error.message };
    }
    if (data.session?.user) {
      try {
        const u = await fetchUser(data.session.user);
        setSession(data.session);
        setUser(u);
      } catch {
        // non-fatal
      }
    }
    setLoading(false);
    return { error: null };
  };

  const signUp = async (params: SignUpParams): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({
      email: params.email.trim(),
      password: params.password.trim(),
      options: { data: params },
    });
    return { error: error?.message ?? null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setLoading(false);
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    const patch: Record<string, any> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.email !== undefined) patch.email = data.email;
    if (data.department !== undefined) patch.department = data.department;
    if (data.level !== undefined) patch.level = data.level;
    if (data.matric_no !== undefined) patch.matric_no = data.matric_no ?? null;
    await supabase.from("profiles").update(patch).eq("user_id", user.id);
    setUser({ ...user, ...data });
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
