import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
  role: z.enum(["student", "lecturer", "admin"]),
  department: z.string().trim().min(1, "Department required").max(100),
  level: z.string().min(1, "Level required"),
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
    level: "100",
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
      level: parsed.data.level,
    });
    if (error) {
      setSubmitting(false);
      toast.error(error);
      return;
    }
    // If email confirmation is on, no session is returned. Sign the user in immediately.
    const { error: siErr } = await signIn(parsed.data.email, parsed.data.password);
    setSubmitting(false);
    if (siErr) {
      toast.success("Account created! Please sign in.");
    } else {
      toast.success("Welcome to Attendly!");
    }
  };


  return (
    <div className="relative min-h-screen overflow-hidden gradient-mesh flex items-center justify-center px-4 py-10">
      {/* Decorative Elements */}
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -right-24 bottom-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "1s" }} />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-glow animate-float">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-4xl font-black tracking-tighter text-foreground">Attendly</h1>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70">Electronic Attendance</p>
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-border/40 bg-card/60 p-1 shadow-elevated backdrop-blur-3xl lg:p-2">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-transparent p-1">
              <TabsTrigger value="signin" className="rounded-2xl py-3 text-sm font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-2xl py-3 text-sm font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Create Account
              </TabsTrigger>
            </TabsList>

            <div className="px-6 pb-8 pt-4 sm:px-8">
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="si-email">Email Address</Label>
                    <Input id="si-email" type="email" placeholder="john@example.com" value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })} className="h-14 rounded-2xl bg-background/50 pl-6 font-bold" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="si-password">Secret Password</Label>
                    <Input id="si-password" type="password" placeholder="••••••••" value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })} className="h-14 rounded-2xl bg-background/50 pl-6" />
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl gradient-primary text-base font-bold shadow-glow transition-all active:scale-95 mt-2">
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Welcome Back"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="su-name">Full Name</Label>
                      <Input id="su-name" placeholder="John Doe" value={signUpData.name}
                        onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })} className="rounded-xl bg-background/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-role">I am a...</Label>
                      <Select value={signUpData.role} onValueChange={(v) => setSignUpData({ ...signUpData, role: v as Role })}>
                        <SelectTrigger id="su-role" className="rounded-xl bg-background/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="lecturer">Lecturer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-password">Create Password</Label>
                    <Input id="su-password" type="password" placeholder="Min 6 characters" value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })} className="rounded-xl bg-background/50" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="su-dept">Department</Label>
                      <Input id="su-dept" placeholder="Computer Science" value={signUpData.department}
                        onChange={(e) => setSignUpData({ ...signUpData, department: e.target.value })} className="rounded-xl bg-background/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-email">Work Email</Label>
                      <Input id="su-email" type="email" placeholder="john@example.com" value={signUpData.email}
                        onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })} className="rounded-xl bg-background/50" />
                    </div>
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl gradient-primary text-base font-bold shadow-glow transition-all active:scale-95 mt-4">
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Get Started"}
                  </Button>
                  <div className="flex items-center justify-center gap-1.5 pt-4 opacity-60">
                    <ShieldCheck className="h-3 w-3" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">
                      Developer Testing Mode
                    </p>
                  </div>
                </form>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
