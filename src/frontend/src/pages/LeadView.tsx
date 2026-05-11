/**
 * LeadView.tsx — Lead detail page with full action buttons, role-based visibility,
 * convert modal, assign/transfer modals, activity log section.
 */
import { LeadStatus, PaymentType, Role, createActor } from "@/backend";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import type {
  ActivityLog,
  BadgeVariant,
  Course,
  FollowUp,
  Lead,
  Team,
  UserProfile,
} from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  ArrowRightLeft,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle,
  Edit,
  GraduationCap,
  Mail,
  Phone,
  Plus,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const statusVariantMap: Record<LeadStatus, BadgeVariant> = {
  [LeadStatus.new_]: "new",
  [LeadStatus.followUp]: "followUp",
  [LeadStatus.converted]: "converted",
  [LeadStatus.dropped]: "dropped",
};

const fmtDate = (ts: bigint) =>
  new Date(Number(ts) / 1_000_000).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const dateToTs = (dateStr: string): bigint =>
  BigInt(new Date(dateStr).getTime()) * 1_000_000n;

const tsToDateInputValue = (ts: bigint): string => {
  const d = new Date(Number(ts) / 1_000_000);
  return d.toISOString().slice(0, 10);
};

interface FollowUpForm {
  notes: string;
  nextFollowUpDate: string;
  reminderDate: string;
}

interface AssignForm {
  teamId: string;
  counselorId: string;
}

interface ConvertForm {
  paymentType: "full" | "emi";
  emiMonths: string;
}

// ─── Assign Lead Modal ─────────────────────────────────────────────────────────
interface AssignModalProps {
  title: string;
  lead: Lead;
  teams: Team[];
  users: UserProfile[];
  saving: boolean;
  onClose: () => void;
  onConfirm: (form: AssignForm) => Promise<void>;
}

function AssignModal({
  title,
  teams,
  users,
  saving,
  onClose,
  onConfirm,
}: AssignModalProps) {
  const [form, setForm] = useState<AssignForm>({ teamId: "", counselorId: "" });
  const counselors = users.filter(
    (u) => u.role === Role.counselor || u.role === Role.teamHead,
  );
  return (
    <Modal
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            data-ocid="assign_modal.cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(form)}
            disabled={saving || !form.teamId || !form.counselorId}
            data-ocid="assign_modal.confirm_button"
          >
            {saving ? "Assigning..." : "Assign"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="assign-team">Team *</Label>
          <select
            id="assign-team"
            value={form.teamId}
            onChange={(e) => setForm((f) => ({ ...f, teamId: e.target.value }))}
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            data-ocid="assign_modal.team_select"
          >
            <option value="">Select team...</option>
            {teams
              .filter((t) => t.isActive)
              .map((t) => (
                <option key={String(t.id)} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <Label htmlFor="assign-counselor">Counselor *</Label>
          <select
            id="assign-counselor"
            value={form.counselorId}
            onChange={(e) =>
              setForm((f) => ({ ...f, counselorId: e.target.value }))
            }
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            data-ocid="assign_modal.counselor_select"
          >
            <option value="">Select counselor...</option>
            {counselors.map((u) => (
              <option key={u.id.toText()} value={u.id.toText()}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}

// ─── Convert to Student Modal ──────────────────────────────────────────────────
interface ConvertModalProps {
  lead: Lead;
  course: Course | undefined;
  saving: boolean;
  onClose: () => void;
  onConvert: (form: ConvertForm) => Promise<void>;
}

function ConvertModal({
  lead,
  course,
  saving,
  onClose,
  onConvert,
}: ConvertModalProps) {
  const [form, setForm] = useState<ConvertForm>({
    paymentType: "full",
    emiMonths: "6",
  });

  const fmtAmt = (a: bigint) => `₹${Number(a).toLocaleString("en-IN")}`;

  return (
    <Modal
      title="Convert Lead to Student"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            data-ocid="convert.cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onConvert(form)}
            disabled={saving}
            className="gap-1.5"
            data-ocid="convert.confirm_button"
          >
            <GraduationCap size={14} />
            {saving ? "Converting..." : "Convert to Student"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-muted/40">
          <p className="text-xs text-muted-foreground">Lead</p>
          <p className="text-sm font-semibold text-foreground">{lead.name}</p>
          {course && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {course.name} — {fmtAmt(course.totalFee)}
            </p>
          )}
        </div>

        <div>
          <Label>Payment Plan</Label>
          <div className="mt-2 space-y-2">
            {(
              [
                {
                  value: "full",
                  label: "Full Payment",
                  desc: course ? fmtAmt(course.totalFee) : "",
                },
                {
                  value: "emi",
                  label: "EMI Plan",
                  desc: "Split into installments",
                },
              ] as { value: "full" | "emi"; label: string; desc: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-smooth ${
                  form.paymentType === opt.value
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
                onClick={() =>
                  setForm((f) => ({ ...f, paymentType: opt.value }))
                }
                data-ocid={`convert.${opt.value}_option`}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="text-xs opacity-70">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {form.paymentType === "emi" && course && (
          <div>
            <Label htmlFor="emi-months">EMI Duration *</Label>
            <select
              id="emi-months"
              value={form.emiMonths}
              onChange={(e) =>
                setForm((f) => ({ ...f, emiMonths: e.target.value }))
              }
              className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              data-ocid="convert.emi_months_select"
            >
              {course.emiOptions.length > 0
                ? course.emiOptions.map((m) => (
                    <option key={String(m)} value={String(m)}>
                      {String(m)} months — {fmtAmt(course.totalFee / m)} / mo
                    </option>
                  ))
                : [3, 6, 12].map((m) => (
                    <option key={m} value={String(m)}>
                      {m} months
                    </option>
                  ))}
            </select>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          ⚠️ Student will inherit all lead details. An email with payment link
          will be sent automatically.
        </p>
      </div>
    </Modal>
  );
}

// ─── Edit Lead Modal ──────────────────────────────────────────────────────────────────
interface EditLeadModalProps {
  lead: Lead;
  courses: Course[];
  saving: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    email: string;
    phone: string;
    courseId: bigint;
    source: string;
    notes: string;
  }) => Promise<void>;
}

function EditLeadModal({
  lead,
  courses,
  saving,
  onClose,
  onSave,
}: EditLeadModalProps) {
  const [form, setForm] = useState({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    courseId: String(lead.courseId),
    source: lead.source,
    notes: lead.notes,
  });

  return (
    <Modal
      title="Edit Lead"
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            data-ocid="edit_lead.cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() =>
              onSave({
                name: form.name,
                email: form.email,
                phone: form.phone,
                courseId: BigInt(form.courseId),
                source: form.source,
                notes: form.notes,
              })
            }
            disabled={saving || !form.name.trim()}
            data-ocid="edit_lead.submit_button"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1"
              data-ocid="edit_lead.name_input"
            />
          </div>
          <div>
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              className="mt-1"
              data-ocid="edit_lead.email_input"
            />
          </div>
          <div>
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              className="mt-1"
              data-ocid="edit_lead.phone_input"
            />
          </div>
          <div>
            <Label htmlFor="edit-source">Source</Label>
            <Input
              id="edit-source"
              value={form.source}
              onChange={(e) =>
                setForm((f) => ({ ...f, source: e.target.value }))
              }
              className="mt-1"
              data-ocid="edit_lead.source_input"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="edit-course">Course</Label>
            <select
              id="edit-course"
              value={form.courseId}
              onChange={(e) =>
                setForm((f) => ({ ...f, courseId: e.target.value }))
              }
              className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              data-ocid="edit_lead.course_select"
            >
              {courses.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <textarea
              id="edit-notes"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              data-ocid="edit_lead.notes_textarea"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function LeadView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { actor, isFetching } = useActor(createActor);
  const qc = useQueryClient();

  const [showFuModal, setShowFuModal] = useState(false);
  const [editFu, setEditFu] = useState<FollowUp | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDropConfirm, setShowDropConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fuForm, setFuForm] = useState<FollowUpForm>({
    notes: "",
    nextFollowUpDate: "",
    reminderDate: "",
  });

  // ─ Queries ───────────────────────────────────────────────────────────────
  const { data: lead, isLoading } = useQuery<Lead | null>({
    queryKey: ["lead", id],
    queryFn: async () => {
      if (!actor || !id) return null;
      return actor.getLead(BigInt(id)) as Promise<Lead | null>;
    },
    enabled: !!actor && !isFetching && !!id,
  });

  const { data: followUps = [], isLoading: loadingFu } = useQuery<FollowUp[]>({
    queryKey: ["followUps", id],
    queryFn: async () => {
      if (!actor || !id) return [];
      return actor.getFollowUps(BigInt(id)) as Promise<FollowUp[]>;
    },
    enabled: !!actor && !isFetching && !!id,
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCourses() as Promise<Course[]>;
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

  const { data: users = [] } = useQuery<UserProfile[]>({
    queryKey: ["allUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsers() as Promise<UserProfile[]>;
    },
    enabled:
      !!actor && !isFetching && (role === Role.admin || role === Role.teamHead),
  });

  const { data: activityLogs = [] } = useQuery<ActivityLog[]>({
    queryKey: ["activityLogs"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActivityLogs(30n, 0n) as Promise<ActivityLog[]>;
    },
    enabled: !!actor && !isFetching,
  });

  const courseMap = new Map(courses.map((c) => [String(c.id), c]));
  const course = lead ? courseMap.get(String(lead.courseId)) : undefined;

  // Role-based permissions
  const canAddFollowUp =
    role === Role.admin || role === Role.teamHead || role === Role.counselor;
  const canAssign = role === Role.admin || role === Role.teamHead;
  const canConvert =
    role === Role.admin || role === Role.teamHead || role === Role.counselor;
  const canEdit = role === Role.admin || role === Role.teamHead;
  const canDrop = role === Role.admin || role === Role.teamHead;

  // ─ Follow-up handlers ──────────────────────────────────────────────────
  const openAddFu = () => {
    setEditFu(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFuForm({
      notes: "",
      nextFollowUpDate: tomorrow.toISOString().slice(0, 10),
      reminderDate: tomorrow.toISOString().slice(0, 10),
    });
    setShowFuModal(true);
  };

  const openEditFu = (fu: FollowUp) => {
    setEditFu(fu);
    setFuForm({
      notes: fu.notes,
      nextFollowUpDate: tsToDateInputValue(fu.nextFollowUpDate),
      reminderDate: fu.reminderDate ? tsToDateInputValue(fu.reminderDate) : "",
    });
    setShowFuModal(true);
  };

  const handleSaveFu = async () => {
    if (!actor || !id || !fuForm.notes.trim() || !fuForm.nextFollowUpDate)
      return;
    setSaving(true);
    try {
      const nextTs = dateToTs(fuForm.nextFollowUpDate);
      const reminderTs = fuForm.reminderDate
        ? dateToTs(fuForm.reminderDate)
        : null;
      if (editFu) {
        const res = await actor.updateFollowUp(
          editFu.id,
          fuForm.notes.trim(),
          nextTs,
          reminderTs,
        );
        if (res.__kind__ === "err") throw new Error(res.err);
        toast.success("Follow-up updated");
      } else {
        const res = await actor.addFollowUp(
          BigInt(id),
          fuForm.notes.trim(),
          nextTs,
          reminderTs,
        );
        if (res.__kind__ === "err") throw new Error(res.err);
        toast.success("Follow-up added");
      }
      await qc.invalidateQueries({ queryKey: ["followUps", id] });
      setShowFuModal(false);
      setEditFu(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFu = async (fuId: bigint) => {
    if (!actor) return;
    try {
      const res = await actor.deleteFollowUp(fuId);
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success("Follow-up deleted");
      await qc.invalidateQueries({ queryKey: ["followUps", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  // ─ Assign handler ────────────────────────────────────────────────────────────
  const handleAssign = async (form: AssignForm) => {
    if (!actor || !id || !form.teamId || !form.counselorId) return;
    setSaving(true);
    try {
      const fakePrincipal = {
        _isPrincipal: true,
        toText: () => form.counselorId,
      } as unknown as Parameters<typeof actor.assignLead>[2];
      const res = await actor.assignLead(
        BigInt(id),
        BigInt(form.teamId),
        fakePrincipal,
      );
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success("Lead assigned successfully");
      await qc.invalidateQueries({ queryKey: ["lead", id] });
      setShowAssignModal(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assignment failed");
    } finally {
      setSaving(false);
    }
  };

  // ─ Transfer handler ───────────────────────────────────────────────────────────
  const handleTransfer = async (form: AssignForm) => {
    if (!actor || !id || !form.teamId || !form.counselorId) return;
    setSaving(true);
    try {
      const fakePrincipal = {
        _isPrincipal: true,
        toText: () => form.counselorId,
      } as unknown as Parameters<typeof actor.transferLead>[2];
      const res = await actor.transferLead(
        BigInt(id),
        BigInt(form.teamId),
        fakePrincipal,
      );
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success("Lead transferred successfully");
      await qc.invalidateQueries({ queryKey: ["lead", id] });
      setShowTransferModal(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transfer failed");
    } finally {
      setSaving(false);
    }
  };

  // ─ Convert handler ───────────────────────────────────────────────────────────
  const handleConvert = async (form: ConvertForm) => {
    if (!actor || !id) return;
    setSaving(true);
    try {
      const payType =
        form.paymentType === "emi" ? PaymentType.emi : PaymentType.full;
      const emiMonths =
        form.paymentType === "emi" ? BigInt(form.emiMonths) : null;
      const res = await actor.convertLeadToStudent(
        BigInt(id),
        payType,
        emiMonths,
      );
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success("Lead converted to student successfully!");
      await qc.invalidateQueries({ queryKey: ["lead", id] });
      await qc.invalidateQueries({ queryKey: ["students"] });
      setShowConvertModal(false);
      navigate(`/students/${res.ok.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setSaving(false);
    }
  };

  // ─ Edit Lead handler ──────────────────────────────────────────────────────────
  const handleEditLead = async (data: {
    name: string;
    email: string;
    phone: string;
    courseId: bigint;
    source: string;
    notes: string;
  }) => {
    if (!actor || !id) return;
    setSaving(true);
    try {
      const res = await actor.updateLead(
        BigInt(id),
        data.name,
        data.email,
        data.phone,
        data.courseId,
        data.source,
        data.notes,
      );
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success("Lead updated");
      await qc.invalidateQueries({ queryKey: ["lead", id] });
      setShowEditModal(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  // ─ Drop Lead handler ──────────────────────────────────────────────────────────
  const handleDropLead = async () => {
    if (!actor || !id) return;
    setSaving(true);
    try {
      const res = await actor.updateLeadStatus(BigInt(id), LeadStatus.dropped);
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success("Lead marked as dropped");
      await qc.invalidateQueries({ queryKey: ["lead", id] });
      setShowDropConfirm(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  // Lead-related activity logs
  const leadActivityLogs = activityLogs.filter(
    (log) =>
      log.entityType === "Lead" &&
      log.entityId !== undefined &&
      id &&
      String(log.entityId) === id,
  );

  return (
    <AppLayout title="Lead Details">
      <div className="max-w-4xl space-y-5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate("/leads")}
          className="gap-2 -ml-1"
          data-ocid="lead_view.back_button"
        >
          <ArrowLeft size={16} />
          Back to Leads
        </Button>

        {isLoading ? (
          <LoadingSpinner />
        ) : !lead ? (
          <div
            className="text-center py-12 text-muted-foreground"
            data-ocid="lead_view.not_found"
          >
            Lead not found.
          </div>
        ) : (
          <>
            {/* Lead Header Card */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-subtle">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                    <User size={24} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {lead.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <StatusBadge variant={statusVariantMap[lead.status]} />
                      <span className="text-xs text-muted-foreground">
                        Added {fmtDate(lead.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons — role-based */}
                <div className="flex flex-wrap gap-2 shrink-0">
                  {canEdit && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowEditModal(true)}
                      className="gap-1.5"
                      data-ocid="lead_view.edit_button"
                    >
                      <Edit size={13} />
                      Edit
                    </Button>
                  )}
                  {canAssign &&
                    lead.status !== LeadStatus.converted &&
                    lead.status !== LeadStatus.dropped && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAssignModal(true)}
                          className="gap-1.5"
                          data-ocid="lead_view.assign_button"
                        >
                          <Users size={13} />
                          Assign
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowTransferModal(true)}
                          className="gap-1.5"
                          data-ocid="lead_view.transfer_button"
                        >
                          <ArrowRightLeft size={13} />
                          Transfer
                        </Button>
                      </>
                    )}
                  {canConvert && lead.status !== LeadStatus.converted && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setShowConvertModal(true)}
                      className="gap-1.5"
                      data-ocid="lead_view.convert_button"
                    >
                      <GraduationCap size={13} />
                      Convert
                    </Button>
                  )}
                  {lead.status === LeadStatus.converted && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-lg">
                      <CheckCircle size={13} />
                      Converted
                    </div>
                  )}
                </div>
              </div>

              {/* Lead info grid */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoItem
                  icon={<Mail size={14} />}
                  label="Email"
                  value={lead.email || "—"}
                />
                <InfoItem
                  icon={<Phone size={14} />}
                  label="Phone"
                  value={lead.phone || "—"}
                />
                <InfoItem
                  icon={<BookOpen size={14} />}
                  label="Course"
                  value={course?.name ?? "—"}
                />
                <InfoItem label="Source" value={lead.source || "—"} />
                <InfoItem
                  icon={<Calendar size={14} />}
                  label="Last Updated"
                  value={fmtDate(lead.updatedAt)}
                />
                {course && (
                  <InfoItem
                    label="Total Fees"
                    value={`₹${Number(course.totalFee).toLocaleString("en-IN")}`}
                  />
                )}
                {lead.notes && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm text-foreground bg-muted/40 rounded-lg px-3 py-2">
                      {lead.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Status Update — counselor/admin can mark follow-up */}
              {canDrop &&
                lead.status !== LeadStatus.dropped &&
                lead.status !== LeadStatus.converted && (
                  <div className="mt-4 pt-4 border-t border-border flex gap-2">
                    <button
                      type="button"
                      className="text-xs px-3 py-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-smooth font-medium"
                      onClick={() => setShowDropConfirm(true)}
                      data-ocid="lead_view.drop_button"
                    >
                      Mark as Dropped
                    </button>
                  </div>
                )}
            </div>

            {/* Follow-ups Section */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Bell size={15} className="text-primary" />
                  <span className="font-semibold text-sm text-foreground">
                    Follow-ups
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    {followUps.length}
                  </span>
                </div>
                {canAddFollowUp && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={openAddFu}
                    className="gap-1.5"
                    data-ocid="lead_view.add_followup_button"
                  >
                    <Plus size={14} />
                    Add Follow-up
                  </Button>
                )}
              </div>

              {loadingFu ? (
                <div className="py-8">
                  <LoadingSpinner />
                </div>
              ) : followUps.length === 0 ? (
                <div
                  className="py-10 text-center text-sm text-muted-foreground"
                  data-ocid="lead_view.followup_empty_state"
                >
                  No follow-ups yet. Add the first one.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {[...followUps]
                    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
                    .map((fu, i) => (
                      <div
                        key={String(fu.id)}
                        className="px-5 py-4 hover:bg-muted/20 transition-colors"
                        data-ocid={`lead_view.followup_item.${i + 1}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3 flex-1 min-w-0">
                            {/* Timeline dot */}
                            <div className="relative flex flex-col items-center">
                              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                              {i < followUps.length - 1 && (
                                <div className="w-0.5 flex-1 bg-border mt-1" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground">
                                {fu.notes}
                              </p>
                              <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar size={10} />
                                  Next: {fmtDate(fu.nextFollowUpDate)}
                                </span>
                                {fu.reminderDate && (
                                  <span className="flex items-center gap-1">
                                    <Bell size={10} />
                                    Reminder: {fmtDate(fu.reminderDate)}
                                  </span>
                                )}
                                <span>Added: {fmtDate(fu.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                          {canAddFollowUp && (
                            <div className="flex gap-1 shrink-0">
                              <button
                                type="button"
                                className="text-xs px-2 py-1 rounded hover:bg-muted text-muted-foreground transition-smooth"
                                onClick={() => openEditFu(fu)}
                                data-ocid={`lead_view.edit_followup_button.${i + 1}`}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="text-xs px-2 py-1 rounded hover:bg-muted text-destructive transition-smooth"
                                onClick={() => handleDeleteFu(fu.id)}
                                data-ocid={`lead_view.delete_followup_button.${i + 1}`}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Activity Log Section */}
            {leadActivityLogs.length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                  <Activity size={15} className="text-primary" />
                  <span className="font-semibold text-sm text-foreground">
                    Activity Log
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    {leadActivityLogs.length}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {leadActivityLogs.map((log, i) => (
                    <div
                      key={String(log.id)}
                      className="px-5 py-3 flex items-start gap-3 hover:bg-muted/20"
                      data-ocid={`lead_view.activity_item.${i + 1}`}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Activity size={11} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{log.details}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {log.action} · {fmtDate(log.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Follow-up Add/Edit Modal */}
      {showFuModal && (
        <Modal
          title={editFu ? "Edit Follow-up" : "Add Follow-up"}
          onClose={() => {
            setShowFuModal(false);
            setEditFu(null);
          }}
          size="sm"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowFuModal(false);
                  setEditFu(null);
                }}
                disabled={saving}
                data-ocid="lead_view.followup_cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveFu}
                disabled={
                  saving || !fuForm.notes.trim() || !fuForm.nextFollowUpDate
                }
                data-ocid="lead_view.followup_submit_button"
              >
                {saving
                  ? "Saving..."
                  : editFu
                    ? "Save Changes"
                    : "Add Follow-up"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="fu-notes">Notes *</Label>
              <textarea
                id="fu-notes"
                value={fuForm.notes}
                onChange={(e) =>
                  setFuForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Describe the follow-up..."
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                data-ocid="lead_view.followup_notes_textarea"
              />
            </div>
            <div>
              <Label htmlFor="fu-next">Next Follow-up Date *</Label>
              <Input
                id="fu-next"
                type="date"
                value={fuForm.nextFollowUpDate}
                onChange={(e) =>
                  setFuForm((f) => ({
                    ...f,
                    nextFollowUpDate: e.target.value,
                  }))
                }
                className="mt-1"
                data-ocid="lead_view.followup_next_date_input"
              />
            </div>
            <div>
              <Label htmlFor="fu-reminder">Reminder Date (optional)</Label>
              <Input
                id="fu-reminder"
                type="date"
                value={fuForm.reminderDate}
                onChange={(e) =>
                  setFuForm((f) => ({ ...f, reminderDate: e.target.value }))
                }
                className="mt-1"
                data-ocid="lead_view.followup_reminder_date_input"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Lead Modal */}
      {showAssignModal && lead && (
        <AssignModal
          title="Assign Lead"
          lead={lead}
          teams={teams}
          users={users}
          saving={saving}
          onClose={() => setShowAssignModal(false)}
          onConfirm={handleAssign}
        />
      )}

      {/* Transfer Lead Modal */}
      {showTransferModal && lead && (
        <AssignModal
          title="Transfer Lead to Another Team"
          lead={lead}
          teams={teams}
          users={users}
          saving={saving}
          onClose={() => setShowTransferModal(false)}
          onConfirm={handleTransfer}
        />
      )}

      {/* Convert Modal */}
      {showConvertModal && lead && (
        <ConvertModal
          lead={lead}
          course={course}
          saving={saving}
          onClose={() => setShowConvertModal(false)}
          onConvert={handleConvert}
        />
      )}

      {/* Edit Lead Modal */}
      {showEditModal && lead && (
        <EditLeadModal
          lead={lead}
          courses={courses}
          saving={saving}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditLead}
        />
      )}

      {/* Drop Confirm Dialog */}
      {showDropConfirm && (
        <ConfirmDialog
          title="Mark Lead as Dropped"
          message="Are you sure you want to mark this lead as dropped? This will update the lead status and cannot be undone easily."
          confirmLabel="Mark Dropped"
          variant="warning"
          isLoading={saving}
          onConfirm={handleDropLead}
          onCancel={() => setShowDropConfirm(false)}
        />
      )}
    </AppLayout>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-sm font-medium text-foreground mt-0.5 break-words">
        {value}
      </p>
    </div>
  );
}
