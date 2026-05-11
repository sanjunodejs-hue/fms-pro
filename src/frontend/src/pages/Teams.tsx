import { Role, createActor } from "@/backend";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { CourseCategory, Team, UserProfile } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronRight,
  Edit2,
  FolderOpen,
  Plus,
  Shield,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

function useTeamsData() {
  const { actor, isFetching } = useActor(createActor);
  const teams = useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: async () => (actor ? (actor.getTeams() as Promise<Team[]>) : []),
    enabled: !!actor && !isFetching,
  });
  const categories = useQuery<CourseCategory[]>({
    queryKey: ["courseCategories"],
    queryFn: async () =>
      actor ? (actor.getCourseCategories() as Promise<CourseCategory[]>) : [],
    enabled: !!actor && !isFetching,
  });
  const users = useQuery<UserProfile[]>({
    queryKey: ["allUsers"],
    queryFn: async () =>
      actor ? (actor.getAllUsers() as Promise<UserProfile[]>) : [],
    enabled: !!actor && !isFetching,
  });
  return { teams, categories, users, actor };
}

type ModalType = "add" | "edit" | "view" | "assignHead" | null;

interface TeamFormData {
  name: string;
  description: string;
  categoryId: string;
  headId: string;
}

const categoryColors = [
  "bg-primary/10 text-primary border-primary/20",
  "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  "bg-amber-500/10 text-amber-700 border-amber-500/20",
  "bg-violet-500/10 text-violet-700 border-violet-500/20",
  "bg-rose-500/10 text-rose-700 border-rose-500/20",
];

function TeamCard({
  team,
  categoryMap,
  userMap,
  memberCount,
  onEdit,
  onDelete,
  onView,
  onAssignHead,
}: {
  team: Team;
  categoryMap: Record<string, string>;
  userMap: Record<string, string>;
  memberCount: number;
  onEdit: (t: Team) => void;
  onDelete: (t: Team) => void;
  onView: (t: Team) => void;
  onAssignHead: (t: Team) => void;
}) {
  const colorIdx = Number(team.id) % categoryColors.length;
  const catName = team.categoryId
    ? (categoryMap[String(team.categoryId)] ?? "—")
    : "—";
  const headName = team.headId
    ? (userMap[team.headId.toString()] ?? "Assigned")
    : null;

  return (
    <div
      className={cn(
        "relative bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 transition-smooth shadow-subtle hover:shadow-card hover:-translate-y-0.5 overflow-hidden",
        !team.isActive && "opacity-70",
      )}
      data-ocid={`teams.card.${String(team.id)}`}
    >
      {/* Top accent strip */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0 shadow-sm">
            <Users size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {team.name}
            </h3>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {team.description || "No description"}
            </p>
          </div>
        </div>
        <StatusBadge
          variant={team.isActive ? "active" : "inactive"}
          dot={false}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/40 rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1">Category</p>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border",
              categoryColors[colorIdx],
            )}
          >
            <BookOpen size={10} />
            {catName}
          </span>
        </div>
        <div className="bg-muted/40 rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1">Team Head</p>
          {headName ? (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User size={10} className="text-primary" />
              </div>
              <span className="text-xs font-medium truncate">{headName}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAssignHead(team)}
              className="text-xs text-primary hover:underline"
              data-ocid="teams.assign_head_link"
            >
              Assign head
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users size={12} />
          <span>{memberCount} members</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="View Team"
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-smooth"
            onClick={() => onView(team)}
            data-ocid="teams.view_button"
          >
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            title="Assign Head"
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-smooth"
            onClick={() => onAssignHead(team)}
            data-ocid="teams.assign_head_button"
          >
            <Shield size={14} />
          </button>
          <button
            type="button"
            title="Edit"
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-blue-600 transition-smooth"
            onClick={() => onEdit(team)}
            data-ocid="teams.edit_button"
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            title="Delete"
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-smooth"
            onClick={() => onDelete(team)}
            data-ocid="teams.delete_button"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Teams() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { teams, categories, users, actor } = useTeamsData();

  const [modal, setModal] = useState<ModalType>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TeamFormData>({
    name: "",
    description: "",
    categoryId: "",
    headId: "",
  });

  useEffect(() => {
    if (role !== Role.admin) navigate("/dashboard", { replace: true });
  }, [role, navigate]);

  const categoryMap = Object.fromEntries(
    (categories.data ?? []).map((c) => [String(c.id), c.name]),
  );
  const userMap = Object.fromEntries(
    (users.data ?? []).map((u) => [u.id.toString(), u.name]),
  );

  const getMemberCount = (teamId: bigint) =>
    (users.data ?? []).filter(
      (u) => u.teamId !== undefined && u.teamId !== null && u.teamId === teamId,
    ).length;

  const openAdd = () => {
    setForm({ name: "", description: "", categoryId: "", headId: "" });
    setSelectedTeam(null);
    setModal("add");
  };

  const openEdit = (team: Team) => {
    setSelectedTeam(team);
    setForm({
      name: team.name,
      description: team.description,
      categoryId: team.categoryId ? String(team.categoryId) : "",
      headId: team.headId ? team.headId.toString() : "",
    });
    setModal("edit");
  };

  const openView = (team: Team) => {
    setSelectedTeam(team);
    setModal("view");
  };

  const openAssignHead = (team: Team) => {
    setSelectedTeam(team);
    setForm((f) => ({
      ...f,
      headId: team.headId ? team.headId.toString() : "",
    }));
    setModal("assignHead");
  };

  const closeModal = () => {
    setModal(null);
    setSelectedTeam(null);
  };

  const handleSaveTeam = async () => {
    if (!actor || !form.name.trim()) return;
    setSaving(true);
    try {
      const catId = form.categoryId ? BigInt(form.categoryId) : null;
      if (modal === "add") {
        const res = await actor.addTeam(
          form.name.trim(),
          catId,
          form.description.trim(),
        );
        if (res.__kind__ === "err") throw new Error(res.err);
        toast.success("Team created successfully");
      } else if (modal === "edit" && selectedTeam) {
        const { Principal } = await import("@icp-sdk/core/principal");
        const headId = form.headId ? Principal.fromText(form.headId) : null;
        const res = await actor.updateTeam(
          selectedTeam.id,
          form.name.trim(),
          catId,
          headId,
          form.description.trim(),
        );
        if (res.__kind__ === "err") throw new Error(res.err);
        toast.success("Team updated successfully");
      }
      await qc.invalidateQueries({ queryKey: ["teams"] });
      closeModal();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignHead = async () => {
    if (!actor || !selectedTeam || !form.headId) return;
    setSaving(true);
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const res = await actor.assignTeamHead(
        selectedTeam.id,
        Principal.fromText(form.headId),
      );
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success("Team head assigned");
      await qc.invalidateQueries({ queryKey: ["teams"] });
      closeModal();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!actor || !deleteTarget) return;
    setSaving(true);
    try {
      const res = await actor.deleteTeam(deleteTarget.id);
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success("Team deleted");
      await qc.invalidateQueries({ queryKey: ["teams"] });
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const teamsList = teams.data ?? [];
  const activeCount = teamsList.filter((t) => t.isActive).length;

  // Team members for view modal
  const viewMembers = selectedTeam
    ? (users.data ?? []).filter(
        (u) =>
          u.teamId !== undefined &&
          u.teamId !== null &&
          u.teamId === selectedTeam.id,
      )
    : [];

  return (
    <AppLayout title="Team Management">
      <div className="space-y-5">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground font-display">
              Team Management
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {teamsList.length} teams · {activeCount} active
            </p>
          </div>
          <Button
            type="button"
            onClick={openAdd}
            className="gap-2 bg-gradient-primary text-white border-0 shadow-sm"
            data-ocid="teams.add_button"
          >
            <Plus size={16} />
            Create Team
          </Button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total Teams",
              value: teamsList.length,
              icon: <Users size={16} />,
              color: "text-primary bg-primary/10",
            },
            {
              label: "Active Teams",
              value: activeCount,
              icon: <Shield size={16} />,
              color: "text-emerald-600 bg-emerald-500/10",
            },
            {
              label: "Categories",
              value: (categories.data ?? []).length,
              icon: <BookOpen size={16} />,
              color: "text-violet-600 bg-violet-500/10",
            },
            {
              label: "Total Members",
              value: (users.data ?? []).filter((u) => u.teamId).length,
              icon: <User size={16} />,
              color: "text-amber-600 bg-amber-500/10",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3"
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center",
                  s.color,
                )}
              >
                {s.icon}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold text-foreground font-display">
                  {s.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Teams grid */}
        {teams.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-2xl p-5 h-52 animate-pulse"
              />
            ))}
          </div>
        ) : teamsList.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl flex flex-col items-center justify-center py-16 gap-3">
            <FolderOpen size={40} className="text-muted-foreground/40" />
            <p className="text-muted-foreground">
              No teams yet. Create your first team.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={openAdd}
              data-ocid="teams.empty_add_button"
            >
              <Plus size={14} className="mr-1" /> Create Team
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamsList.map((team) => (
              <TeamCard
                key={String(team.id)}
                team={team}
                categoryMap={categoryMap}
                userMap={userMap}
                memberCount={getMemberCount(team.id)}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onView={openView}
                onAssignHead={openAssignHead}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(modal === "add" || modal === "edit") && (
        <Modal
          title={
            modal === "add"
              ? "Create New Team"
              : `Edit Team — ${selectedTeam?.name}`
          }
          onClose={closeModal}
          size="md"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={saving}
                data-ocid="teams.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveTeam}
                disabled={saving || !form.name.trim()}
                data-ocid="teams.save_button"
              >
                {saving
                  ? "Saving…"
                  : modal === "add"
                    ? "Create Team"
                    : "Save Changes"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="team-name">
                Team Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="team-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Tech Alpha Team"
                className="mt-1"
                data-ocid="teams.name_input"
              />
            </div>
            <div>
              <Label htmlFor="team-desc">Description</Label>
              <Input
                id="team-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="What leads does this team handle?"
                className="mt-1"
                data-ocid="teams.description_input"
              />
            </div>
            <div>
              <Label htmlFor="team-category">Course Category</Label>
              <select
                id="team-category"
                value={form.categoryId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, categoryId: e.target.value }))
                }
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                data-ocid="teams.category_select"
              >
                <option value="">No category</option>
                {(categories.data ?? []).map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Leads in this category will auto-assign to this team.
              </p>
            </div>
            <div>
              <Label htmlFor="team-head">Team Head</Label>
              <select
                id="team-head"
                value={form.headId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, headId: e.target.value }))
                }
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                data-ocid="teams.head_select"
              >
                <option value="">No team head</option>
                {(users.data ?? []).map((u) => (
                  <option key={u.id.toString()} value={u.id.toString()}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* View Team Modal */}
      {modal === "view" && selectedTeam && (
        <Modal
          title={`Team — ${selectedTeam.name}`}
          onClose={closeModal}
          size="lg"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                data-ocid="teams.view_close_button"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  closeModal();
                  openEdit(selectedTeam);
                }}
                data-ocid="teams.view_edit_button"
              >
                <Edit2 size={14} className="mr-1.5" /> Edit Team
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">Category</p>
                <p className="text-sm font-medium">
                  {selectedTeam.categoryId
                    ? (categoryMap[String(selectedTeam.categoryId)] ?? "—")
                    : "—"}
                </p>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">Team Head</p>
                <p className="text-sm font-medium">
                  {selectedTeam.headId
                    ? (userMap[selectedTeam.headId.toString()] ?? "Assigned")
                    : "Not assigned"}
                </p>
              </div>
              <div className="bg-muted/40 rounded-xl p-3 col-span-2">
                <p className="text-xs text-muted-foreground mb-1">
                  Description
                </p>
                <p className="text-sm">
                  {selectedTeam.description || "No description"}
                </p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Users size={14} /> Members ({viewMembers.length})
              </h4>
              {viewMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No members assigned
                </p>
              ) : (
                <div className="space-y-2">
                  {viewMembers.map((u) => (
                    <div
                      key={u.id.toString()}
                      className="flex items-center gap-3 bg-muted/30 rounded-xl px-3 py-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User size={14} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {u.email}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {String(u.role)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Head Modal */}
      {modal === "assignHead" && selectedTeam && (
        <Modal
          title={`Assign Team Head — ${selectedTeam.name}`}
          onClose={closeModal}
          size="sm"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={saving}
                data-ocid="teams.assign_cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAssignHead}
                disabled={saving || !form.headId}
                data-ocid="teams.assign_confirm_button"
              >
                {saving ? "Assigning…" : "Assign Head"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a user with Team Head role to lead this team.
            </p>
            <div>
              <Label htmlFor="assign-head-user">
                Select User <span className="text-destructive">*</span>
              </Label>
              <select
                id="assign-head-user"
                value={form.headId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, headId: e.target.value }))
                }
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                data-ocid="teams.assign_user_select"
              >
                <option value="">Select a user…</option>
                {(users.data ?? []).map((u) => (
                  <option key={u.id.toString()} value={u.id.toString()}>
                    {u.name} — {u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Team"
          message={`Are you sure you want to delete "${deleteTarget.name}"? All members will be unassigned. This cannot be undone.`}
          confirmLabel="Delete Team"
          isLoading={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppLayout>
  );
}
