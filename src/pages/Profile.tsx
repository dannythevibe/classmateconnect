import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, KeyRound, Save, Smartphone, WifiOff, Bell } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [department, setDepartment] = useState(user?.department ?? "");

  if (!user) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({ name, email, department });
    toast.success("Profile updated");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Profile & Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account preferences</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl gradient-primary text-2xl font-bold text-primary-foreground shadow-glow">
            {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </div>
          <h3 className="mt-4 font-display text-lg font-bold">{user.name}</h3>
          <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
          {user.matricNo && <p className="mt-2 inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold">{user.matricNo}</p>}
        </div>

        <form onSubmit={save} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <h3 className="font-display text-lg font-bold">Personal information</h3>
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="dept">Department</Label>
              <Input id="dept" value={department} onChange={(e) => setDepartment(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" className="gradient-primary"><Save className="mr-2 h-4 w-4" /> Save changes</Button>
            <Button type="button" variant="outline" onClick={() => toast.success("Password reset link sent")}><KeyRound className="mr-2 h-4 w-4" /> Reset password</Button>
            <Button type="button" variant="outline" onClick={() => toast.success("Verification email sent")}><Mail className="mr-2 h-4 w-4" /> Verify email</Button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h3 className="font-display text-lg font-bold">Preferences</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Bell, title: "Push notifications", desc: "Get alerts when sessions open" },
            { icon: WifiOff, title: "Offline mode", desc: "Cache attendance & sync later" },
            { icon: Sparkles, title: "Guided tour", desc: "Re-watch the platform onboarding" },
            { icon: Smartphone, title: "One-tap attendance", desc: "Simplified mobile flow" },
          ].map((p) => (
            <div key={p.title} className="rounded-xl border border-border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <p.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-semibold">{p.title}</p>
              <p className="text-xs text-muted-foreground">{p.desc}</p>
              <Button size="sm" variant="ghost" className="mt-2 px-0 text-primary hover:bg-transparent" onClick={() => {
                if (p.title === "Guided tour") {
                  (window as any).restartOnboarding?.();
                  toast.success("Tutorial restarted");
                } else {
                  toast.success(`${p.title} toggled`);
                }
              }}>
                {p.title === "Guided tour" ? "Restart" : "Toggle"}
              </Button>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
