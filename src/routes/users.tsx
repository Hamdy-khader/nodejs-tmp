import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  Download,
  Eye,
  Filter,
  History,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  BRANCHES,
  ClinicUser,
  LoginHistoryEntry,
  Role,
  RoleKey,
  SIMPLE_ROLES,
  UserStatus,
  formatRelative,
  fullName,
  initials,
  roleByKey,
  useUsersStore,
  usersStore,
} from "@/lib/users-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Users Management - BrightPlans" },
      { name: "description", content: "Manage clinic users, status and branch assignment." },
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
  const { users } = useUsersStore();

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
              Manage clinic users with simple role, status and branch assignment.
            </p>
          </div>
          <StatsRow users={users} />
        </header>

        <main className="mt-8">
          <UsersTable users={users} />
        </main>
      </div>
    </div>
  );
}

function StatsRow({ users }: { users: ClinicUser[] }) {
  const active = users.filter((user) => user.status === "active").length;
  const online = users.filter((user) => user.online).length;
  const dentists = users.filter((user) => user.role === "dentist").length;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[
        { label: "Total", value: users.length, color: "text-foreground" },
        { label: "Active", value: active, color: "text-emerald-600" },
        { label: "Online", value: online, color: "text-sky-600" },
        { label: "Dentists", value: dentists, color: "text-cyan-600" },
      ].map((stat) => (
        <div key={stat.label} className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</div>
          <div className={cn("mt-1 text-2xl font-bold tabular-nums", stat.color)}>{stat.value}</div>
        </div>
      ))}
    </div>
  );
}

function UsersTable({ users }: { users: ClinicUser[] }) {
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "lastLogin">("newest");
  const [editing, setEditing] = useState<ClinicUser | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ClinicUser | null>(null);
  const [profile, setProfile] = useState<ClinicUser | null>(null);
  const [passwordUser, setPasswordUser] = useState<ClinicUser | null>(null);
  const [historyUser, setHistoryUser] = useState<ClinicUser | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return users
      .filter((user) => {
        if (query && !`${fullName(user)} ${user.email} ${user.phone}`.toLowerCase().includes(query)) return false;
        if (roleFilter !== "all" && user.role !== roleFilter) return false;
        if (statusFilter !== "all" && user.status !== statusFilter) return false;
        if (branchFilter !== "all" && user.branch !== branchFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "newest") return +new Date(b.createdAt) - +new Date(a.createdAt);
        if (sort === "oldest") return +new Date(a.createdAt) - +new Date(b.createdAt);
        return +new Date(b.lastLogin || 0) - +new Date(a.lastLogin || 0);
      });
  }, [users, q, roleFilter, statusFilter, branchFilter, sort]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search name, email, phone..." className="pl-9" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px]"><Filter className="mr-1.5 h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {SIMPLE_ROLES.map((role) => <SelectItem key={role.key} value={role.key}>{role.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {BRANCHES.map((branch) => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => setSort(value as typeof sort)}>
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
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
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
            {filtered.map((user) => (
              <TableRow key={user.id} className="group">
                <TableCell>
                  <button onClick={() => setProfile(user)} className="flex items-center gap-3 text-left">
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-semibold">{initials(user)}</AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
                        user.online ? "bg-emerald-500" : "bg-slate-300",
                      )} />
                    </div>
                    <div>
                      <div className="font-medium leading-tight group-hover:text-primary">{fullName(user)}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </button>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("rounded-full border px-2.5 py-0 text-[11px] font-medium capitalize", STATUS_STYLES[user.status])}>
                    <Circle className={cn("mr-1 h-1.5 w-1.5 fill-current",
                      user.status === "active" ? "text-emerald-500" :
                      user.status === "suspended" ? "text-rose-500" : "text-slate-400")} />
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell><span className="text-sm">{user.branch}</span></TableCell>
                <TableCell><span className="text-xs text-muted-foreground">{formatRelative(user.lastLogin)}</span></TableCell>
                <TableCell><span className="text-xs text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</span></TableCell>
                <TableCell className="pr-4 text-right">
                  <UserActions
                    onView={() => setProfile(user)}
                    onEdit={() => setEditing(user)}
                    onChangePassword={() => setPasswordUser(user)}
                    onLoginHistory={() => setHistoryUser(user)}
                    onDelete={() => setConfirmDelete(user)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <UserFormDialog
        open={adding || !!editing}
        user={editing}
        onClose={() => { setAdding(false); setEditing(null); }}
      />
      <ProfileDialog user={profile} onClose={() => setProfile(null)} />
      <ChangePasswordDialog user={passwordUser} onClose={() => setPasswordUser(null)} />
      <LoginHistoryDialog user={historyUser} onClose={() => setHistoryUser(null)} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete && fullName(confirmDelete)}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The user will lose access immediately.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!confirmDelete) return;
                try {
                  await usersStore.deleteUser(confirmDelete.id);
                  toast.success("User deleted");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to delete user");
                } finally {
                  setConfirmDelete(null);
                }
              }}
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UserActions({
  onView,
  onEdit,
  onChangePassword,
  onLoginHistory,
  onDelete,
}: {
  onView: () => void;
  onEdit: () => void;
  onChangePassword: () => void;
  onLoginHistory: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onView}><Eye className="mr-2 h-4 w-4" /> View Profile</DropdownMenuItem>
        <DropdownMenuItem onSelect={onEdit}><Pencil className="mr-2 h-4 w-4" /> Edit User</DropdownMenuItem>
        <DropdownMenuItem onSelect={onChangePassword}><KeyRound className="mr-2 h-4 w-4" /> Change Password</DropdownMenuItem>
        <DropdownMenuItem onSelect={onLoginHistory}><History className="mr-2 h-4 w-4" /> Login History</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" /> Delete User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserFormDialog({ open, user, onClose }: { open: boolean; user: ClinicUser | null; onClose: () => void }) {
  const empty: ClinicUser = useMemo(() => ({
    id: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "assistant",
    status: "active",
    branch: BRANCHES[0],
    createdAt: new Date().toISOString(),
  }), []);
  const [form, setForm] = useState<ClinicUser>(user ?? empty);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(user ?? empty);
    setPassword("");
    setPasswordConfirmation("");
  }, [user, open, empty]);

  const set = <K extends keyof ClinicUser>(key: K, value: ClinicUser[K]) => setForm((current) => ({ ...current, [key]: value }));
  const valid = form.firstName.trim() && form.lastName.trim() && /\S+@\S+\.\S+/.test(form.email);

  const submit = async () => {
    if (!valid) {
      toast.error("Please fill required fields");
      return;
    }
    if (!user && !password) {
      toast.error("Password is required");
      return;
    }
    if (!user && password !== passwordConfirmation) {
      toast.error("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      await usersStore.upsertUser(
        form,
        user ? undefined : { password, password_confirmation: passwordConfirmation },
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
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{user ? "Edit User" : "Add New User"}</DialogTitle>
          <DialogDescription>
            Select only Dentist or Assistant. Permissions are assigned automatically by the backend.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Field label="First name *"><Input value={form.firstName} onChange={(event) => set("firstName", event.target.value)} /></Field>
          <Field label="Last name *"><Input value={form.lastName} onChange={(event) => set("lastName", event.target.value)} /></Field>
          <Field label="Email *"><Input type="email" value={form.email} onChange={(event) => set("email", event.target.value)} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(event) => set("phone", event.target.value)} /></Field>
          <Field label="Role">
            <Select value={form.role} onValueChange={(value) => set("role", value as RoleKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dentist">Dentist</SelectItem>
                <SelectItem value="assistant">Assistant</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(value) => set("status", value as UserStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Branch">
            <Select value={form.branch} onValueChange={(value) => set("branch", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BRANCHES.map((branch) => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Department"><Input value={form.department ?? ""} onChange={(event) => set("department", event.target.value)} /></Field>
          <Field label="Specialty"><Input value={form.specialty ?? ""} onChange={(event) => set("specialty", event.target.value)} /></Field>
          <Field label="License number"><Input value={form.licenseNumber ?? ""} onChange={(event) => set("licenseNumber", event.target.value)} /></Field>
          <Field label="Working hours"><Input placeholder="9:00-18:00" value={form.workingHours ?? ""} onChange={(event) => set("workingHours", event.target.value)} /></Field>
          <Field label="Calendar color"><Input type="color" value={form.calendarColor ?? "#10b981"} onChange={(event) => set("calendarColor", event.target.value)} className="h-9 w-full" /></Field>
          {!user && (
            <>
              <Field label="Password *"><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
              <Field label="Confirm password *"><Input type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} /></Field>
            </>
          )}
          <Field label="Notes" className="col-span-2">
            <Textarea rows={3} value={form.notes ?? ""} onChange={(event) => set("notes", event.target.value)} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : user ? "Save Changes" : "Create User"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({ user, onClose }: { user: ClinicUser | null; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPassword("");
    setPasswordConfirmation("");
  }, [user]);

  const submit = async () => {
    if (!user) return;
    if (!password) {
      toast.error("Password is required");
      return;
    }
    if (password !== passwordConfirmation) {
      toast.error("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      await usersStore.changePassword(user.id, password, passwordConfirmation);
      toast.success("Password changed");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>{user ? `Set a new password for ${fullName(user)}.` : ""}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="New password"><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
          <Field label="Confirm password"><Input type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : "Change Password"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LoginHistoryDialog({ user, onClose }: { user: ClinicUser | null; onClose: () => void }) {
  const [entries, setEntries] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    usersStore.getLoginHistory(user.id)
      .then(setEntries)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load login history"))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <Dialog open={!!user} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Login History</DialogTitle>
          <DialogDescription>{user ? fullName(user) : ""}</DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-xl border border-border/60">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>When</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Device</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>}
              {!loading && entries.length === 0 && <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">No login history.</TableCell></TableRow>}
              {!loading && entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatRelative(entry.loggedAt)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("rounded-full capitalize", entry.status === "success" ? STATUS_STYLES.active : STATUS_STYLES.suspended)}>
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{entry.ipAddress ?? "-"}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">{entry.userAgent ?? entry.failureReason ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProfileDialog({ user, onClose }: { user: ClinicUser | null; onClose: () => void }) {
  if (!user) return null;
  const role = roleByKey(user.role) as Role | undefined;

  return (
    <Dialog open={!!user} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 ring-4 ring-background">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-lg font-semibold">{initials(user)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{fullName(user)}</h3>
              <p className="text-sm text-muted-foreground">{user.email} {user.phone ? `- ${user.phone}` : ""}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {role && <span className={cn("rounded-full bg-gradient-to-r px-2.5 py-0.5 text-[11px] font-semibold text-white", role.color)}>{role.name}</span>}
                <Badge variant="outline" className={cn("rounded-full capitalize", STATUS_STYLES[user.status])}>{user.status}</Badge>
                <span className="text-xs text-muted-foreground">{user.branch}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 px-6 pb-6 text-sm">
          <Info label="Department" value={user.department} />
          <Info label="Specialty" value={user.specialty} />
          <Info label="License" value={user.licenseNumber} />
          <Info label="Working hours" value={user.workingHours} />
          <Info label="Last login" value={formatRelative(user.lastLogin)} />
          <Info label="Created" value={new Date(user.createdAt).toLocaleDateString()} />
          <Info label="Notes" value={user.notes} className="col-span-2" />
        </div>
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

function Info({ label, value, className }: { label: string; value?: string; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/60 p-3", className)}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value || "-"}</div>
    </div>
  );
}

function exportCSV(users: ClinicUser[]) {
  const rows = [
    ["Name", "Email", "Phone", "Role", "Status", "Branch", "Last Login", "Created"],
    ...users.map((user) => [fullName(user), user.email, user.phone, user.role, user.status, user.branch, user.lastLogin ?? "", user.createdAt]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "users.csv";
  link.click();
  URL.revokeObjectURL(url);
  toast.success("Exported users.csv");
}
