import { createActor } from "@/backend";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dummyReminders, dummyStudents, dummyUsers } from "@/data/dummyData";
import type { Reminder, Student, UserProfile } from "@/types";
import {
  ReminderRecipientType,
  ReminderStatus,
  ReminderTargetType,
} from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Calendar,
  Edit,
  Info,
  Mail,
  MessageCircle,
  Plus,
  RefreshCw,
  Send,
  Smartphone,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const fmt = (ts: bigint) =>
  new Date(Number(ts) / 1_000_000).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const targetTypeLabels: Record<string, string> = {
  emi: "EMI",
  followUp: "Follow-up",
  payment: "Payment",
};

const recipientLabels: Record<string, string> = {
  student: "Student",
  counselor: "Counselor",
  teamHead: "Team Head",
  admin: "Admin",
  accountant: "Accountant",
  all: "All",
};

const autoRules = [
  {
    icon: <Bell size={14} />,
    label: "EMI due 3 days before",
    description: "Sent to student + counselor via Email & WhatsApp",
    color: "text-amber-600",
  },
  {
    icon: <RefreshCw size={14} />,
    label: "Overdue EMI — daily at 9 AM",
    description: "Sent to student + team head until resolved",
    color: "text-destructive",
  },
  {
    icon: <Calendar size={14} />,
    label: "Follow-up on scheduled day",
    description: "Sent to counselor via WhatsApp + Email at 8 AM",
    color: "text-primary",
  },
  {
    icon: <Mail size={14} />,
    label: "Payment confirmed — receipt sent",
    description: "Auto-receipt emailed to student on accountant approval",
    color: "text-emerald-600",
  },
];

interface ReminderForm {
  targetType: string;
  targetId: string;
  message: string;
  scheduledDate: string;
  recipientType: string;
  channel: string;
}

type StatusFilter = "all" | "pending" | "sent" | "failed";

export default function Reminders() {
  const { actor, isFetching } = useActor(createActor);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Reminder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ReminderForm>({
    targetType: "emi",
    targetId: "",
    message: "",
    scheduledDate: "",
    recipientType: "all",
    channel: "email",
  });

  const { data: reminders = dummyReminders } = useQuery<Reminder[]>({
    queryKey: ["reminders"],
    queryFn: async () => {
      if (!actor) return dummyReminders;
      return actor.getReminders() as Promise<Reminder[]>;
    },
    enabled: !!actor && !isFetching,
  });

  const { data: students = dummyStudents } = useQuery<Student[]>({
    queryKey: ["students"],
    queryFn: async () => {
      if (!actor) return dummyStudents;
      return actor.getStudents() as Promise<Student[]>;
    },
    enabled: !!actor && !isFetching,
  });

  const { data: users = dummyUsers } = useQuery<UserProfile[]>({
    queryKey: ["users"],
    queryFn: async () => {
      if (!actor) return dummyUsers;
      return actor.getAllUsers() as Promise<UserProfile[]>;
    },
    enabled: !!actor && !isFetching,
  });

  const studentMap = useMemo(
    () => new Map(students.map((s) => [String(s.id), s])),
    [students],
  );

  const filtered = useMemo(() => {
    let list = [...reminders].sort(
      (a, b) => Number(b.scheduledAt) - Number(a.scheduledAt),
    );
    if (statusFilter !== "all") {
      list = list.filter((r) =>
        statusFilter === "pending"
          ? r.status === ReminderStatus.pending
          : statusFilter === "sent"
            ? r.status === ReminderStatus.sent
            : r.status === ReminderStatus.failed,
      );
    }
    return list;
  }, [reminders, statusFilter]);

  const statusTabs: { label: string; value: StatusFilter; count: number }[] = [
    { label: "All", value: "all", count: reminders.length },
    {
      label: "Pending",
      value: "pending",
      count: reminders.filter((r) => r.status === ReminderStatus.pending)
        .length,
    },
    {
      label: "Sent",
      value: "sent",
      count: reminders.filter((r) => r.status === ReminderStatus.sent).length,
    },
    {
      label: "Failed",
      value: "failed",
      count: reminders.filter((r) => r.status === ReminderStatus.failed).length,
    },
  ];

  const openEdit = (r: Reminder) => {
    setEditTarget(r);
    setForm({
      targetType: String(r.targetType),
      targetId: String(r.targetId),
      message: r.message,
      scheduledDate: new Date(Number(r.scheduledAt) / 1_000_000)
        .toISOString()
        .slice(0, 16),
      recipientType: String(r.recipientType),
      channel: "email",
    });
  };

  const resetForm = () =>
    setForm({
      targetType: "emi",
      targetId: "",
      message: "",
      scheduledDate: "",
      recipientType: "all",
      channel: "email",
    });

  const handleSave = async () => {
    if (!form.message.trim() || !form.scheduledDate) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    if (editTarget) {
      setEditTarget(null);
      toast.success("Reminder updated");
    } else {
      setShowAdd(false);
      toast.success("Reminder scheduled", {
        description: `Scheduled for ${new Date(form.scheduledDate).toLocaleString("en-IN")}.`,
      });
    }
    resetForm();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    setDeleteTarget(null);
    toast.success("Reminder deleted");
  };

  const handleSendNow = (r: Reminder) => {
    toast.success("Reminder dispatched!", {
      description: `Sent to ${recipientLabels[r.recipientType as unknown as string] ?? "all"} via email & WhatsApp.`,
    });
  };

  const getTargetLabel = (r: Reminder) => {
    if (
      r.targetType === ReminderTargetType.emi ||
      r.targetType === ReminderTargetType.payment
    ) {
      const student = studentMap.get(String(r.targetId));
      return student?.name ?? `#${r.targetId}`;
    }
    return `#${r.targetId}`;
  };

  const channelIcons: Record<string, React.ReactNode> = {
    email: <Mail size={13} />,
    whatsapp: <MessageCircle size={13} />,
    sms: <Smartphone size={13} />,
  };

  function ReminderFormFields() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="r-type">Type *</Label>
            <select
              id="r-type"
              value={form.targetType}
              onChange={(e) =>
                setForm((f) => ({ ...f, targetType: e.target.value }))
              }
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              data-ocid="reminders.type_select"
            >
              <option value="emi">EMI Due</option>
              <option value="followUp">Follow-up</option>
              <option value="payment">Payment</option>
            </select>
          </div>
          <div>
            <Label htmlFor="r-recipient">Send To *</Label>
            <select
              id="r-recipient"
              value={form.recipientType}
              onChange={(e) =>
                setForm((f) => ({ ...f, recipientType: e.target.value }))
              }
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              data-ocid="reminders.recipient_select"
            >
              <option value="all">All</option>
              <option value="student">Student</option>
              <option value="counselor">Counselor</option>
              <option value="teamHead">Team Head</option>
              <option value="admin">Admin</option>
              <option value="accountant">Accountant</option>
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="r-target">Target Student/User</Label>
          <select
            id="r-target"
            value={form.targetId}
            onChange={(e) =>
              setForm((f) => ({ ...f, targetId: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            data-ocid="reminders.target_select"
          >
            <option value="">Select target (optional)</option>
            <optgroup label="Students">
              {students.map((s) => (
                <option key={String(s.id)} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Users">
              {users.map((u) => (
                <option key={u.id.toText()} value={u.id.toText()}>
                  {u.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <Label htmlFor="r-msg">Message *</Label>
          <textarea
            id="r-msg"
            value={form.message}
            onChange={(e) =>
              setForm((f) => ({ ...f, message: e.target.value }))
            }
            rows={3}
            placeholder="Enter reminder message..."
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            data-ocid="reminders.message_textarea"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="r-date">Scheduled Date & Time *</Label>
            <Input
              id="r-date"
              type="datetime-local"
              value={form.scheduledDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, scheduledDate: e.target.value }))
              }
              className="mt-1"
              data-ocid="reminders.schedule_input"
            />
          </div>
          <div>
            <Label>Channel</Label>
            <div className="mt-1 flex gap-2">
              {["email", "whatsapp", "sms"].map((ch) => (
                <button
                  key={ch}
                  type="button"
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-smooth ${
                    form.channel === ch
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:bg-muted"
                  }`}
                  onClick={() => setForm((f) => ({ ...f, channel: ch }))}
                  data-ocid={`reminders.channel_${ch}`}
                >
                  {channelIcons[ch]} {ch.charAt(0).toUpperCase() + ch.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppLayout title="Reminders">
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-subtle">
          <div className="px-4 py-3 bg-muted/40 border-b border-border flex items-center gap-2">
            <Info size={15} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Automated Reminder Rules
            </h3>
            <span className="ml-auto text-xs text-muted-foreground">
              Always active
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {autoRules.map((rule) => (
              <div key={rule.label} className="px-4 py-3">
                <div
                  className={`flex items-center gap-1.5 mb-1 font-medium text-sm ${rule.color}`}
                >
                  {rule.icon} {rule.label}
                </div>
                <p className="text-xs text-muted-foreground">
                  {rule.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-1 flex-wrap">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-smooth flex items-center gap-1.5 ${
                  statusFilter === tab.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setStatusFilter(tab.value)}
                data-ocid="reminders.filter.tab"
              >
                {tab.label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${statusFilter === tab.value ? "bg-white/20" : "bg-border"}`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => {
              setShowAdd(true);
              resetForm();
            }}
            data-ocid="reminders.add_button"
          >
            <Plus size={14} /> Add Reminder
          </Button>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div
              className="bg-card border border-border rounded-xl p-10 text-center"
              data-ocid="reminders.empty_state"
            >
              <Bell
                size={32}
                className="mx-auto mb-2 text-muted-foreground opacity-40"
              />
              <p className="text-sm text-muted-foreground">
                No reminders found for this filter.
              </p>
            </div>
          ) : (
            filtered.map((r, i) => {
              const isPending = r.status === ReminderStatus.pending;
              const isFailed = r.status === ReminderStatus.failed;
              return (
                <div
                  key={String(r.id)}
                  className={`bg-card border rounded-xl p-4 shadow-subtle transition-smooth ${
                    isFailed
                      ? "border-destructive/20"
                      : isPending
                        ? "border-amber-400/30"
                        : "border-border"
                  }`}
                  data-ocid={`reminders.item.${i + 1}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${
                            String(r.targetType) === "emi"
                              ? "text-primary bg-primary/10 border-primary/20"
                              : String(r.targetType) === "followUp"
                                ? "text-amber-700 bg-amber-500/10 border-amber-500/20"
                                : "text-emerald-700 bg-emerald-500/10 border-emerald-500/20"
                          }`}
                        >
                          {targetTypeLabels[String(r.targetType)] ??
                            String(r.targetType)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          →{" "}
                          {recipientLabels[String(r.recipientType)] ??
                            String(r.recipientType)}
                        </span>
                        {getTargetLabel(r) !== `#${r.targetId}` && (
                          <span className="text-xs font-semibold text-foreground">
                            {getTargetLabel(r)}
                          </span>
                        )}
                        <StatusBadge
                          variant={
                            r.status === ReminderStatus.sent
                              ? "confirmed"
                              : r.status === ReminderStatus.failed
                                ? "rejected"
                                : "pending"
                          }
                          label={
                            r.status === ReminderStatus.sent
                              ? "Sent"
                              : r.status === ReminderStatus.failed
                                ? "Failed"
                                : "Pending"
                          }
                        />
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        {r.message}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} /> Scheduled: {fmt(r.scheduledAt)}
                        </span>
                        {r.sentAt && (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <Send size={11} /> Sent: {fmt(r.sentAt)}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Mail size={11} />
                          <MessageCircle size={11} />
                          <Smartphone size={11} /> All channels
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isPending && (
                        <button
                          type="button"
                          className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-smooth"
                          onClick={() => handleSendNow(r)}
                          title="Send now"
                          data-ocid={`reminders.send_now_button.${i + 1}`}
                          aria-label="Send reminder now"
                        >
                          <Send size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-blue-600 transition-smooth"
                        onClick={() => openEdit(r)}
                        title="Edit"
                        data-ocid={`reminders.edit_button.${i + 1}`}
                        aria-label="Edit reminder"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-smooth"
                        onClick={() => setDeleteTarget(r)}
                        title="Delete"
                        data-ocid={`reminders.delete_button.${i + 1}`}
                        aria-label="Delete reminder"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showAdd && (
        <Modal
          title="Add Reminder"
          onClose={() => {
            setShowAdd(false);
            resetForm();
          }}
          size="md"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAdd(false);
                  resetForm();
                }}
                disabled={saving}
                data-ocid="add_reminder.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.message.trim() || !form.scheduledDate}
                data-ocid="add_reminder.submit_button"
              >
                {saving ? "Scheduling..." : "Schedule Reminder"}
              </Button>
            </>
          }
        >
          <ReminderFormFields />
        </Modal>
      )}

      {editTarget && (
        <Modal
          title="Edit Reminder"
          onClose={() => {
            setEditTarget(null);
            resetForm();
          }}
          size="md"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditTarget(null);
                  resetForm();
                }}
                disabled={saving}
                data-ocid="edit_reminder.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.message.trim() || !form.scheduledDate}
                data-ocid="edit_reminder.submit_button"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          }
        >
          <ReminderFormFields />
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Reminder"
          message="Are you sure you want to delete this reminder? This cannot be undone."
          confirmLabel="Delete"
          isLoading={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppLayout>
  );
}
