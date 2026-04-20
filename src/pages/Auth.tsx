import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
  role: z.literal("student"),
  department: z.string().trim().min(1, "Department required").max(100),
  matricNo: z.string().trim().max(50).optional(),
});

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Password required").max(72),
});

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [signUpData, setSignUpData] = useState({
    name: "",
    email: "",
    password: "",
    role: "student" as Role,
    department: "",
    matricNo: "",
  });
  const [lecturerData, setLecturerData] = useState({
    name: "", email: "", password: "", department: "", inviteCode: "",
  });

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse(signInData);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setSubmitting(false);
    if (error) toast.error(error);
    else toast.success("Welcome back");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(signUpData);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.name,
      role: parsed.data.role,
      department: parsed.data.department,
      matricNo: parsed.data.matricNo,
    });
    setSubmitting(false);
    if (error) toast.error(error);
    else toast.success("Account created — check your email if confirmation is required.");
  };

  const handleLecturerSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const schema = z.object({
      name: z.string().trim().min(1, "Name required").max(100),
      email: z.string().trim().email("Invalid email").max(255),
      password: z.string().min(6, "Min 6 characters").max(72),
      department: z.string().trim().min(1, "Department required").max(100),
      inviteCode: z.string().trim().min(1, "Invite code required").max(200),
    });
    const parsed = schema.safeParse(lecturerData);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSubmitting(true);
    const { error } = await signUp({
      email: parsed.data.email, password: parsed.data.password,
      name: parsed.data.name, role: "student", department: parsed.data.department,
    });
    if (error) { setSubmitting(false); toast.error(error); return; }
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: parsed.data.email, password: parsed.data.password,
    });
    if (signInErr) {
      setSubmitting(false);
      toast.success("Account created. Confirm your email, then sign in to redeem the invite.");
      return;
    }
    const { data, error: fnErr } = await supabase.functions.invoke("redeem-lecturer-invite", {
      body: { code: parsed.data.inviteCode },
    });
    setSubmitting(false);
    if (fnErr || (data as any)?.error) {
      toast.error((data as any)?.error || fnErr?.message || "Invite redemption failed");
      return;
    }
    toast.success("Lecturer account ready");
  };

  return (
    <div className="relative min-h-screen overflow-hidden gradient-mesh flex items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-primary/30 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -right-24 bottom-20 h-72 w-72 rounded-full bg-accent/30 blur-3xl animate-float" style={{ animationDelay: "1s" }} />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">Attendly</span>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-elevated backdrop-blur-xl sm:p-8">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Student</TabsTrigger>
              <TabsTrigger value="lecturer">Lecturer</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" autoComplete="email" value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="si-password">Password</Label>
                  <Input id="si-password" type="password" autoComplete="current-password" value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })} className="mt-1.5" />
                </div>
                <Button type="submit" disabled={submitting} className="w-full h-11 gradient-primary font-semibold shadow-glow">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3 pt-4">
                <div>
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" value={signUpData.name}
                    onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" autoComplete="email" value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="su-password">Password</Label>
                  <Input id="su-password" type="password" autoComplete="new-password" value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="su-dept">Department</Label>
                  <Input id="su-dept" value={signUpData.department}
                    onChange={(e) => setSignUpData({ ...signUpData, department: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="su-matric">Matric number</Label>
                  <Input id="su-matric" value={signUpData.matricNo}
                    onChange={(e) => setSignUpData({ ...signUpData, matricNo: e.target.value })} className="mt-1.5" />
                </div>
                <Button type="submit" disabled={submitting} className="w-full h-11 gradient-primary font-semibold shadow-glow">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Lecturer and admin accounts must be assigned by an administrator for security.
                </p>
              </form>
            </TabsContent>

            <TabsContent value="lecturer">
              <form onSubmit={handleLecturerSignUp} className="space-y-3 pt-4">
                <div>
                  <Label htmlFor="lec-name">Full name</Label>
                  <Input id="lec-name" value={lecturerData.name}
                    onChange={(e) => setLecturerData({ ...lecturerData, name: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="lec-email">Email</Label>
                  <Input id="lec-email" type="email" autoComplete="email" value={lecturerData.email}
                    onChange={(e) => setLecturerData({ ...lecturerData, email: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="lec-password">Password</Label>
                  <Input id="lec-password" type="password" autoComplete="new-password" value={lecturerData.password}
                    onChange={(e) => setLecturerData({ ...lecturerData, password: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="lec-dept">Department</Label>
                  <Input id="lec-dept" value={lecturerData.department}
                    onChange={(e) => setLecturerData({ ...lecturerData, department: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="lec-invite">Invite code</Label>
                  <Input id="lec-invite" type="password" value={lecturerData.inviteCode}
                    onChange={(e) => setLecturerData({ ...lecturerData, inviteCode: e.target.value })} className="mt-1.5"
                    placeholder="Provided by your administrator" />
                </div>
                <Button type="submit" disabled={submitting} className="w-full h-11 gradient-primary font-semibold shadow-glow">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create lecturer account"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Admin accounts can only be assigned from the admin panel.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
