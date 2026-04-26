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
    matricNo?: string;
  }) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadUser(supaUser: SupabaseUser): Promise<User | null> {
  try {
    const [{ data: profile, error: pErr }, { data: roleRow }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", supaUser.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", supaUser.id).maybeSingle(),
    ]);

    if (pErr) console.error("Profile fetch error:", pErr);

    let finalProfile = profile;
    let finalRole = roleRow?.role;

    // Self-healing: if profile is missing, create it from metadata
    if (!profile) {
      console.warn("Profile missing for user, attempting self-healing...");
      const meta = supaUser.user_metadata || {};
      
      // Create profile
      const { data: newProfile, error: insErr } = await supabase.from("profiles").insert({
        user_id: supaUser.id,
        name: meta.name || supaUser.email?.split("@")[0] || "User",
        email: supaUser.email,
        department: meta.department || "",
        level: meta.level || "",
        matric_no: meta.matric_no || "",
      }).select().single();

      if (insErr) {
        console.error("Self-healing profile creation failed:", insErr);
        return null;
      }

      // Create role
      const { error: rErr } = await supabase.from("user_roles").insert({
        user_id: supaUser.id,
        role: meta.role || "student"
      });
      
      if (rErr) console.error("Self-healing role creation failed:", rErr);

      finalProfile = newProfile;
      finalRole = meta.role || "student";
    }

    if (!finalProfile) return null;

    // Auto-create matching students row for student accounts (so attendance works).
    if (finalRole === "student" && finalProfile?.matric_no) {
      try {
        const { data: existing } = await supabase
          .from("students")
          .select("id")
          .eq("matric_no", finalProfile.matric_no)
          .maybeSingle();
        if (!existing) {
          await supabase.from("students").insert({
            name: finalProfile.name || "",
            matric_no: finalProfile.matric_no,
            department: finalProfile.department || "",
            level: finalProfile.level || "",
            created_by: supaUser.id,
          });
        }
      } catch (e) {
        console.error("Non-critical error auto-creating student record:", e);
      }
    }

    return {
      id: supaUser.id,
      name: finalProfile?.name || supaUser.user_metadata?.name || supaUser.email?.split("@")[0] || "User",
      email: finalProfile?.email || supaUser.email || "",
      role: (finalRole as Role) ?? (supaUser.user_metadata?.role as Role) ?? "student",
      department: finalProfile?.department ?? supaUser.user_metadata?.department ?? "",
      level: finalProfile?.level ?? supaUser.user_metadata?.level ?? "",
      matricNo: finalProfile?.matric_no || supaUser.user_metadata?.matric_no || undefined,
    };
  } catch (err) {
    console.error("Critical error in loadUser, falling back to metadata:", err);
    return {
      id: supaUser.id,
      name: supaUser.user_metadata?.name || supaUser.email?.split("@")[0] || "User",
      email: supaUser.email || "",
      role: (supaUser.user_metadata?.role as Role) ?? "student",
      department: supaUser.user_metadata?.department ?? "",
      level: supaUser.user_metadata?.level ?? "",
      matricNo: supaUser.user_metadata?.matric_no || undefined,
    };
  }
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef<string | null>(null);

  useEffect(() => {
    const checkUser = async (supaUser: SupabaseUser) => {
      if (loadingRef.current === supaUser.id) return;
      loadingRef.current = supaUser.id;
      setLoading(true);
      try {
        const u = await loadUser(supaUser);
        if (!u) console.warn("checkUser: loadUser returned null for", supaUser.id);
        setUser(u);
      } catch (err) {
        console.error("checkUser error:", err);
        setUser(null);
      } finally {
        setLoading(false);
        loadingRef.current = null;
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("Auth Event:", event);
      setSession(newSession);
      if (newSession?.user) {
        await checkUser(newSession.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      if (existing?.user) {
        checkUser(existing.user);
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp: AuthContextValue["signUp"] = async ({
    email,
    password,
    name,
    role,
    department,
    level,
    matricNo,
  }) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name, role, department, level, matric_no: matricNo ?? "" },
      },
    });
    if (error) console.error("SignUp Debug Error:", error);
    return { error: error?.message ?? null };

  };

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        name: data.name ?? user.name,
        email: data.email ?? user.email,
        department: data.department ?? user.department,
        level: data.level ?? user.level,
        matric_no: data.matricNo ?? user.matricNo ?? "",
      })
      .eq("user_id", user.id);
    if (!error) setUser({ ...user, ...data });
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
