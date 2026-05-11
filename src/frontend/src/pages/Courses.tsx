/**
 * Courses.tsx — Course Category Management (Admin Only)
 * Replaces Course module with Category-only as per requirements.
 */
import { Role, createActor } from "@/backend";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import type { CourseCategory, TableColumn, Team } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit,
  FolderOpen,
  Link2,
  Plus,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface CategoryForm {
  name: string;
  description: string;
}

const defaultForm: CategoryForm = { name: "", description: "" };

// ─── Assign to Team Modal ────────────────────────────────────────────────────
interface AssignTeamModalProps {
  category: CourseCategory;
  teams: Team[];
  saving: boolean;
  onClose: () => void;
  onAssign: (teamId: bigint) => Promise<void>;
}

function AssignTeamModal({
  category,
  teams,
  saving,
  onClose,
  onAssign,
}: AssignTeamModalProps) {
  const [selectedTeam, setSelectedTeam] = useState("");
  return (
    <Modal
      title={`Assign "${category.name}" to Team`}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            data-ocid="courses.assign_cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => selectedTeam && onAssign(BigInt(selectedTeam))}
            disabled={saving || !selectedTeam}
            data-ocid="courses.assign_confirm_button"
          >
            {saving ? "Assigning..." : "Assign Team"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Select a team to handle leads in this category. Leads with this
          category will be auto-assigned to the selected team.
        </p>
        <div>
          <Label htmlFor="assign-team">Select Team *</Label>
          <select
            id="assign-team"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            data-ocid="courses.assign_team_select"
          >
            <option value="">Choose a team...</option>
            {teams
              .filter((t) => t.isActive)
              .map((t) => (
                <option key={String(t.id)} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Courses() {
  const { role } = useAuth();
  const { actor, isFetching } = useActor(createActor);
  const qc = useQueryClient();

  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<CourseCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CourseCategory | null>(null);
  const [assignTarget, setAssignTarget] = useState<CourseCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const { data: categories = [], isLoading } = useQuery<CourseCategory[]>({
    queryKey: ["courseCategories"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCourseCategories() as Promise<CourseCategory[]>;
    },
    enabled: !!actor && !isFetching,
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTeams() as Promise<Team[]>;
    },
    enabled: !!actor && !isFetching,
  });

  // Build team lookup map for category assignment display
  const teamMap = useMemo(
    () => new Map(teams.map((t) => [String(t.id), t])),
    [teams],
  );

  // Which team is assigned to each category
  const categoryTeamMap = useMemo(() => {
    const m = new Map<string, Team>();
    for (const t of teams) {
      if (t.categoryId) m.set(String(t.categoryId), t);
    }
    return m;
  }, [teams]);

  const isAdminOnly = role === Role.admin;

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }, [categories, search]);

  const openAdd = () => {
    setForm(defaultForm);
    setSelected(null);
    setModal("add");
  };

  const openEdit = (cat: CourseCategory) => {
    setSelected(cat);
    setForm({ name: cat.name, description: cat.description });
    setModal("edit");
  };

  const handleSave = async () => {
    if (!actor || !form.name.trim()) return;
    setSaving(true);
    try {
      if (modal === "add") {
        const res = await actor.addCourseCategory(
          form.name.trim(),
          form.description.trim(),
        );
        if (res.__kind__ === "err") throw new Error(res.err);
        toast.success("Category created successfully");
      } else if (modal === "edit" && selected) {
        const res = await actor.updateCourseCategory(
          selected.id,
          form.name.trim(),
          form.description.trim(),
        );
        if (res.__kind__ === "err") throw new Error(res.err);
        toast.success("Category updated successfully");
      }
      await qc.invalidateQueries({ queryKey: ["courseCategories"] });
      setModal(null);
      setSelected(null);
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
      const res = await actor.deleteCourseCategory(deleteTarget.id);
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success("Category deleted");
      await qc.invalidateQueries({ queryKey: ["courseCategories"] });
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignTeam = async (teamId: bigint) => {
    if (!actor || !assignTarget) return;
    setSaving(true);
    try {
      const team = teamMap.get(String(teamId));
      if (!team) throw new Error("Team not found");
      const res = await actor.updateTeam(
        teamId,
        team.name,
        assignTarget.id,
        team.headId ?? null,
        team.description,
      );
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success(`"${assignTarget.name}" assigned to ${team.name}`);
      await qc.invalidateQueries({ queryKey: ["teams"] });
      setAssignTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assignment failed");
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const totalLeadsPerCategory: Record<string, number> = {};
  const totalStudentsPerCategory: Record<string, number> = {};

  const columns: TableColumn<CourseCategory>[] = [
    {
      key: "name",
      label: "Category",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Tag size={14} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{row.name}</p>
            {row.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                {row.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "id",
      label: "Assigned Team",
      render: (row) => {
        const team = categoryTeamMap.get(String(row.id));
        return team ? (
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-primary" />
            <span className="text-sm font-medium text-primary">
              {team.name}
            </span>
            <StatusBadge
              variant={team.isActive ? "active" : "inactive"}
              dot={false}
              label={team.isActive ? "Active" : "Inactive"}
              className="ml-1"
            />
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">
            Not assigned
          </span>
        );
      },
    },
    {
      key: "id",
      label: "Leads",
      render: (row) => (
        <span className="text-sm tabular-nums font-medium text-foreground">
          {totalLeadsPerCategory[String(row.id)] ?? "—"}
        </span>
      ),
    },
    {
      key: "id",
      label: "Students",
      render: (row) => (
        <span className="text-sm tabular-nums font-medium text-foreground">
          {totalStudentsPerCategory[String(row.id)] ?? "—"}
        </span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      render: (row) =>
        isAdminOnly ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Assign to Team"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-smooth"
              onClick={() => setAssignTarget(row)}
              data-ocid="courses.assign_team_button"
            >
              <Link2 size={14} />
            </button>
            <button
              type="button"
              title="Edit"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-blue-600 transition-smooth"
              onClick={() => openEdit(row)}
              data-ocid="courses.edit_button"
            >
              <Edit size={14} />
            </button>
            <button
              type="button"
              title="Delete"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-smooth"
              onClick={() => setDeleteTarget(row)}
              data-ocid="courses.delete_button"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">View only</span>
        ),
    },
  ];

  return (
    <AppLayout title="Course Categories">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <FolderOpen size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Course Categories
              </p>
              <p className="text-xs text-muted-foreground">
                Admin-only · Auto-assigns leads to teams
              </p>
            </div>
          </div>
          {isAdminOnly && (
            <Button
              type="button"
              onClick={openAdd}
              className="gap-2 shrink-0"
              data-ocid="courses.add_button"
            >
              <Plus size={16} />
              Add Category
            </Button>
          )}
        </div>

        {/* Search bar */}
        <div className="relative max-w-sm">
          <Input
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-4 h-9 text-sm"
            data-ocid="courses.search_input"
          />
        </div>

        {/* Category cards grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 rounded-xl bg-muted/40 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="rounded-xl border border-border bg-card p-12 text-center"
            data-ocid="courses.empty_state"
          >
            <FolderOpen
              size={36}
              className="text-muted-foreground mx-auto mb-3 opacity-40"
            />
            <p className="text-sm font-medium text-foreground">
              No categories found
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isAdminOnly
                ? "Add your first course category to get started."
                : "No categories have been created yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((cat, i) => {
              const assignedTeam = categoryTeamMap.get(String(cat.id));
              return (
                <div
                  key={String(cat.id)}
                  className="relative bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-subtle transition-smooth group"
                  data-ocid={`courses.item.${i + 1}`}
                >
                  {/* Category icon + name */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Tag size={18} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-sm truncate">
                          {cat.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {cat.description || "No description"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Assigned team */}
                  <div className="flex items-center gap-1.5 text-xs mb-4">
                    <Users
                      size={11}
                      className="text-muted-foreground shrink-0"
                    />
                    {assignedTeam ? (
                      <span className="text-primary font-medium">
                        {assignedTeam.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">
                        No team assigned
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  {isAdminOnly && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-smooth font-medium"
                        onClick={() => setAssignTarget(cat)}
                        data-ocid="courses.assign_team_inline_button"
                      >
                        <Link2 size={11} />
                        Assign Team
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-blue-600 transition-smooth"
                        onClick={() => openEdit(cat)}
                        title="Edit"
                        data-ocid="courses.edit_button"
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-destructive transition-smooth"
                        onClick={() => setDeleteTarget(cat)}
                        title="Delete"
                        data-ocid="courses.delete_button"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Full table view below cards */}
        {filtered.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Category Details
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    {columns.map((col, i) => (
                      <th
                        key={`${String(col.key)}-${i}`}
                        className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((row, _i) => (
                    <tr
                      key={String(row.id)}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      {columns.map((col, j) => (
                        <td
                          key={`${String(col.key)}-${j}`}
                          className="px-4 py-3"
                        >
                          {col.render
                            ? col.render(row)
                            : String(
                                (row as unknown as Record<string, unknown>)[
                                  col.key as string
                                ] ?? "",
                              )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(modal === "add" || modal === "edit") && (
        <Modal
          title={modal === "add" ? "Add Course Category" : "Edit Category"}
          onClose={() => {
            setModal(null);
            setSelected(null);
          }}
          size="sm"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setModal(null);
                  setSelected(null);
                }}
                disabled={saving}
                data-ocid="courses.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                data-ocid="courses.submit_button"
              >
                {saving
                  ? "Saving..."
                  : modal === "add"
                    ? "Add Category"
                    : "Save Changes"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="cat-name">Category Name *</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Technology, Business, Healthcare"
                className="mt-1"
                data-ocid="courses.name_input"
              />
            </div>
            <div>
              <Label htmlFor="cat-desc">Description</Label>
              <textarea
                id="cat-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Brief description of this category..."
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                data-ocid="courses.description_textarea"
              />
            </div>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-xs text-primary font-medium">
                💡 After creating a category, go to Team Management to assign a
                team. Leads with this category will be auto-routed.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Team Modal */}
      {assignTarget && (
        <AssignTeamModal
          category={assignTarget}
          teams={teams}
          saving={saving}
          onClose={() => setAssignTarget(null)}
          onAssign={handleAssignTeam}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Category"
          message={`Delete "${deleteTarget.name}"? This may affect leads and teams assigned to this category.`}
          confirmLabel="Delete Category"
          isLoading={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppLayout>
  );
}
