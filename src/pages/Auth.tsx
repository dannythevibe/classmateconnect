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
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
  role: z.enum(["student", "lecturer"]),
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
    const { error } = await signUp(parsed.data);
    setSubmitting(false);
    if (error) toast.error(error);
    else toast.success("Account created — check your email if confirmation is required.");
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Role</Label>
                    <Select value={signUpData.role} onValueChange={(v) => setSignUpData({ ...signUpData, role: v as Role })}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="lecturer">Lecturer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="su-dept">Department</Label>
                    <Input id="su-dept" value={signUpData.department}
                      onChange={(e) => setSignUpData({ ...signUpData, department: e.target.value })} className="mt-1.5" />
                  </div>
                </div>
                {signUpData.role === "student" && (
                  <div>
                    <Label htmlFor="su-matric">Matric number</Label>
                    <Input id="su-matric" value={signUpData.matricNo}
                      onChange={(e) => setSignUpData({ ...signUpData, matricNo: e.target.value })} className="mt-1.5" />
                  </div>
                )}
                <Button type="submit" disabled={submitting} className="w-full h-11 gradient-primary font-semibold shadow-glow">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Admin accounts must be assigned manually for security.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
