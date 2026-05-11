import { createActor } from "@/backend";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import type { BadgeVariant, FollowUp, Lead } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Calendar,
  Edit,
  ExternalLink,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const fmtDate = (ts: bigint) =>
  new Date(Number(ts) / 1_000_000).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtDateShort = (ts: bigint) =>
  new Date(Number(ts) / 1_000_000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const dateToTs = (dateStr: string): bigint =>
  BigInt(new Date(dateStr).getTime()) * 1_000_000n;

const tsToDateInputValue = (ts: bigint): string =>
  new Date(Number(ts) / 1_000_000).toISOString().slice(0, 10);

type FuType = "call" | "email" | "whatsapp";

interface FuForm {
  leadId: string;
  notes: string;
  nextFollowUpDate: string;
  reminderDate: string;
  type: FuType;
}

type DateFilter = "all" | "today" | "upcoming" | "overdue";
type TypeFilter = "all" | FuType;

const typeIconMap: Record<FuType, React.ReactNode> = {
  call: <Phone size={12} />,
  email: <Mail size={12} />,
  whatsapp: <MessageCircle size={12} />,
};

const typeColorMap: Record<FuType, string> = {
  call: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  email: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  whatsapp: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
};

// Simple heuristic to detect follow-up type from notes
function detectType(notes: string): FuType {
  const lower = notes.toLowerCase();
  if (lower.includes("whatsapp") || lower.includes("wa ")) return "whatsapp";
  if (lower.includes("mail") || lower.includes("email")) return "email";
  return "call";
}

const reminderStatusBadge = (fu: FollowUp): BadgeVariant => {
  const nowTs = BigInt(Date.now()) * 1_000_000n;
  if (fu.nextFollowUpDate < nowTs) return "overdue";
  const twoDaysTs = BigInt(Date.now() + 2 * 86400000) * 1_000_000n;
  if (fu.nextFollowUpDate <= twoDaysTs) return "pending";
  return "active";
};

const defaultForm: FuForm = {
  leadId: "",
  notes: "",
  nextFollowUpDate: "",
  reminderDate: "",
  type: "call",
};

export default function FollowUps() {
  const { role } = useAuth();
  const { actor, isFetching } = useActor(createActor);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [editTarget, setEditTarget] = useState<FollowUp | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FollowUp | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [form, setForm] = useState<FuForm>(defaultForm);

  const { data: followUps = [], isLoading } = useQuery<FollowUp[]>({
    queryKey: ["allFollowUps"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFollowUps(null) as Promise<FollowUp[]>;
    },
    enabled: !!actor && !isFetching,
  });

  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLeads() as Promise<Lead[]>;
    },
    enabled: !!actor && !isFetching,
  });

  const leadMap = useMemo(
    () => new Map(leads.map((l) => [String(l.id), l])),
    [leads],
  );

  const now = Date.now();
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todayEnd = new Date().setHours(23, 59, 59, 999);

  const filtered = useMemo(() => {
    let items = [...followUps].sort((a, b) =>
      a.nextFollowUpDate < b.nextFollowUpDate ? -1 : 1,
    );
    switch (dateFilter) {
      case "today": {
        const s = BigInt(todayStart) * 1_000_000n;
        const e = BigInt(todayEnd) * 1_000_000n;
        items = items.filter(
          (fu) => fu.nextFollowUpDate >= s && fu.nextFollowUpDate <= e,
        );
        break;
      }
      case "upcoming":
        items = items.filter(
          (fu) => fu.nextFollowUpDate > BigInt(now) * 1_000_000n,
        );
        break;
      case "overdue":
        items = items.filter(
          (fu) => fu.nextFollowUpDate < BigInt(now) * 1_000_000n,
        );
        break;
    }
    if (typeFilter !== "all") {
      items = items.filter((fu) => detectType(fu.notes) === typeFilter);
    }
    return items;
  }, [followUps, dateFilter, typeFilter, now, todayStart, todayEnd]);

  const dateTabCounts = useMemo(
    () => ({
      all: followUps.length,
      today: followUps.filter((fu) => {
        const s = BigInt(todayStart) * 1_000_000n;
        const e = BigInt(todayEnd) * 1_000_000n;
        return fu.nextFollowUpDate >= s && fu.nextFollowUpDate <= e;
      }).length,
      upcoming: followUps.filter(
        (fu) => fu.nextFollowUpDate > BigInt(now) * 1_000_000n,
      ).length,
      overdue: followUps.filter(
        (fu) => fu.nextFollowUpDate < BigInt(now) * 1_000_000n,
      ).length,
    }),
    [followUps, now, todayStart, todayEnd],
  );

  const dateTabs: { label: string; value: DateFilter }[] = [
    { label: "All", value: "all" },
    { label: "Today", value: "today" },
    { label: "Upcoming", value: "upcoming" },
    { label: "Overdue", value: "overdue" },
  ];

  const canAdd =
    role?.toString() === "admin" ||
    role?.toString() === "teamHead" ||
    role?.toString() === "counselor";

  const openAdd = () => {
    setForm(defaultForm);
    setAddOpen(true);
  };

  const openEdit = (fu: FollowUp) => {
    setEditTarget(fu);
    setForm({
      leadId: String(fu.leadId),
      notes: fu.notes,
      nextFollowUpDate: tsToDateInputValue(fu.nextFollowUpDate),
      reminderDate: fu.reminderDate ? tsToDateInputValue(fu.reminderDate) : "",
      type: detectType(fu.notes),
    });
  };

  const handleSave = async (isEdit: boolean) => {
    if (!actor || !form.notes.trim() || !form.nextFollowUpDate) return;
    if (!isEdit && !form.leadId) return;
    setSaving(true);
    try {
      if (isEdit && editTarget) {
        const res = await actor.updateFollowUp(
          editTarget.id,
          form.notes.trim(),
          dateToTs(form.nextFollowUpDate),
          form.reminderDate ? dateToTs(form.reminderDate) : null,
        );
        if (res.__kind__ === "err") throw new Error(res.err);
        toast.success("Follow-up updated");
        setEditTarget(null);
      } else {
        const res = await actor.addFollowUp(
          BigInt(form.leadId),
          form.notes.trim(),
          dateToTs(form.nextFollowUpDate),
          form.reminderDate ? dateToTs(form.reminderDate) : null,
        );
        if (res.__kind__ === "err") throw new Error(res.err);
        toast.success("Follow-up added");
        setAddOpen(false);
      }
      await qc.invalidateQueries({ queryKey: ["allFollowUps"] });
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
      const res = await actor.deleteFollowUp(deleteTarget.id);
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success("Follow-up deleted");
      await qc.invalidateQueries({ queryKey: ["allFollowUps"] });
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const formContent = (isEdit: boolean) => (
    <div className="space-y-4">
      {!isEdit && (
        <div>
          <Label htmlFor="fu-lead">Lead *</Label>
          <select
            id="fu-lead"
            value={form.leadId}
            onChange={(e) => setForm((f) => ({ ...f, leadId: e.target.value }))}
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            data-ocid="followups.lead_select"
          >
            <option value="">Select lead...</option>
            {leads
              .filter((l) => l.status !== "converted" && l.status !== "dropped")
              .map((l) => (
                <option key={String(l.id)} value={String(l.id)}>
                  {l.name} — {l.phone}
                </option>
              ))}
          </select>
        </div>
      )}
      <div>
        <Label>Type</Label>
        <div className="flex gap-2 mt-2">
          {(["call", "email", "whatsapp"] as FuType[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-smooth ${
                form.type === t
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40"
              }`}
              onClick={() => setForm((f) => ({ ...f, type: t }))}
              data-ocid={`followups.type_${t}`}
            >
              {typeIconMap[t]}
              <span className="capitalize">{t}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="fu-notes">Notes *</Label>
        <textarea
          id="fu-notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="What was discussed? Next steps, commitments..."
          rows={3}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          data-ocid="followups.notes_textarea"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fu-next">Next Follow-up *</Label>
          <Input
            id="fu-next"
            type="date"
            value={form.nextFollowUpDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, nextFollowUpDate: e.target.value }))
            }
            className="mt-1"
            data-ocid="followups.next_date_input"
          />
        </div>
        <div>
          <Label htmlFor="fu-reminder">Reminder Date</Label>
          <Input
            id="fu-reminder"
            type="date"
            value={form.reminderDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, reminderDate: e.target.value }))
            }
            className="mt-1"
            data-ocid="followups.reminder_date_input"
          />
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout title="Follow-ups">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">
              Follow-ups
            </h1>
            <p className="text-xs text-muted-foreground">
              Track lead follow-ups and schedule reminders
            </p>
          </div>
          {canAdd && (
            <div className="sm:ml-auto">
              <Button
                type="button"
                onClick={openAdd}
                className="gap-2"
                data-ocid="followups.add_button"
              >
                <Plus size={16} /> Add Follow-up
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Date filter tabs */}
          <div className="flex gap-0.5 bg-muted/40 rounded-xl p-1">
            {dateTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-smooth ${
                  dateFilter === tab.value
                    ? "bg-card text-foreground shadow-subtle"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setDateFilter(tab.value)}
                data-ocid="followups.filter.tab"
              >
                {tab.label}
                <span
                  className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    dateFilter === tab.value
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {dateTabCounts[tab.value]}
                </span>
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div className="flex gap-1">
            {(["all", "call", "email", "whatsapp"] as TypeFilter[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-smooth ${
                  typeFilter === t
                    ? "bg-card border-primary/40 text-primary shadow-subtle"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
                onClick={() => setTypeFilter(t)}
                data-ocid={`followups.type_filter.${t}`}
              >
                {t !== "all" && typeIconMap[t as FuType]}
                <span className="capitalize">{t}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            message="No follow-ups found"
            description="Follow-ups will appear here as counselors add them to leads."
            icon={<Bell size={24} className="text-muted-foreground" />}
          />
        ) : (
          <div className="grid gap-3" data-ocid="followups.list">
            {filtered.map((fu, i) => {
              const lead = leadMap.get(String(fu.leadId));
              const fuType = detectType(fu.notes);
              const statusBadge = reminderStatusBadge(fu);
              const nowTs = BigInt(Date.now()) * 1_000_000n;
              const isOverdue = fu.nextFollowUpDate < nowTs;

              return (
                <div
                  key={String(fu.id)}
                  className={`bg-card border rounded-2xl p-4 transition-smooth hover:shadow-card ${
                    isOverdue ? "border-destructive/30" : "border-border"
                  }`}
                  data-ocid={`followups.item.${i + 1}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    {/* Type icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${typeColorMap[fuType]}`}
                    >
                      {typeIconMap[fuType]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {lead && (
                          <button
                            type="button"
                            className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
                            onClick={() => navigate(`/leads/${fu.leadId}`)}
                            data-ocid={`followups.lead_link.${i + 1}`}
                          >
                            {lead.name} <ExternalLink size={11} />
                          </button>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${typeColorMap[fuType]}`}
                        >
                          {typeIconMap[fuType]} {fuType}
                        </span>
                        <StatusBadge
                          variant={statusBadge}
                          label={
                            isOverdue
                              ? "Overdue"
                              : statusBadge === "pending"
                                ? "Due Soon"
                                : "Scheduled"
                          }
                        />
                      </div>

                      <p className="text-sm text-foreground">{fu.notes}</p>

                      <div className="flex flex-wrap gap-4 mt-2.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar
                            size={12}
                            className={
                              isOverdue
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }
                          />
                          <span
                            className={`text-xs ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}
                          >
                            Next: {fmtDate(fu.nextFollowUpDate)}
                            {isOverdue ? " ⚠️ Overdue" : ""}
                          </span>
                        </div>
                        {fu.reminderDate && (
                          <div className="flex items-center gap-1.5">
                            <Bell size={12} className="text-amber-500" />
                            <span className="text-xs text-muted-foreground">
                              Reminder: {fmtDateShort(fu.reminderDate)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-smooth"
                        onClick={() => openEdit(fu)}
                        title="Edit"
                        data-ocid={`followups.edit_button.${i + 1}`}
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-smooth"
                        onClick={() => setDeleteTarget(fu)}
                        title="Delete"
                        data-ocid={`followups.delete_button.${i + 1}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {addOpen && (
        <Modal
          title="Add Follow-up"
          onClose={() => setAddOpen(false)}
          size="md"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={saving}
                data-ocid="followups.add_cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleSave(false)}
                disabled={
                  saving ||
                  !form.notes.trim() ||
                  !form.nextFollowUpDate ||
                  !form.leadId
                }
                data-ocid="followups.add_submit_button"
              >
                {saving ? "Adding..." : "Add Follow-up"}
              </Button>
            </>
          }
        >
          {formContent(false)}
        </Modal>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <Modal
          title="Edit Follow-up"
          onClose={() => setEditTarget(null)}
          size="md"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
                disabled={saving}
                data-ocid="followups.edit_cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleSave(true)}
                disabled={
                  saving || !form.notes.trim() || !form.nextFollowUpDate
                }
                data-ocid="followups.edit_submit_button"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          }
        >
          {formContent(true)}
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Follow-up"
          message="Are you sure you want to delete this follow-up? This cannot be undone."
          confirmLabel="Delete"
          isLoading={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppLayout>
  );
}
