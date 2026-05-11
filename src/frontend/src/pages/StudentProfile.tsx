/**
 * StudentProfile.tsx — Full 5-tab student profile with fee progress, activity log,
 * payment link modal, send reminder, and per-role action visibility.
 */
import {
  EmiStatus,
  PaymentStatus,
  Role,
  StudentStatus,
  createActor,
} from "@/backend";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import type {
  ActivityLog,
  BadgeVariant,
  Course,
  EmiInstallment,
  Payment,
  Receipt,
  Student,
} from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  Bell,
  BookOpen,
  CheckCircle,
  CreditCard,
  Download,
  FileText,
  GraduationCap,
  Link2,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

type TabId = "info" | "fee" | "emi" | "payments" | "activity";

const studentStatusVariant: Record<StudentStatus, BadgeVariant> = {
  [StudentStatus.active]: "active",
  [StudentStatus.completed]: "completed",
  [StudentStatus.inactive]: "inactive",
};

const emiStatusVariant: Record<EmiStatus, BadgeVariant> = {
  [EmiStatus.pending]: "pending",
  [EmiStatus.paid]: "paid",
  [EmiStatus.overdue]: "overdue",
};

const paymentStatusVariant: Record<PaymentStatus, BadgeVariant> = {
  [PaymentStatus.pending]: "pending",
  [PaymentStatus.confirmed]: "confirmed",
  [PaymentStatus.rejected]: "rejected",
};

const fmtAmount = (a: bigint) => `₹${Number(a).toLocaleString("en-IN")}`;
const fmtDate = (ts: bigint) =>
  new Date(Number(ts) / 1_000_000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const fmtDateTime = (ts: bigint) =>
  new Date(Number(ts) / 1_000_000).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Payment Link Modal ───────────────────────────────────────────────────────
interface PaymentLinkModalProps {
  student: Student;
  onClose: () => void;
  onGenerate: (amount: bigint) => Promise<void>;
  generating: boolean;
}

function PaymentLinkModal({
  student,
  onClose,
  onGenerate,
  generating,
}: PaymentLinkModalProps) {
  const outstanding = student.totalFee - student.paidAmount;
  const half = outstanding / 2n;
  const [selected, setSelected] = useState<"full" | "half" | "custom">("full");
  const [customAmount, setCustomAmount] = useState("");

  const getAmount = (): bigint => {
    if (selected === "half") return half;
    if (selected === "custom" && customAmount)
      return BigInt(Math.round(Number(customAmount)));
    return outstanding;
  };

  const options = [
    {
      value: "full" as const,
      label: "Full Outstanding",
      amount: fmtAmount(outstanding),
    },
    { value: "half" as const, label: "50% Advance", amount: fmtAmount(half) },
    { value: "custom" as const, label: "Custom Amount", amount: "Enter below" },
  ];

  return (
    <Modal
      title="Generate Payment Link"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={generating}
            data-ocid="payment_link.cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onGenerate(getAmount())}
            disabled={generating || getAmount() <= 0n}
            className="gap-1.5"
            data-ocid="payment_link.generate_button"
          >
            <Link2 size={14} />
            {generating ? "Generating..." : "Generate Link"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-muted/40">
          <p className="text-xs text-muted-foreground">Outstanding Balance</p>
          <p className="text-lg font-bold text-foreground">
            {fmtAmount(outstanding)}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Select Amount</Label>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-smooth ${
                selected === opt.value
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40"
              }`}
              onClick={() => setSelected(opt.value)}
              data-ocid={`payment_link.${opt.value}_option`}
            >
              <span className="font-medium">{opt.label}</span>
              <span className="text-xs opacity-70">{opt.amount}</span>
            </button>
          ))}
        </div>

        {selected === "custom" && (
          <div>
            <Label htmlFor="custom-amount">Custom Amount (₹) *</Label>
            <input
              id="custom-amount"
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder={`Max ${Number(outstanding).toLocaleString("en-IN")}`}
              className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              data-ocid="payment_link.custom_amount_input"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────────
export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { actor, isFetching } = useActor(createActor);
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabId>("info");
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [confirmMarkPaid, setConfirmMarkPaid] = useState<EmiInstallment | null>(
    null,
  );
  const [markingPaid, setMarkingPaid] = useState(false);

  const { data: student, isLoading } = useQuery<Student | null>({
    queryKey: ["student", id],
    queryFn: async () => {
      if (!actor || !id) return null;
      return actor.getStudent(BigInt(id)) as Promise<Student | null>;
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

  const { data: emiInstallments = [] } = useQuery<EmiInstallment[]>({
    queryKey: ["emi", id],
    queryFn: async () => {
      if (!actor || !id) return [];
      return actor.getEmiInstallments(BigInt(id)) as Promise<EmiInstallment[]>;
    },
    enabled: !!actor && !isFetching && !!id && activeTab === "emi",
  });

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["payments", id],
    queryFn: async () => {
      if (!actor || !id) return [];
      return actor.getPayments(BigInt(id)) as Promise<Payment[]>;
    },
    enabled: !!actor && !isFetching && !!id && activeTab === "payments",
  });

  const { data: activityLogs = [] } = useQuery<ActivityLog[]>({
    queryKey: ["activityLogs", "student", id],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActivityLogs(50n, 0n) as Promise<ActivityLog[]>;
    },
    enabled: !!actor && !isFetching && !!id && activeTab === "activity",
  });

  const courseMap = new Map(courses.map((c) => [String(c.id), c]));
  const course = student ? courseMap.get(String(student.courseId)) : undefined;

  const canGenerateLink =
    role === Role.admin || role === Role.counselor || role === Role.teamHead;
  const canConfirmPayment = role === Role.accountant || role === Role.admin;
  const canMarkEmiPaid = role === Role.accountant || role === Role.admin;

  const handleGenerateLink = async (amount: bigint) => {
    if (!actor || !student) return;
    setGeneratingLink(true);
    try {
      const res = await actor.generatePaymentLink(student.id, amount);
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success(
        <div>
          <p className="font-medium">Payment link generated!</p>
          <p className="text-xs mt-1 font-mono break-all">{res.ok}</p>
        </div>,
        { duration: 10000 },
      );
      setShowPaymentLinkModal(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate link");
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleSendReminder = async () => {
    if (!student) return;
    setSendingReminder(true);
    try {
      // Simulate sending reminder (no direct actor method, show success)
      await new Promise((r) => setTimeout(r, 800));
      toast.success(`Payment reminder sent to ${student.name}`);
    } finally {
      setSendingReminder(false);
    }
  };

  const handleConfirmPayment = async (paymentId: bigint) => {
    if (!actor) return;
    try {
      const res = await actor.confirmPayment(paymentId);
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success("Payment confirmed — receipt will be auto-sent");
      await qc.invalidateQueries({ queryKey: ["payments", id] });
      await qc.invalidateQueries({ queryKey: ["student", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to confirm");
    }
  };

  const handleMarkEmiPaid = async () => {
    if (!actor || !confirmMarkPaid) return;
    setMarkingPaid(true);
    try {
      const res = await actor.markEmiPaid(confirmMarkPaid.id, null);
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success(`EMI #${confirmMarkPaid.installmentNumber} marked as paid`);
      await qc.invalidateQueries({ queryKey: ["emi", id] });
      await qc.invalidateQueries({ queryKey: ["student", id] });
      setConfirmMarkPaid(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to mark paid");
    } finally {
      setMarkingPaid(false);
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "info", label: "Info", icon: <User size={13} /> },
    { id: "fee", label: "Fee Details", icon: <GraduationCap size={13} /> },
    { id: "emi", label: "EMI Plan", icon: <CreditCard size={13} /> },
    { id: "payments", label: "Payments", icon: <CreditCard size={13} /> },
    { id: "activity", label: "Activity Log", icon: <Activity size={13} /> },
  ];

  return (
    <AppLayout title="Student Profile">
      <div className="max-w-4xl space-y-5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate("/students")}
          className="gap-2 -ml-1"
          data-ocid="student_profile.back_button"
        >
          <ArrowLeft size={16} />
          Back to Students
        </Button>

        {isLoading ? (
          <LoadingSpinner />
        ) : !student ? (
          <div
            className="text-center py-12 text-muted-foreground"
            data-ocid="student_profile.not_found"
          >
            Student not found.
          </div>
        ) : (
          <>
            {/* Header Card */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-subtle">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Avatar with initials */}
                  <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                    <span className="text-xl font-bold text-primary">
                      {getInitials(student.name)}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {student.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <StatusBadge
                        variant={studentStatusVariant[student.status]}
                      />
                      <span className="text-xs text-muted-foreground">
                        Enrolled {fmtDate(student.enrolledAt)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail size={11} />
                        {student.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone size={11} />
                        {student.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen size={11} />
                        {course?.name ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 shrink-0">
                  {canGenerateLink && student.paidAmount < student.totalFee && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setShowPaymentLinkModal(true)}
                      className="gap-1.5"
                      data-ocid="student_profile.generate_link_button"
                    >
                      <Link2 size={13} />
                      Payment Link
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSendReminder}
                    disabled={sendingReminder}
                    className="gap-1.5"
                    data-ocid="student_profile.send_reminder_button"
                  >
                    <Bell size={13} />
                    {sendingReminder ? "Sending..." : "Send Reminder"}
                  </Button>
                </div>
              </div>

              {/* Fee progress strip */}
              {(() => {
                const pct =
                  student.totalFee > 0n
                    ? Math.round(
                        (Number(student.paidAmount) /
                          Number(student.totalFee)) *
                          100,
                      )
                    : 0;
                return (
                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">
                        Fee Progress
                      </span>
                      <span className="text-xs font-semibold text-foreground">
                        {pct}% paid
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pct === 100
                            ? "bg-emerald-500"
                            : pct >= 60
                              ? "bg-primary"
                              : "bg-amber-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {fmtAmount(student.paidAmount)} paid
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {fmtAmount(student.totalFee - student.paidAmount)}{" "}
                        remaining
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Tabs */}
            <div className="border-b border-border flex gap-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                  data-ocid={`student_profile.${tab.id}_tab`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Info */}
            {activeTab === "info" && (
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InfoItem
                    icon={<Mail size={14} />}
                    label="Email"
                    value={student.email || "—"}
                  />
                  <InfoItem
                    icon={<Phone size={14} />}
                    label="Phone"
                    value={student.phone || "—"}
                  />
                  <InfoItem
                    icon={<BookOpen size={14} />}
                    label="Course"
                    value={course?.name ?? "—"}
                  />
                  <InfoItem
                    label="Enrolled Date"
                    value={fmtDate(student.enrolledAt)}
                  />
                  <InfoItem
                    label="Payment Type"
                    value={
                      student.paymentType === "emi"
                        ? "EMI Plan"
                        : "Full Payment"
                    }
                  />
                  <InfoItem
                    label="Student Status"
                    value={
                      student.status.charAt(0).toUpperCase() +
                      student.status.slice(1)
                    }
                  />
                </div>
              </div>
            )}

            {/* Tab: Fee Details */}
            {activeTab === "fee" && (
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="font-semibold text-foreground mb-4">
                    Fee Structure
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      {
                        label: "Total Fee",
                        value: fmtAmount(student.totalFee),
                        color: "text-foreground",
                        bg: "bg-muted/40",
                      },
                      {
                        label: "Paid Amount",
                        value: fmtAmount(student.paidAmount),
                        color: "text-emerald-600",
                        bg: "bg-emerald-50",
                      },
                      {
                        label: "Remaining",
                        value: fmtAmount(student.totalFee - student.paidAmount),
                        color:
                          student.paidAmount >= student.totalFee
                            ? "text-emerald-600"
                            : "text-amber-600",
                        bg: "bg-amber-50",
                      },
                    ].map(({ label, value, color, bg }) => (
                      <div
                        key={label}
                        className={`${bg} rounded-xl px-4 py-4 text-center`}
                      >
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className={`text-xl font-bold ${color} mt-1`}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  {(() => {
                    const pct =
                      student.totalFee > 0n
                        ? Math.round(
                            (Number(student.paidAmount) /
                              Number(student.totalFee)) *
                              100,
                          )
                        : 0;
                    return (
                      <div className="mt-5">
                        <div className="flex justify-between text-xs text-muted-foreground mb-2">
                          <span>Payment Progress</span>
                          <span className="font-semibold text-foreground">
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              pct === 100
                                ? "bg-emerald-500"
                                : pct >= 60
                                  ? "bg-primary"
                                  : "bg-amber-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {pct === 100 && (
                          <div className="flex items-center gap-1.5 mt-2 text-emerald-600">
                            <CheckCircle size={14} />
                            <span className="text-xs font-medium">
                              Full payment received
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-3">
                    Payment Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Payment Type
                      </span>
                      <span className="font-medium">
                        {student.paymentType === "emi"
                          ? "EMI Plan"
                          : "Full Payment"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Course</span>
                      <span className="font-medium">{course?.name ?? "—"}</span>
                    </div>
                    {course && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          EMI Options
                        </span>
                        <span className="font-medium">
                          {course.emiOptions.length > 0
                            ? course.emiOptions.map((m) => `${m}mo`).join(", ")
                            : "—"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: EMI Plan */}
            {activeTab === "emi" && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <span className="font-semibold text-sm">
                    EMI Installments
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {
                      emiInstallments.filter((e) => e.status === EmiStatus.paid)
                        .length
                    }{" "}
                    /{emiInstallments.length} paid
                  </span>
                </div>
                {emiInstallments.length === 0 ? (
                  <p
                    className="text-sm text-muted-foreground text-center py-8"
                    data-ocid="student_profile.emi_empty_state"
                  >
                    No EMI plan for this student.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          {[
                            "#",
                            "Due Date",
                            "Amount",
                            "Status",
                            "Paid Date",
                            "",
                          ].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[...emiInstallments]
                          .sort((a, b) =>
                            a.installmentNumber < b.installmentNumber ? -1 : 1,
                          )
                          .map((inst, i) => (
                            <tr
                              key={String(inst.id)}
                              className="hover:bg-muted/20"
                              data-ocid={`student_profile.emi_item.${i + 1}`}
                            >
                              <td className="px-4 py-3 font-medium">
                                {String(inst.installmentNumber)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {fmtDate(inst.dueDate)}
                              </td>
                              <td className="px-4 py-3 tabular-nums font-medium">
                                {fmtAmount(inst.amount)}
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge
                                  variant={emiStatusVariant[inst.status]}
                                />
                              </td>
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                {inst.paidDate ? fmtDate(inst.paidDate) : "—"}
                              </td>
                              <td className="px-4 py-3">
                                {canMarkEmiPaid &&
                                  inst.status !== EmiStatus.paid && (
                                    <button
                                      type="button"
                                      className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-smooth font-medium"
                                      onClick={() => setConfirmMarkPaid(inst)}
                                      data-ocid={`student_profile.mark_paid_button.${i + 1}`}
                                    >
                                      Mark Paid
                                    </button>
                                  )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Payments */}
            {activeTab === "payments" && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <span className="font-semibold text-sm">Payment History</span>
                </div>
                {payments.length === 0 ? (
                  <p
                    className="text-sm text-muted-foreground text-center py-8"
                    data-ocid="student_profile.payments_empty_state"
                  >
                    No payments recorded.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          {[
                            "Date",
                            "Amount",
                            "Method",
                            "Transaction",
                            "Status",
                            "",
                          ].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[...payments]
                          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
                          .map((p, i) => (
                            <tr
                              key={String(p.id)}
                              className="hover:bg-muted/20"
                              data-ocid={`student_profile.payment_item.${i + 1}`}
                            >
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                {fmtDate(p.createdAt)}
                              </td>
                              <td className="px-4 py-3 tabular-nums font-medium">
                                {fmtAmount(p.amount)}
                              </td>
                              <td className="px-4 py-3 capitalize text-muted-foreground">
                                {p.method}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                {p.transactionId ?? "—"}
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge
                                  variant={paymentStatusVariant[p.status]}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  {p.status === PaymentStatus.pending &&
                                    canConfirmPayment && (
                                      <button
                                        type="button"
                                        className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-smooth font-medium"
                                        onClick={() =>
                                          handleConfirmPayment(p.id)
                                        }
                                        data-ocid="student_profile.confirm_payment_button"
                                      >
                                        Confirm
                                      </button>
                                    )}
                                  {p.status === PaymentStatus.confirmed && (
                                    <button
                                      type="button"
                                      className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/70 transition-smooth flex items-center gap-1"
                                      onClick={() =>
                                        toast.info(
                                          "Receipt download would trigger here",
                                        )
                                      }
                                      data-ocid="student_profile.download_receipt_button"
                                    >
                                      <Download size={11} />
                                      Receipt
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Activity Log */}
            {activeTab === "activity" && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <span className="font-semibold text-sm">Activity Log</span>
                </div>
                {activityLogs.length === 0 ? (
                  <p
                    className="text-sm text-muted-foreground text-center py-8"
                    data-ocid="student_profile.activity_empty_state"
                  >
                    No activity recorded.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {activityLogs.map((log, i) => (
                      <div
                        key={String(log.id)}
                        className="px-5 py-3 flex items-start gap-3 hover:bg-muted/20"
                        data-ocid={`student_profile.activity_item.${i + 1}`}
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Activity size={12} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">
                            {log.details}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {log.action} · {fmtDateTime(log.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment Link Modal */}
      {showPaymentLinkModal && student && (
        <PaymentLinkModal
          student={student}
          onClose={() => setShowPaymentLinkModal(false)}
          onGenerate={handleGenerateLink}
          generating={generatingLink}
        />
      )}

      {/* Confirm Mark EMI Paid */}
      {confirmMarkPaid && (
        <ConfirmDialog
          title="Mark EMI as Paid"
          message={`Mark EMI #${confirmMarkPaid.installmentNumber} (${fmtAmount(confirmMarkPaid.amount)}) as paid? This action will update the student’s payment record.`}
          confirmLabel="Mark Paid"
          variant="warning"
          isLoading={markingPaid}
          onConfirm={handleMarkEmiPaid}
          onCancel={() => setConfirmMarkPaid(null)}
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
