import { createActor } from "@/backend";
import { Role } from "@/backend";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { TableColumn, Team, UserProfile } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit,
  Info,
  Shield,
  Trash2,
  UserCheck,
  UserCircle,
  Users as UsersIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Role badge with distinct colors: Admin=violet, Team Head=indigo, Counselor=emerald, Accountant=amber
const roleBadgeClasses: Record<string, string> = {
  admin: "bg-violet-500/10 text-violet-700 border border-violet-500/20",
  teamHead: "bg-indigo-500/10 text-indigo-700 border border-indigo-500/20",
  counselor: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20",
  accountant: "bg-amber-500/10 text-amber-700 border border-amber-500/20",
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  teamHead: "Team Head",
  counselor: "Counselor",
  accountant: "Accountant",
};

const roleAvatarColors: Record<string, string> = {
  admin: "bg-violet-500/15 text-violet-600",
  teamHead: "bg-indigo-500/15 text-indigo-600",
  counselor: "bg-emerald-500/15 text-emerald-600",
  accountant: "bg-amber-500/15 text-amber-600",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold",
        roleBadgeClasses[role] ??
          "bg-muted text-muted-foreground border border-border",
      )}
    >
      <Shield size={10} />
      {roleLabels[role] ?? role}
    </span>
  );
}

function useUsersData() {
  const { actor, isFetching } = useActor(createActor);
  const usersQuery = useQuery<UserProfile[]>({
    queryKey: ["allUsers"],
    queryFn: async () =>
      actor ? (actor.getAllUsers() as Promise<UserProfile[]>) : [],
    enabled: !!actor && !isFetching,
  });
  const teamsQuery = useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: async () => (actor ? (actor.getTeams() as Promise<Team[]>) : []),
    enabled: !!actor && !isFetching,
  });
  return { usersQuery, teamsQuery, actor };
}

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "teamHead", label: "Team Head" },
  { value: "counselor", label: "Counselor" },
  { value: "accountant", label: "Accountant" },
];

export default function Users() {
  const { role: myRole } = useAuth();
  const qc = useQueryClient();
  const { usersQuery, teamsQuery, actor } = useUsersData();

  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [newTeamId, setNewTeamId] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [roleFilter, setRoleFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");

  const isAdmin = myRole === "admin";
  const canViewAll = myRole === "admin" || myRole === "teamHead";

  const teamMap = Object.fromEntries(
    (teamsQuery.data ?? []).map((t) => [String(t.id), t.name]),
  );

  const filteredUsers = (usersQuery.data ?? []).filter((u) => {
    const roleStr = u.role as unknown as string;
    if (roleFilter && roleStr !== roleFilter) return false;
    if (teamFilter && String(u.teamId ?? "") !== teamFilter) return false;
    return true;
  });

  const openEdit = (user: UserProfile) => {
    setEditUser(user);
    setNewRole(user.role as unknown as string);
    setNewTeamId(user.teamId ? String(user.teamId) : "");
  };

  const handleSaveRole = async () => {
    if (!actor || !editUser || !newRole) return;
    setSaving(true);
    try {
      const roleValue = Role[newRole as keyof typeof Role];
      const res = await actor.updateUserRole(editUser.id, roleValue);
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success("Role updated successfully");
      await qc.invalidateQueries({ queryKey: ["allUsers"] });
      setEditUser(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!actor || !deleteTarget) return;
    setSaving(true);
    try {
      const res = await actor.deleteUser(deleteTarget.id);
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success("User removed");
      await qc.invalidateQueries({ queryKey: ["allUsers"] });
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  // Summary counts
  const allUsers = usersQuery.data ?? [];
  const countByRole = (r: string) =>
    allUsers.filter((u) => (u.role as unknown as string) === r).length;

  const roleSummary = [
    {
      label: "Admins",
      count: countByRole("admin"),
      color: "text-violet-600 bg-violet-500/10",
      role: "admin",
    },
    {
      label: "Team Heads",
      count: countByRole("teamHead"),
      color: "text-indigo-600 bg-indigo-500/10",
      role: "teamHead",
    },
    {
      label: "Counselors",
      count: countByRole("counselor"),
      color: "text-emerald-600 bg-emerald-500/10",
      role: "counselor",
    },
    {
      label: "Accountants",
      count: countByRole("accountant"),
      color: "text-amber-600 bg-amber-500/10",
      role: "accountant",
    },
  ];

  const columns: TableColumn<UserProfile>[] = [
    {
      key: "name",
      label: "User",
      sortable: true,
      render: (row) => {
        const roleStr = row.role as unknown as string;
        return (
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold",
                roleAvatarColors[roleStr] ?? "bg-muted text-muted-foreground",
              )}
            >
              {row.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {row.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {row.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "role",
      label: "Role",
      render: (row) => <RoleBadge role={row.role as unknown as string} />,
    },
    {
      key: "teamId",
      label: "Team",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.teamId ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-muted/60 text-foreground text-xs">
              <UsersIcon size={10} />
              {teamMap[String(row.teamId)] ?? "Team"}
            </span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Joined",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {formatTimestamp(row.createdAt)}
        </span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          {isAdmin && (
            <>
              <button
                type="button"
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-smooth"
                onClick={() => openEdit(row)}
                title="Edit Role"
                data-ocid="users.edit_button"
              >
                <Edit size={14} />
              </button>
              <button
                type="button"
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-smooth"
                onClick={() => setDeleteTarget(row)}
                title="Delete User"
                data-ocid="users.delete_button"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (!canViewAll) {
    return (
      <AppLayout title="Users">
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <UserCircle size={48} className="text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">
            You don&apos;t have permission to view this page.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Users">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground font-display">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allUsers.length} users registered in the system
          </p>
        </div>

        {/* Role summary chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {roleSummary.map((s) => (
            <button
              key={s.role}
              type="button"
              onClick={() => setRoleFilter(roleFilter === s.role ? "" : s.role)}
              className={cn(
                "bg-card border rounded-2xl p-4 flex items-center gap-3 transition-smooth hover:shadow-card cursor-pointer text-left",
                roleFilter === s.role
                  ? "border-primary ring-1 ring-primary"
                  : "border-border",
              )}
              data-ocid={`users.role_summary_${s.role}`}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center",
                  s.color,
                )}
              >
                <UserCheck size={16} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold text-foreground font-display">
                  {s.count}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Filter row */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              data-ocid="users.role_filter_select"
            >
              <option value="">All Roles</option>
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              data-ocid="users.team_filter_select"
            >
              <option value="">All Teams</option>
              {(teamsQuery.data ?? []).map((t) => (
                <option key={String(t.id)} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>
            {(roleFilter || teamFilter) && (
              <button
                type="button"
                onClick={() => {
                  setRoleFilter("");
                  setTeamFilter("");
                }}
                className="text-xs text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-3 py-2">
            <Info size={13} className="shrink-0" />
            Users register via Internet Identity login
          </div>
        </div>

        <DataTable<UserProfile>
          columns={columns}
          data={filteredUsers}
          loading={usersQuery.isLoading}
          pageSize={15}
          searchPlaceholder="Search by name or email…"
          emptyMessage="No users found."
          rowKey={(row) => row.id.toString()}
        />
      </div>

      {/* Edit Role Modal */}
      {editUser && (
        <Modal
          title={`Edit User — ${editUser.name}`}
          onClose={() => setEditUser(null)}
          size="sm"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditUser(null)}
                disabled={saving}
                data-ocid="users.edit_cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveRole}
                disabled={saving || !newRole}
                data-ocid="users.edit_save_button"
              >
                {saving ? "Saving…" : "Update Role"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold",
                  roleAvatarColors[editUser.role as unknown as string] ??
                    "bg-muted",
                )}
              >
                {editUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-foreground">{editUser.name}</p>
                <p className="text-xs text-muted-foreground">
                  {editUser.email}
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-role">Assign Role</Label>
              <select
                id="edit-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                data-ocid="users.role_select"
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {(newRole === "counselor" || newRole === "teamHead") && (
              <div>
                <Label htmlFor="edit-team">Assign Team</Label>
                <select
                  id="edit-team"
                  value={newTeamId}
                  onChange={(e) => setNewTeamId(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  data-ocid="users.team_select"
                >
                  <option value="">No team</option>
                  {(teamsQuery.data ?? []).map((t) => (
                    <option key={String(t.id)} value={String(t.id)}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Remove User"
          message={`Remove "${deleteTarget.name}" from the system? This cannot be undone.`}
          confirmLabel="Remove User"
          isLoading={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppLayout>
  );
}
