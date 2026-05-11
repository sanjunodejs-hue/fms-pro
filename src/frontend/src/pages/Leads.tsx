import { LeadStatus, Role, createActor } from "@/backend";
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
  Lead,
  TableColumn,
  Team,
  UserProfile,
} from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  Eye,
  MessageCircle,
  Plus,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const statusVariantMap: Record<LeadStatus, BadgeVariant> = {
  [LeadStatus.new_]: "new",
  [LeadStatus.followUp]: "followUp",
  [LeadStatus.converted]: "converted",
  [LeadStatus.dropped]: "dropped",
};

const fmtDate = (ts: bigint) =>
  new Date(Number(ts) / 1_000_000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const AVATAR_COLORS = [
  "bg-indigo-500/20 text-indigo-700",
  "bg-emerald-500/20 text-emerald-700",
  "bg-amber-500/20 text-amber-700",
  "bg-violet-500/20 text-violet-700",
  "bg-rose-500/20 text-rose-700",
  "bg-cyan-500/20 text-cyan-700",
];

function nameToColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++)
    h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

type StatusFilter = "all" | LeadStatus;

interface LeadForm {
  name: string;
  email: string;
  phone: string;
  courseId: string;
  source: string;
  notes: string;
}

interface AssignForm {
  teamId: string;
  counselorId: string;
}

interface ConvertForm {
  paymentType: "full" | "emi";
  emiMonths: string;
}

interface FollowUpForm {
  leadId: string;
  notes: string;
  nextFollowUpDate: string;
  reminderDate: string;
  type: "call" | "email" | "whatsapp";
}

const defaultLeadForm: LeadForm = {
  name: "",
  email: "",
  phone: "",
  courseId: "",
  source: "",
  notes: "",
};
const defaultFuForm: FollowUpForm = {
  leadId: "",
  notes: "",
  nextFollowUpDate: "",
  reminderDate: "",
  type: "call",
};
const dateToTs = (d: string) => BigInt(new Date(d).getTime()) * 1_000_000n;

export default function Leads() {
  const { role } = useAuth();
  const { actor, isFetching } = useActor(createActor);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modal, setModal] = useState<
    "add" | "edit" | "assign" | "transfer" | "convert" | "followup" | null
  >(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [leadForm, setLeadForm] = useState<LeadForm>(defaultLeadForm);
  const [assignForm, setAssignForm] = useState<AssignForm>({
    teamId: "",
    counselorId: "",
  });
  const [convertForm, setConvertForm] = useState<ConvertForm>({
    paymentType: "full",
    emiMonths: "3",
  });
  const [fuForm, setFuForm] = useState<FollowUpForm>(defaultFuForm);

  const { data: leads = [], isLoading: loadingLeads } = useQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLeads() as Promise<Lead[]>;
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
    queryKey: ["categories"],
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

  const { data: users = [] } = useQuery<UserProfile[]>({
    queryKey: ["allUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsers() as Promise<UserProfile[]>;
    },
    enabled: !!actor && !isFetching,
  });

  const courseMap = useMemo(
    () => new Map(courses.map((c) => [String(c.id), c])),
    [courses],
  );
  const catMap = useMemo(
    () => new Map(categories.map((c) => [String(c.id), c.name])),
    [categories],
  );

  const counselorsForTeam = useMemo(() => {
    if (!assignForm.teamId)
      return users.filter((u) => u.role?.toString() === "counselor");
    return users.filter(
      (u) => u.teamId && String(u.teamId) === assignForm.teamId,
    );
  }, [users, assignForm.teamId]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return leads;
    return leads.filter((l) => l.status === statusFilter);
  }, [leads, statusFilter]);

  const tabs: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "New", value: LeadStatus.new_ },
    { label: "Follow-up", value: LeadStatus.followUp },
    { label: "Converted", value: LeadStatus.converted },
    { label: "Dropped", value: LeadStatus.dropped },
  ];

  const canAdd =
    role === Role.admin || role === Role.teamHead || role === Role.counselor;
  const canAssign = role === Role.admin || role === Role.teamHead;
  const canTransfer = role === Role.admin;
  const canConvert =
    role === Role.admin || role === Role.teamHead || role === Role.counselor;
  const canDelete = role === Role.admin;
  const canAddFollowup =
    role === Role.admin || role === Role.teamHead || role === Role.counselor;

  const openAdd = () => {
    setLeadForm(defaultLeadForm);
    setSelectedLead(null);
    setModal("add");
  };

  const openEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setLeadForm({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      courseId: String(lead.courseId),
      source: lead.source,
      notes: lead.notes,
    });
    setModal("edit");
  };

  const openAssign = (lead: Lead) => {
    setSelectedLead(lead);
    setAssignForm({
      teamId: lead.teamId ? String(lead.teamId) : "",
      counselorId: lead.assignedTo ? lead.assignedTo.toString() : "",
    });
    setModal("assign");
  };

  const openTransfer = (lead: Lead) => {
    setSelectedLead(lead);
    setAssignForm({ teamId: "", counselorId: "" });
    setModal("transfer");
  };
  const openConvert = (lead: Lead) => {
    setSelectedLead(lead);
    setConvertForm({ paymentType: "full", emiMonths: "3" });
    setModal("convert");
  };
  const openFollowup = (lead: Lead) => {
    setSelectedLead(lead);
    setFuForm({ ...defaultFuForm, leadId: String(lead.id) });
    setModal("followup");
  };

  const closeModal = () => {
    setModal(null);
    setSelectedLead(null);
  };

  const handleSaveLead = async () => {
    if (!actor || !leadForm.name.trim() || !leadForm.courseId) return;
    setSaving(true);
    try {
      const courseId = BigInt(leadForm.courseId);
      if (modal === "add") {
        const res = await actor.addLead(
          leadForm.name.trim(),
          leadForm.email.trim(),
          leadForm.phone.trim(),
          courseId,
          leadForm.source.trim(),
          leadForm.notes.trim(),
        );
        if (res.__kind__ === "err") throw new Error(res.err);
        toast.success("Lead added successfully");
      } else if (modal === "edit" && selectedLead) {
        const res = await actor.updateLead(
          selectedLead.id,
          leadForm.name.trim(),
          leadForm.email.trim(),
          leadForm.phone.trim(),
          courseId,
          leadForm.source.trim(),
          leadForm.notes.trim(),
        );
        if (res.__kind__ === "err") throw new Error(res.err);
        toast.success("Lead updated");
      }
      await qc.invalidateQueries({ queryKey: ["leads"] });
      closeModal();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (
      !actor ||
      !selectedLead ||
      !assignForm.teamId ||
      !assignForm.counselorId
    )
      return;
    setSaving(true);
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const fn = modal === "transfer" ? actor.transferLead : actor.assignLead;
      const res = await fn(
        selectedLead.id,
        BigInt(assignForm.teamId),
        Principal.fromText(assignForm.counselorId),
      );
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success(
        modal === "transfer" ? "Lead transferred" : "Lead assigned",
      );
      await qc.invalidateQueries({ queryKey: ["leads"] });
      closeModal();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async () => {
    if (!actor || !selectedLead) return;
    setSaving(true);
    try {
      const { PaymentType } = await import("@/backend");
      const pType =
        convertForm.paymentType === "emi" ? PaymentType.emi : PaymentType.full;
      const emiMonths =
        convertForm.paymentType === "emi"
          ? BigInt(convertForm.emiMonths)
          : null;
      const res = await actor.convertLeadToStudent(
        selectedLead.id,
        pType,
        emiMonths,
      );
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success("Lead converted to student!");
      await qc.invalidateQueries({ queryKey: ["leads"] });
      await qc.invalidateQueries({ queryKey: ["students"] });
      closeModal();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAddFollowup = async () => {
    if (
      !actor ||
      !fuForm.leadId ||
      !fuForm.notes.trim() ||
      !fuForm.nextFollowUpDate
    )
      return;
    setSaving(true);
    try {
      const res = await actor.addFollowUp(
        BigInt(fuForm.leadId),
        fuForm.notes.trim(),
        dateToTs(fuForm.nextFollowUpDate),
        fuForm.reminderDate ? dateToTs(fuForm.reminderDate) : null,
      );
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success("Follow-up added");
      await qc.invalidateQueries({ queryKey: ["allFollowUps"] });
      closeModal();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add follow-up");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!actor || !deleteTarget) return;
    setSaving(true);
    try {
      const res = await actor.deleteLead(deleteTarget.id);
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success("Lead deleted");
      await qc.invalidateQueries({ queryKey: ["leads"] });
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const columns: TableColumn<Lead>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${nameToColor(row.name)}`}
          >
            {initials(row.name)}
          </div>
          <div className="min-w-0">
            <button
              type="button"
              className="text-sm font-semibold text-foreground hover:text-primary truncate text-left block"
              onClick={() => navigate(`/leads/${row.id}`)}
              data-ocid="leads.view_link"
            >
              {row.name}
            </button>
            <p className="text-xs text-muted-foreground truncate">
              {row.source}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (row) => (
        <span className="text-sm whitespace-nowrap">{row.phone}</span>
      ),
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-muted-foreground truncate max-w-[160px] block">
          {row.email}
        </span>
      ),
    },
    {
      key: "courseId",
      label: "Course",
      render: (row) => {
        const c = courseMap.get(String(row.courseId));
        const catName = c ? catMap.get(String(c.categoryId)) : undefined;
        return (
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate max-w-[140px]">
              {c?.name ?? "—"}
            </p>
            {catName && (
              <p className="text-xs text-muted-foreground">{catName}</p>
            )}
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
      key: "createdAt",
      label: "Added",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {fmtDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-smooth"
            onClick={() => navigate(`/leads/${row.id}`)}
            title="View"
            data-ocid="leads.view_button"
          >
            <Eye size={14} />
          </button>
          {canAddFollowup && row.status !== LeadStatus.converted && (
            <button
              type="button"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-amber-600 transition-smooth"
              onClick={() => openFollowup(row)}
              title="Add Follow-up"
              data-ocid="leads.followup_button"
            >
              <MessageCircle size={14} />
            </button>
          )}
          {canAssign && row.status !== LeadStatus.converted && (
            <button
              type="button"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-blue-600 transition-smooth"
              onClick={() => openAssign(row)}
              title="Assign"
              data-ocid="leads.assign_button"
            >
              <UserCheck size={14} />
            </button>
          )}
          {canTransfer && row.status !== LeadStatus.converted && (
            <button
              type="button"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-orange-500 transition-smooth"
              onClick={() => openTransfer(row)}
              title="Transfer"
              data-ocid="leads.transfer_button"
            >
              <ArrowRightLeft size={14} />
            </button>
          )}
          {canConvert &&
            row.status !== LeadStatus.converted &&
            row.status !== LeadStatus.dropped && (
              <button
                type="button"
                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-emerald-600 transition-smooth"
                onClick={() => openConvert(row)}
                title="Convert to Student"
                data-ocid="leads.convert_button"
              >
                <UserCheck size={14} />
              </button>
            )}
          {canDelete && (
            <button
              type="button"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-smooth"
              onClick={() => setDeleteTarget(row)}
              title="Delete"
              data-ocid="leads.delete_button"
            >
              <Trash2 size={14} />
            </button>
          )}
          {role === Role.admin && row.status !== LeadStatus.converted && (
            <button
              type="button"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-violet-600 transition-smooth"
              onClick={() => openEdit(row)}
              title="Edit"
              data-ocid="leads.edit_button"
            >
              <Eye size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const selectClass =
    "mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <AppLayout title="Leads">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">
              Leads
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage and track all incoming leads
            </p>
          </div>
          <div className="sm:ml-auto flex items-center gap-2">
            {canAdd && (
              <Button
                type="button"
                onClick={openAdd}
                className="gap-2"
                data-ocid="leads.add_button"
              >
                <Plus size={16} /> Add Lead
              </Button>
            )}
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-0.5 bg-muted/40 rounded-xl p-1 w-fit">
          {tabs.map((tab) => {
            const count =
              tab.value === "all"
                ? leads.length
                : leads.filter((l) => l.status === tab.value).length;
            return (
              <button
                key={tab.value}
                type="button"
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-smooth ${
                  statusFilter === tab.value
                    ? "bg-card text-foreground shadow-subtle"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setStatusFilter(tab.value)}
                data-ocid="leads.filter.tab"
              >
                {tab.label}
                <span
                  className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    statusFilter === tab.value
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <DataTable<Lead>
          columns={columns}
          data={filtered}
          loading={loadingLeads}
          pageSize={15}
          searchPlaceholder="Search by name, email or phone..."
          emptyMessage="No leads found. Add your first lead to get started."
          rowKey={(row) => String(row.id)}
          exportFileName="leads"
        />
      </div>

      {/* Add/Edit Modal */}
      {(modal === "add" || modal === "edit") && (
        <Modal
          title={
            modal === "add"
              ? "Add New Lead"
              : `Edit Lead — ${selectedLead?.name}`
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
                data-ocid="leads.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveLead}
                disabled={saving || !leadForm.name.trim() || !leadForm.courseId}
                data-ocid="leads.submit_button"
              >
                {saving
                  ? "Saving..."
                  : modal === "add"
                    ? "Add Lead"
                    : "Save Changes"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lead-name">Full Name *</Label>
                <Input
                  id="lead-name"
                  value={leadForm.name}
                  onChange={(e) =>
                    setLeadForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Rahul Sharma"
                  className="mt-1"
                  data-ocid="leads.name_input"
                />
              </div>
              <div>
                <Label htmlFor="lead-email">Email</Label>
                <Input
                  id="lead-email"
                  type="email"
                  value={leadForm.email}
                  onChange={(e) =>
                    setLeadForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="rahul@example.com"
                  className="mt-1"
                  data-ocid="leads.email_input"
                />
              </div>
              <div>
                <Label htmlFor="lead-phone">Phone</Label>
                <Input
                  id="lead-phone"
                  value={leadForm.phone}
                  onChange={(e) =>
                    setLeadForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="+91 99999 00000"
                  className="mt-1"
                  data-ocid="leads.phone_input"
                />
              </div>
              <div>
                <Label htmlFor="lead-source">Source</Label>
                <select
                  id="lead-source"
                  value={leadForm.source}
                  onChange={(e) =>
                    setLeadForm((f) => ({ ...f, source: e.target.value }))
                  }
                  className={selectClass}
                  data-ocid="leads.source_select"
                >
                  <option value="">Select source...</option>
                  {[
                    "Website",
                    "Referral",
                    "Google Ads",
                    "Facebook Ads",
                    "Instagram",
                    "LinkedIn",
                    "Cold Call",
                    "Walk-in",
                    "WhatsApp Campaign",
                    "SMS Campaign",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="lead-course">Course *</Label>
              <select
                id="lead-course"
                value={leadForm.courseId}
                onChange={(e) =>
                  setLeadForm((f) => ({ ...f, courseId: e.target.value }))
                }
                className={selectClass}
                data-ocid="leads.course_select"
              >
                <option value="">Select a course...</option>
                {courses.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="lead-notes">Notes</Label>
              <textarea
                id="lead-notes"
                value={leadForm.notes}
                onChange={(e) =>
                  setLeadForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Additional notes..."
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                data-ocid="leads.notes_textarea"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Add Follow-up Modal */}
      {modal === "followup" && selectedLead && (
        <Modal
          title={`Add Follow-up — ${selectedLead.name}`}
          onClose={closeModal}
          size="md"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={saving}
                data-ocid="leads.fu_cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddFollowup}
                disabled={
                  saving || !fuForm.notes.trim() || !fuForm.nextFollowUpDate
                }
                data-ocid="leads.fu_submit_button"
              >
                {saving ? "Adding..." : "Add Follow-up"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <Label>Follow-up Type</Label>
              <div className="flex gap-2 mt-2">
                {(["call", "email", "whatsapp"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-smooth ${
                      fuForm.type === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40"
                    }`}
                    onClick={() => setFuForm((f) => ({ ...f, type: t }))}
                    data-ocid={`leads.fu_type_${t}`}
                  >
                    {t === "call"
                      ? "📞 Call"
                      : t === "email"
                        ? "✉️ Email"
                        : "💬 WhatsApp"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="fu-notes">Notes *</Label>
              <textarea
                id="fu-notes"
                value={fuForm.notes}
                onChange={(e) =>
                  setFuForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="What was discussed? Next steps..."
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                data-ocid="leads.fu_notes_textarea"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fu-next-date">Next Follow-up Date *</Label>
                <Input
                  id="fu-next-date"
                  type="date"
                  value={fuForm.nextFollowUpDate}
                  onChange={(e) =>
                    setFuForm((f) => ({
                      ...f,
                      nextFollowUpDate: e.target.value,
                    }))
                  }
                  className="mt-1"
                  data-ocid="leads.fu_next_date_input"
                />
              </div>
              <div>
                <Label htmlFor="fu-reminder">Reminder Date</Label>
                <Input
                  id="fu-reminder"
                  type="date"
                  value={fuForm.reminderDate}
                  onChange={(e) =>
                    setFuForm((f) => ({ ...f, reminderDate: e.target.value }))
                  }
                  className="mt-1"
                  data-ocid="leads.fu_reminder_input"
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign / Transfer Modal */}
      {(modal === "assign" || modal === "transfer") && selectedLead && (
        <Modal
          title={
            modal === "assign"
              ? `Assign Lead — ${selectedLead.name}`
              : `Transfer Lead — ${selectedLead.name}`
          }
          onClose={closeModal}
          size="sm"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={saving}
                data-ocid="leads.assign_cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAssign}
                disabled={
                  saving || !assignForm.teamId || !assignForm.counselorId
                }
                data-ocid="leads.assign_confirm_button"
              >
                {saving
                  ? "Saving..."
                  : modal === "assign"
                    ? "Assign"
                    : "Transfer"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="assign-team">Team *</Label>
              <select
                id="assign-team"
                value={assignForm.teamId}
                onChange={(e) =>
                  setAssignForm((f) => ({
                    ...f,
                    teamId: e.target.value,
                    counselorId: "",
                  }))
                }
                className={selectClass}
                data-ocid="leads.assign_team_select"
              >
                <option value="">Select team...</option>
                {teams.map((t) => (
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
                value={assignForm.counselorId}
                onChange={(e) =>
                  setAssignForm((f) => ({ ...f, counselorId: e.target.value }))
                }
                className={selectClass}
                data-ocid="leads.assign_counselor_select"
              >
                <option value="">Select counselor...</option>
                {counselorsForTeam.map((u) => (
                  <option key={u.id.toString()} value={u.id.toString()}>
                    {u.name} — {u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* Convert Modal */}
      {modal === "convert" && selectedLead && (
        <Modal
          title={`Convert to Student — ${selectedLead.name}`}
          onClose={closeModal}
          size="sm"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={saving}
                data-ocid="leads.convert_cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConvert}
                disabled={saving}
                data-ocid="leads.convert_confirm_button"
              >
                {saving ? "Converting..." : "Convert to Student"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                Course fee for this enrollment:
              </p>
              <p className="text-lg font-bold text-foreground mt-1">
                {courseMap.get(String(selectedLead.courseId))
                  ? `₹${Number(courseMap.get(String(selectedLead.courseId))?.totalFee ?? 0).toLocaleString("en-IN")}`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {courseMap.get(String(selectedLead.courseId))?.name}
              </p>
            </div>
            <div>
              <Label>Payment Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {(["full", "emi"] as const).map((pt) => (
                  <label
                    key={pt}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-smooth ${
                      convertForm.paymentType === pt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value={pt}
                      checked={convertForm.paymentType === pt}
                      onChange={() =>
                        setConvertForm((f) => ({ ...f, paymentType: pt }))
                      }
                      className="sr-only"
                      data-ocid={`leads.payment_type_${pt}`}
                    />
                    <span className="text-sm font-semibold">
                      {pt === "full" ? "Full Payment" : "EMI Plan"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {convertForm.paymentType === "emi" && (
              <div>
                <Label htmlFor="emi-months">EMI Duration</Label>
                <select
                  id="emi-months"
                  value={convertForm.emiMonths}
                  onChange={(e) =>
                    setConvertForm((f) => ({ ...f, emiMonths: e.target.value }))
                  }
                  className={selectClass}
                  data-ocid="leads.emi_months_select"
                >
                  {[3, 6, 9, 12, 18].map((m) => (
                    <option key={m} value={String(m)}>
                      {m} months
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
          title="Delete Lead"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          confirmLabel="Delete Lead"
          isLoading={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppLayout>
  );
}
