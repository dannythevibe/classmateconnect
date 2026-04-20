import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Role = "student" | "lecturer" | "admin";

interface UserRow {
  user_id: string;
  name: string;
  email: string;
  department: string | null;
  matric_no: string | null;
  role: Role;
}

async function fetchUsers(): Promise<UserRow[]> {
  const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
    supabase.from("profiles").select("user_id, name, email, department, matric_no"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (pErr) throw pErr;
  if (rErr) throw rErr;
  const roleMap = new Map<string, Role>();
  (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));
  return (profiles ?? []).map((p: any) => ({
    user_id: p.user_id,
    name: p.name || "—",
    email: p.email || "",
    department: p.department,
    matric_no: p.matric_no,
    role: roleMap.get(p.user_id) ?? "student",
  }));
}

export default function AdminUsers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: fetchUsers });
  const [busyId, setBusyId] = useState<string | null>(null);

  const changeRole = async (userId: string, newRole: Role) => {
    setBusyId(userId);
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) { toast.error(delErr.message); setBusyId(null); return; }
    const { error: insErr } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    setBusyId(null);
    if (insErr) { toast.error(insErr.message); return; }
    toast.success("Role updated");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const deleteUser = async (userId: string) => {
    setBusyId(userId);
    const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { user_id: userId } });
    setBusyId(null);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed");
      return;
    }
    toast.success("User deleted");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-primary shadow-glow">
          <ShieldCheck className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">User management</h1>
          <p className="text-sm text-muted-foreground">Promote, demote, or remove accounts.</p>
        </div>
      </header>

      <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-elevated overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {(users ?? []).map((u) => {
                  const isSelf = u.user_id === user?.id;
                  return (
                    <tr key={u.user_id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        {u.name} {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.department || "—"}</td>
                      <td className="px-4 py-3">
                        <Select value={u.role} disabled={busyId === u.user_id || isSelf}
                          onValueChange={(v) => changeRole(u.user_id, v as Role)}>
                          <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="lecturer">Lecturer</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isSelf || busyId === u.user_id}
                              className="text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {u.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes the account and all associated data. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteUser(u.user_id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  );
                })}
                {(users ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No users yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
