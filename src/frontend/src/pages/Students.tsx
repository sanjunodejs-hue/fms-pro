/**
 * Students.tsx — Student List with avatar initials, category filter, full columns
 */
import { Role, StudentStatus, createActor } from "@/backend";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import type {
  BadgeVariant,
  Course,
  CourseCategory,
  Student,
  TableColumn,
} from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Eye, GraduationCap, Trash2, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const statusVariantMap: Record<StudentStatus, BadgeVariant> = {
  [StudentStatus.active]: "active",
  [StudentStatus.completed]: "completed",
  [StudentStatus.inactive]: "inactive",
};

const fmtAmount = (a: bigint) => `₹${Number(a).toLocaleString("en-IN")}`;
const fmtDate = (ts: bigint) =>
  new Date(Number(ts) / 1_000_000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const avatarColors = [
  "bg-primary/20 text-primary",
  "bg-emerald-500/20 text-emerald-700",
  "bg-amber-500/20 text-amber-700",
  "bg-violet-500/20 text-violet-700",
  "bg-sky-500/20 text-sky-700",
  "bg-rose-500/20 text-rose-700",
];

function getAvatarColor(id: bigint) {
  return avatarColors[Number(id) % avatarColors.length];
}

type StatusFilter = "all" | StudentStatus;
type CategoryFilter = "all" | string;

interface AssignCourseForm {
  courseId: string;
}

export default function Students() {
  const { role } = useAuth();
  const { actor, isFetching } = useActor(createActor);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [assignTarget, setAssignTarget] = useState<Student | null>(null);
  const [assignForm, setAssignForm] = useState<AssignCourseForm>({
    courseId: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ["students"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getStudents() as Promise<Student[]>;
    },
    enabled: !!actor && !isFetching,
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCourses() as Promise<Course[]>;
    },
    enabled: !!actor && !isFetching,
  });

  const { data: categories = [] } = useQuery<CourseCategory[]>({
    queryKey: ["courseCategories"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCourseCategories() as Promise<CourseCategory[]>;
    },
    enabled: !!actor && !isFetching,
  });

  const courseMap = useMemo(
    () => new Map(courses.map((c) => [String(c.id), c])),
    [courses],
  );

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [String(c.id), c.name])),
    [categories],
  );

  const filtered = useMemo(() => {
    let list = students;
    if (statusFilter !== "all")
      list = list.filter((s) => s.status === statusFilter);
    if (categoryFilter !== "all") {
      list = list.filter((s) => {
        const course = courseMap.get(String(s.courseId));
        return course && String(course.categoryId) === categoryFilter;
      });
    }
    return list;
  }, [students, statusFilter, categoryFilter, courseMap]);

  const statusTabs: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Active", value: StudentStatus.active },
    { label: "Completed", value: StudentStatus.completed },
    { label: "Inactive", value: StudentStatus.inactive },
  ];

  const canDelete = role === Role.admin;
  const canAssignCourse = role === Role.admin;

  const handleDelete = async () => {
    if (!actor || !deleteTarget) return;
    setSaving(true);
    try {
      const res = await actor.deleteStudent(deleteTarget.id);
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success("Student deleted");
      await qc.invalidateQueries({ queryKey: ["students"] });
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignCourse = async () => {
    if (!actor || !assignTarget || !assignForm.courseId) return;
    setSaving(true);
    try {
      const res = await actor.assignCourse(
        assignTarget.id,
        BigInt(assignForm.courseId),
      );
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success("Course assigned successfully");
      await qc.invalidateQueries({ queryKey: ["students"] });
      setAssignTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  // Summary stats
  const totalPaid = students.reduce((s, st) => s + st.paidAmount, 0n);
  const totalFees = students.reduce((s, st) => s + st.totalFee, 0n);

  const columns: TableColumn<Student>[] = [
    {
      key: "name",
      label: "Student",
      sortable: true,
      render: (row) => (
        <button
          type="button"
          className="flex items-center gap-2.5 text-left group"
          onClick={() => navigate(`/students/${row.id}`)}
          data-ocid="students.view_link"
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(row.id)}`}
          >
            {getInitials(row.name)}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-primary group-hover:underline truncate">
              {row.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {row.email}
            </p>
          </div>
        </button>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (row) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {row.phone}
        </span>
      ),
    },
    {
      key: "courseId",
      label: "Course",
      render: (row) => {
        const course = courseMap.get(String(row.courseId));
        const catName = course
          ? categoryMap.get(String(course.categoryId))
          : undefined;
        return (
          <div>
            <p className="text-sm text-foreground font-medium">
              {course?.name ?? "—"}
            </p>
            {catName && (
              <p className="text-xs text-muted-foreground">{catName}</p>
            )}
          </div>
        );
      },
    },
    {
      key: "paidAmount",
      label: "Fee Progress",
      render: (row) => {
        const pct =
          row.totalFee > 0n
            ? Math.round((Number(row.paidAmount) / Number(row.totalFee)) * 100)
            : 0;
        return (
          <div className="min-w-[120px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">
                {fmtAmount(row.paidAmount)}
              </span>
              <span className="text-xs text-muted-foreground">{pct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pct === 100
                    ? "bg-emerald-500"
                    : pct >= 50
                      ? "bg-primary"
                      : "bg-amber-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              of {fmtAmount(row.totalFee)}
            </p>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => <StatusBadge variant={statusVariantMap[row.status]} />,
    },
    {
      key: "enrolledAt",
      label: "Enrolled",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {fmtDate(row.enrolledAt)}
        </span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-smooth"
            onClick={() => navigate(`/students/${row.id}`)}
            title="View Profile"
            data-ocid="students.view_button"
          >
            <Eye size={14} />
          </button>
          {canAssignCourse && (
            <button
              type="button"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-blue-600 transition-smooth"
              onClick={() => {
                setAssignTarget(row);
                setAssignForm({ courseId: String(row.courseId) });
              }}
              title="Assign Course"
              data-ocid="students.assign_course_button"
            >
              <BookOpen size={14} />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-smooth"
              onClick={() => setDeleteTarget(row)}
              title="Delete Student"
              data-ocid="students.delete_button"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Students">
      <div className="space-y-4">
        {/* Summary stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total Students",
              value: String(students.length),
              color: "text-primary",
            },
            {
              label: "Active",
              value: String(
                students.filter((s) => s.status === StudentStatus.active)
                  .length,
              ),
              color: "text-emerald-600",
            },
            {
              label: "Total Fees",
              value: fmtAmount(totalFees),
              color: "text-foreground",
            },
            {
              label: "Total Collected",
              value: fmtAmount(totalPaid),
              color: "text-emerald-600",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-card border border-border rounded-xl px-4 py-3"
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-lg font-bold ${color} mt-0.5`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
          {statusTabs.map((tab) => {
            const count =
              tab.value === "all"
                ? students.length
                : students.filter((s) => s.status === tab.value).length;
            return (
              <button
                key={tab.value}
                type="button"
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  statusFilter === tab.value
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setStatusFilter(tab.value)}
                data-ocid="students.filter.tab"
              >
                {tab.label}
                <span className="ml-1.5 text-xs opacity-60">{count}</span>
              </button>
            );
          })}
          {/* Category filter dropdown */}
          {categories.length > 0 && (
            <div className="ml-auto pr-1 shrink-0">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 py-0 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                data-ocid="students.category_filter_select"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <DataTable<Student>
          columns={columns}
          data={filtered}
          loading={isLoading}
          pageSize={15}
          searchPlaceholder="Search by name, email or phone..."
          emptyMessage="No students found."
          rowKey={(row) => String(row.id)}
          exportFileName="students"
          actions={
            <div className="flex items-center gap-1.5">
              <GraduationCap size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {filtered.length} student{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>
          }
        />
      </div>

      {/* Assign Course Modal */}
      {assignTarget && (
        <Modal
          title={`Assign Course — ${assignTarget.name}`}
          onClose={() => setAssignTarget(null)}
          size="sm"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssignTarget(null)}
                disabled={saving}
                data-ocid="students.assign_cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAssignCourse}
                disabled={saving || !assignForm.courseId}
                data-ocid="students.assign_confirm_button"
              >
                {saving ? "Saving..." : "Assign Course"}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <Label htmlFor="assign-course">Select Course *</Label>
            <select
              id="assign-course"
              value={assignForm.courseId}
              onChange={(e) => setAssignForm({ courseId: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              data-ocid="students.assign_course_select"
            >
              <option value="">Select a course...</option>
              {courses.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {c.name} — {fmtAmount(c.totalFee)}
                </option>
              ))}
            </select>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Student"
          message={`Delete "${deleteTarget.name}"? This will remove all associated data and cannot be undone.`}
          confirmLabel="Delete Student"
          isLoading={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppLayout>
  );
}
