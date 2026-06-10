import { Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search, Plus, Filter, MoreHorizontal, Users as UsersIcon, Shield, ScrollText,
  KeyRound, Pencil, Trash2, UserCheck, UserX, Ban, History, Bell, Eye, Download,
  CheckCircle2, Circle, ShieldCheck, Sparkles, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ALL_PERMISSIONS, BRANCHES, ClinicUser, Role, RoleKey, UserStatus,
  formatRelative, fullName, initials, useUsersStore, usersStore,
} from "@/lib/users-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Users Management — Treatly" },
      { name: "description", content: "Manage clinic users, roles, permissions and audit logs." },
    ],
  }),
  component: UsersPage,
});

const STATUS_STYLES: Record<UserStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  inactive: "bg-slate-400/10 text-slate-500 border-slate-400/20",
  suspended: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

function UsersPage() {
  const { users, roles, logs } = useUsersStore();
  const [tab, setTab] = useState("users");

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-background via-background to-muted/30">
      <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
              <Sparkles className="h-3 w-3" /> Admin Panel
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight lg:text-4xl">Users Management</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Control your team, roles, granular permissions and activity across every branch.
            </p>
          </div>
          <StatsRow users={users} roles={roles} />
        </header>

        <Tabs value={tab} onValueChange={setTab} className="mt-8">
          <TabsList className="h-auto gap-1 rounded-2xl bg-muted/60 p-1.5">
            <TabsTrigger value="users" className="gap-2 rounded-xl px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <UsersIcon className="h-4 w-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2 rounded-xl px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Shield className="h-4 w-4" /> Roles
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2 rounded-xl px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <ShieldCheck className="h-4 w-4" /> Permissions
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2 rounded-xl px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <ScrollText className="h-4 w-4" /> Audit Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <UsersTab users={users} roles={roles} />
          </TabsContent>
          <TabsContent value="roles" className="mt-6">
            <RolesTab roles={roles} users={users} />
          </TabsContent>
          <TabsContent value="permissions" className="mt-6">
            <PermissionsTab roles={roles} />
          </TabsContent>
          <TabsContent value="audit" className="mt-6">
            <AuditTab logs={logs} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ---------------- STATS ---------------- */
function StatsRow({ users, roles }: { users: ClinicUser[]; roles: Role[] }) {
  const active = users.filter((u) => u.status === "active").length;
  const online = users.filter((u) => u.online).length;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[
        { label: "Total", value: users.length, color: "text-foreground" },
        { label: "Active", value: active, color: "text-emerald-600" },
        { label: "Online", value: online, color: "text-sky-600" },
        { label: "Roles", value: roles.length, color: "text-violet-600" },
      ].map((s) => (
        <div key={s.label} className="rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</div>
          <div className={cn("mt-1 text-2xl font-bold tabular-nums", s.color)}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- USERS TAB ---------------- */
function UsersTab({ users, roles }: { users: ClinicUser[]; roles: Role[] }) {
  const [q, setQ] = useState("");
  const [roleF, setRoleF] = useState<string>("all");
  const [statusF, setStatusF] = useState<string>("all");
  const [branchF, setBranchF] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "lastLogin">("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<ClinicUser | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ClinicUser | null>(null);
  const [profile, setProfile] = useState<ClinicUser | null>(null);

  const filtered = useMemo(() => {
    let list = users.filter((u) => {
      const ql = q.trim().toLowerCase();
      if (ql && !`${fullName(u)} ${u.email} ${u.phone}`.toLowerCase().includes(ql)) return false;
      if (roleF !== "all" && u.role !== roleF) return false;
      if (statusF !== "all" && u.status !== statusF) return false;
      if (branchF !== "all" && u.branch !== branchF) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "newest") return +new Date(b.createdAt) - +new Date(a.createdAt);
      if (sort === "oldest") return +new Date(a.createdAt) - +new Date(b.createdAt);
      return +new Date(b.lastLogin || 0) - +new Date(a.lastLogin || 0);
    });
    return list;
  }, [users, q, roleF, statusF, branchF, sort]);

  const allChecked = filtered.length > 0 && filtered.every((u) => selected.has(u.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allChecked) filtered.forEach((u) => next.delete(u.id));
    else filtered.forEach((u) => next.add(u.id));
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const roleByKey = (k: string) => roles.find((r) => r.key === k);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone…" className="pl-9" />
          </div>
          <Select value={roleF} onValueChange={setRoleF}>
            <SelectTrigger className="w-[150px]"><Filter className="mr-1.5 h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roles.map((r) => <SelectItem key={r.key} value={r.key}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={branchF} onValueChange={setBranchF}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="lastLogin">Last login</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)}>
              <Download className="mr-1.5 h-4 w-4" /> Export
            </Button>
            <Button size="sm" onClick={() => setAdding(true)} className="shadow-sm">
              <Plus className="mr-1.5 h-4 w-4" /> New user
            </Button>
          </div>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
            <span className="text-xs font-medium text-primary">{selected.size} selected</span>
            <div className="ml-auto flex flex-wrap gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => { usersStore.setStatus([...selected], "active"); toast.success("Activated"); setSelected(new Set()); }}>
                <UserCheck className="mr-1 h-3.5 w-3.5" /> Activate
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { usersStore.setStatus([...selected], "inactive"); toast.success("Deactivated"); setSelected(new Set()); }}>
                <UserX className="mr-1 h-3.5 w-3.5" /> Deactivate
              </Button>
              <BulkRoleChange selected={[...selected]} roles={roles} onDone={() => setSelected(new Set())} />
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                onClick={() => { usersStore.deleteUsers([...selected]); toast.success("Deleted"); setSelected(new Set()); }}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10 pl-4"><Checkbox checked={allChecked} onCheckedChange={toggleAll} /></TableHead>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-muted-foreground">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                      <UsersIcon className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-medium">No users match these filters</div>
                    <div className="text-xs">Try clearing filters or add a new user.</div>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {filtered.map((u) => {
              const role = roleByKey(u.role);
              return (
                <TableRow key={u.id} className="group">
                  <TableCell className="pl-4"><Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggleOne(u.id)} /></TableCell>
                  <TableCell>
                    <button onClick={() => setProfile(u)} className="flex items-center gap-3 text-left">
                      <div className="relative">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.avatarUrl} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-semibold">{initials(u)}</AvatarFallback>
                        </Avatar>
                        <span className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
                          u.online ? "bg-emerald-500" : "bg-slate-300"
                        )} />
                      </div>
                      <div>
                        <div className="font-medium leading-tight group-hover:text-primary">{fullName(u)}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </button>
                  </TableCell>
                  <TableCell>
                    {role && (
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm", role.color)}>
                        {role.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("rounded-full border px-2.5 py-0 text-[11px] font-medium capitalize", STATUS_STYLES[u.status])}>
                      <Circle className={cn("mr-1 h-1.5 w-1.5 fill-current",
                        u.status === "active" ? "text-emerald-500" :
                        u.status === "suspended" ? "text-rose-500" : "text-slate-400")} />
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell><span className="text-sm">{u.branch}</span></TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{formatRelative(u.lastLogin)}</span></TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</span></TableCell>
                  <TableCell className="pr-4 text-right">
                    <UserActions user={u} onView={() => setProfile(u)} onEdit={() => setEditing(u)} onDelete={() => setConfirmDelete(u)} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit dialog */}
      <UserFormDialog
        open={adding || !!editing}
        user={editing}
        roles={roles}
        onClose={() => { setAdding(false); setEditing(null); }}
      />

      {/* Profile drawer-style dialog */}
      <ProfileDialog user={profile} role={profile ? roleByKey(profile.role) : undefined} onClose={() => setProfile(null)} />

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete && fullName(confirmDelete)}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The user will lose all access immediately.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!confirmDelete) return;
                if (confirmDelete.role === "super_admin") {
                  toast.error("Super Admin cannot be deleted");
                } else {
                  usersStore.deleteUsers([confirmDelete.id]);
                  toast.success("User deleted");
                }
                setConfirmDelete(null);
              }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BulkRoleChange({ selected, roles, onDone }: { selected: string[]; roles: Role[]; onDone: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost"><Shield className="mr-1 h-3.5 w-3.5" /> Change role</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {roles.map((r) => (
          <DropdownMenuItem key={r.key} onSelect={() => { usersStore.changeRole(selected, r.key); toast.success(`Role → ${r.name}`); onDone(); }}>
            {r.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserActions({ user, onView, onEdit, onDelete }: { user: ClinicUser; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const isSuper = user.role === "super_admin";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onView}><Eye className="mr-2 h-4 w-4" /> View profile</DropdownMenuItem>
        <DropdownMenuItem onSelect={onEdit}><Pencil className="mr-2 h-4 w-4" /> Edit user</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => { usersStore.resetPassword(user.id); toast.success("Reset link sent"); }}>
          <KeyRound className="mr-2 h-4 w-4" /> Reset password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user.status !== "active" ? (
          <DropdownMenuItem onSelect={() => { usersStore.setStatus([user.id], "active"); toast.success("Activated"); }}>
            <UserCheck className="mr-2 h-4 w-4" /> Activate
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => { usersStore.setStatus([user.id], "inactive"); toast.success("Deactivated"); }}>
            <UserX className="mr-2 h-4 w-4" /> Deactivate
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => { usersStore.setStatus([user.id], "suspended"); toast.warning("Suspended"); }}>
          <Ban className="mr-2 h-4 w-4" /> Suspend
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toast.info("Notification sent")}>
          <Bell className="mr-2 h-4 w-4" /> Send notification
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toast.info("Login history opened")}>
          <History className="mr-2 h-4 w-4" /> Login history
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isSuper}
          onSelect={onDelete}
          className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" /> {isSuper ? "Cannot delete Super Admin" : "Delete"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------------- ADD/EDIT DIALOG ---------------- */
function UserFormDialog({ open, user, roles, onClose }:
  { open: boolean; user: ClinicUser | null; roles: Role[]; onClose: () => void }) {

  const empty: ClinicUser = useMemo(() => ({
    id: "", firstName: "", lastName: "", email: "", phone: "",
    role: "assistant", status: "active", branch: BRANCHES[0],
    createdAt: new Date().toISOString(),
  }), []);
  const [form, setForm] = useState<ClinicUser>(user ?? empty);
  const [tab, setTab] = useState("basic");
  const [pwd, setPwd] = useState(""); const [pwd2, setPwd2] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form when opening with different user
  useMemo(() => { setForm(user ?? empty); setTab("basic"); setPwd(""); setPwd2(""); }, [user, open, empty]);

  const set = <K extends keyof ClinicUser>(k: K, v: ClinicUser[K]) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.firstName && form.lastName && /\S+@\S+\.\S+/.test(form.email);

  const submit = async () => {
    if (!valid) { toast.error("Please fill required fields"); return; }
    if (!user && !pwd) { toast.error("Password is required"); return; }
    if (!user && pwd !== pwd2) { toast.error("Passwords don't match"); return; }
    setSaving(true);
    try {
      await usersStore.upsertUser(
        form,
        user ? undefined : { password: pwd, password_confirmation: pwd2 },
      );
      toast.success(user ? "User updated" : "User created");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{user ? "Edit user" : "Add new user"}</DialogTitle>
          <DialogDescription>{user ? "Update profile, role and access." : "Create a new clinic team member."}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="pro">Professional</TabsTrigger>
            <TabsTrigger value="work">Work</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-4 grid grid-cols-2 gap-3">
            <Field label="First name *"><Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
            <Field label="Last name *"><Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
            <Field label="Full name (auto)"><Input disabled value={`${form.firstName} ${form.lastName}`.trim()} /></Field>
            <Field label="Email *"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Gender">
              <Select value={form.gender ?? ""} onValueChange={(v) => set("gender", v as ClinicUser["gender"])}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date of birth"><Input type="date" value={form.dob ?? ""} onChange={(e) => set("dob", e.target.value)} /></Field>
            <Field label="Profile image URL"><Input value={form.avatarUrl ?? ""} onChange={(e) => set("avatarUrl", e.target.value)} placeholder="https://…" /></Field>
            {!user && (
              <>
                <Field label="Password"><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} /></Field>
                <Field label="Confirm password"><Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} /></Field>
              </>
            )}
          </TabsContent>

          <TabsContent value="pro" className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Role">
              <Select value={form.role} onValueChange={(v) => set("role", v as RoleKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{roles.map((r) => <SelectItem key={r.key} value={r.key}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Department"><Input value={form.department ?? ""} onChange={(e) => set("department", e.target.value)} /></Field>
            <Field label="Specialty"><Input value={form.specialty ?? ""} onChange={(e) => set("specialty", e.target.value)} /></Field>
            <Field label="License number"><Input value={form.licenseNumber ?? ""} onChange={(e) => set("licenseNumber", e.target.value)} /></Field>
            <Field label="Experience (years)">
              <Input type="number" value={form.experienceYears ?? ""} onChange={(e) => set("experienceYears", Number(e.target.value) || 0)} />
            </Field>
          </TabsContent>

          <TabsContent value="work" className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Branch">
              <Select value={form.branch} onValueChange={(v) => set("branch", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Working hours"><Input placeholder="9:00–18:00" value={form.workingHours ?? ""} onChange={(e) => set("workingHours", e.target.value)} /></Field>
            <Field label="Calendar color">
              <Input type="color" value={form.calendarColor ?? "#10b981"} onChange={(e) => set("calendarColor", e.target.value)} className="h-9 w-full" />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v as UserStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Notes" className="col-span-2">
              <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </TabsContent>

          <TabsContent value="security" className="mt-4 space-y-3">
            <SecurityToggle label="Two-Factor Authentication (2FA)" desc="Require a second factor at every login."
              checked={!!form.twoFactor} onChange={(v) => set("twoFactor", v)} />
            <SecurityToggle label="Force password reset on next login" desc="User must set a new password."
              checked={false} onChange={() => toast.info("Will be applied on save")} />
            <SecurityToggle label="Session timeout (30 min)" desc="Auto sign-out after inactivity." checked={true} onChange={() => {}} />
            <SecurityToggle label="Limit login attempts" desc="Lock account after 5 failed attempts." checked={true} onChange={() => {}} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : user ? "Save changes" : "Create user"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
function SecurityToggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/* ---------------- PROFILE ---------------- */
function ProfileDialog({ user, role, onClose }: { user: ClinicUser | null; role?: Role; onClose: () => void }) {
  if (!user) return null;
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 ring-4 ring-background">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-lg font-semibold">{initials(user)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{fullName(user)}</h3>
              <p className="text-sm text-muted-foreground">{user.email} · {user.phone}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {role && <span className={cn("rounded-full bg-gradient-to-r px-2.5 py-0.5 text-[11px] font-semibold text-white", role.color)}>{role.name}</span>}
                <Badge variant="outline" className={cn("rounded-full capitalize", STATUS_STYLES[user.status])}>{user.status}</Badge>
                <span className="text-xs text-muted-foreground">{user.branch}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>
        <Tabs defaultValue="overview" className="px-6 pb-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Info label="Department" value={user.department} />
            <Info label="Specialty" value={user.specialty} />
            <Info label="License" value={user.licenseNumber} />
            <Info label="Experience" value={user.experienceYears ? `${user.experienceYears} yrs` : undefined} />
            <Info label="Working hours" value={user.workingHours} />
            <Info label="Last login" value={formatRelative(user.lastLogin)} />
            <Info label="Created" value={new Date(user.createdAt).toLocaleDateString()} />
            <Info label="Two-factor" value={user.twoFactor ? "Enabled" : "Disabled"} />
          </TabsContent>
          <TabsContent value="permissions" className="mt-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {(role?.permissions ?? []).map((p) => {
                const meta = ALL_PERMISSIONS.find((x) => x.key === p);
                return (
                  <div key={p} className="flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-muted-foreground">{meta?.group}</span>
                    <span className="font-medium">{meta?.label ?? p}</span>
                  </div>
                );
              })}
            </div>
          </TabsContent>
          <TabsContent value="activity" className="mt-4 text-sm text-muted-foreground">
            Recent activity will appear here once the user starts working.
          </TabsContent>
          <TabsContent value="security" className="mt-4 space-y-2 text-sm">
            <Info label="2FA" value={user.twoFactor ? "Enabled" : "Disabled"} />
            <Info label="Status" value={user.status} />
          </TabsContent>
          <TabsContent value="notes" className="mt-4 text-sm text-muted-foreground">
            {user.notes || "No notes yet."}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border border-border/60 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

/* ---------------- ROLES TAB ---------------- */
function RolesTab({ roles, users }: { roles: Role[]; users: ClinicUser[] }) {
  const [editing, setEditing] = useState<Role | null>(null);
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{roles.length} roles configured. Built-in roles can't be deleted but their permissions are editable in the Permissions tab.</p>
        <Button size="sm" onClick={() => setAdding(true)}><Plus className="mr-1.5 h-4 w-4" /> Custom role</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((r) => {
          const count = users.filter((u) => u.role === r.key).length;
          return (
            <div key={r.key} className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition hover:shadow-md">
              <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", r.color)} />
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-semibold">{r.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{r.description}</div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setEditing(r)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem disabled={r.builtIn} onSelect={() => { usersStore.deleteRole(r.key); toast.success("Role deleted"); }} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{r.permissions.length} permissions</span>
                <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{count} user{count === 1 ? "" : "s"}</span>
              </div>
              {r.builtIn && <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><ShieldCheck className="h-3 w-3" /> Built-in</div>}
            </div>
          );
        })}
      </div>
      <RoleFormDialog open={adding || !!editing} role={editing} onClose={() => { setAdding(false); setEditing(null); }} />
    </div>
  );
}

function RoleFormDialog({ open, role, onClose }: { open: boolean; role: Role | null; onClose: () => void }) {
  const empty: Role = useMemo(() => ({
    key: `custom_${Date.now()}`, name: "", description: "", color: "from-sky-500 to-cyan-500",
    builtIn: false, permissions: [],
  }), []);
  const [form, setForm] = useState<Role>(role ?? empty);
  useMemo(() => setForm(role ?? empty), [role, open, empty]);

  const togglePerm = (k: string) => {
    setForm((f) => ({ ...f, permissions: f.permissions.includes(k) ? f.permissions.filter((p) => p !== k) : [...f.permissions, k] }));
  };
  const grouped = useMemo(() => {
    const m: Record<string, typeof ALL_PERMISSIONS> = {};
    ALL_PERMISSIONS.forEach((p) => { (m[p.group] ||= []).push(p); });
    return m;
  }, []);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{role ? `Edit ${role.name}` : "Create custom role"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>
        <div className="mt-2 max-h-[50vh] overflow-y-auto rounded-xl border border-border/60 p-3">
          {Object.entries(grouped).map(([group, perms]) => (
            <div key={group} className="mb-4 last:mb-0">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {perms.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={form.permissions.includes(p.key)} onCheckedChange={() => togglePerm(p.key)} />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { if (!form.name) { toast.error("Role name is required"); return; } usersStore.upsertRole(form); toast.success("Role saved"); onClose(); }}>
            {role ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- PERMISSIONS MATRIX ---------------- */
function PermissionsTab({ roles }: { roles: Role[] }) {
  const grouped = useMemo(() => {
    const m: Record<string, typeof ALL_PERMISSIONS> = {};
    ALL_PERMISSIONS.forEach((p) => { (m[p.group] ||= []).push(p); });
    return m;
  }, []);

  const toggle = (role: Role, key: string) => {
    if (role.key === "super_admin") { toast.error("Super Admin permissions cannot be modified"); return; }
    const has = role.permissions.includes(key);
    usersStore.upsertRole({ ...role, permissions: has ? role.permissions.filter((p) => p !== key) : [...role.permissions, key] });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="sticky left-0 z-10 bg-muted/40 px-4 py-3 text-left font-semibold">Permission</th>
              {roles.map((r) => (
                <th key={r.key} className="px-3 py-3 text-center text-xs font-semibold whitespace-nowrap">
                  <div className="flex flex-col items-center gap-1">
                    <span className={cn("rounded-full bg-gradient-to-r px-2 py-0.5 text-[10px] text-white", r.color)}>{r.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([group, perms]) => (
              <Fragment key={group}>
                <tr className="bg-muted/20">
                  <td colSpan={roles.length + 1} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</td>
                </tr>
                {perms.map((p) => (
                  <tr key={p.key} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="sticky left-0 bg-card px-4 py-2 font-medium">{p.label}</td>
                    {roles.map((r) => {
                      const has = r.permissions.includes(p.key);
                      return (
                        <td key={r.key} className="px-3 py-2 text-center">
                          <button onClick={() => toggle(r, p.key)} className="inline-flex h-6 w-6 items-center justify-center rounded-md transition hover:bg-muted">
                            {has ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground/40" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- AUDIT TAB ---------------- */
function AuditTab({ logs }: { logs: ReturnType<typeof useUsersStore>["logs"] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>When</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 && (
            <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">No activity yet.</TableCell></TableRow>
          )}
          {logs.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatRelative(l.at)}</TableCell>
              <TableCell className="font-medium">{l.actor}</TableCell>
              <TableCell>{l.action}</TableCell>
              <TableCell className="text-muted-foreground">{l.target ?? "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{l.details ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ---------------- helpers ---------------- */
function exportCSV(users: ClinicUser[]) {
  const rows = [
    ["Name", "Email", "Phone", "Role", "Status", "Branch", "Last Login", "Created"],
    ...users.map((u) => [fullName(u), u.email, u.phone, u.role, u.status, u.branch, u.lastLogin ?? "", u.createdAt]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "users.csv"; a.click(); URL.revokeObjectURL(url);
  toast.success("Exported users.csv");
}
