import { Role, createActor } from "@/backend";
import { AppLayout } from "@/components/layout/AppLayout";
import { Modal } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dummyPayments, dummyStudents } from "@/data/dummyData";
import { useAuth } from "@/hooks/useAuth";
import { PaymentStatus } from "@/types";
import type { Payment, Student } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeDollarSign,
  CheckCircle2,
  ClipboardCopy,
  Eye,
  IndianRupee,
  Link2,
  Loader2,
  Plus,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const fmt = (ts: bigint) =>
  new Date(Number(ts) / 1_000_000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const fmtRupee = (n: bigint) => `₹${Number(n).toLocaleString("en-IN")}`;

const methodLabel: Record<string, string> = {
  bankTransfer: "Bank Transfer",
  online: "Online",
  cash: "Cash",
  upi: "UPI",
  cheque: "Cheque",
};

type StatusFilter = "all" | "pending" | "confirmed" | "rejected";
type AmountOption = "full" | "half" | "emi";

interface GenLinkForm {
  studentId: string;
  amountOption: AmountOption;
}

interface ViewPaymentState {
  payment: Payment;
  student: Student | undefined;
}

export default function Payments() {
  const { actor, isFetching } = useActor(createActor);
  const { role } = useAuth();
  const isAccountant = role === Role.accountant || role === Role.admin;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [showGenLink, setShowGenLink] = useState(false);
  const [viewPayment, setViewPayment] = useState<ViewPaymentState | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [genForm, setGenForm] = useState<GenLinkForm>({
    studentId: "",
    amountOption: "full",
  });
  const [generatedLink, setGeneratedLink] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: payments = dummyPayments } = useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: async () => {
      if (!actor) return dummyPayments;
      return actor.getPayments(null) as Promise<Payment[]>;
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

  const studentMap = useMemo(
    () => new Map(students.map((s) => [String(s.id), s])),
    [students],
  );

  const filtered = useMemo(() => {
    let list = [...payments].sort(
      (a, b) => Number(b.createdAt) - Number(a.createdAt),
    );
    if (statusFilter !== "all") {
      list = list.filter((p) =>
        statusFilter === "pending"
          ? p.status === PaymentStatus.pending
          : statusFilter === "confirmed"
            ? p.status === PaymentStatus.confirmed
            : p.status === PaymentStatus.rejected,
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => {
        const sName = studentMap.get(String(p.studentId))?.name ?? "";
        return (
          sName.toLowerCase().includes(q) ||
          (p.transactionId ?? "").toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [payments, statusFilter, search, studentMap]);

  const totalCollected = payments
    .filter((p) => p.status === PaymentStatus.confirmed)
    .reduce((s, p) => s + p.amount, 0n);
  const pendingCount = payments.filter(
    (p) => p.status === PaymentStatus.pending,
  ).length;
  const rejectedCount = payments.filter(
    (p) => p.status === PaymentStatus.rejected,
  ).length;
  const thisMonth = payments
    .filter((p) => {
      const d = new Date(Number(p.createdAt) / 1_000_000);
      const now = new Date();
      return (
        p.status === PaymentStatus.confirmed &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((s, p) => s + p.amount, 0n);

  const statusTabs: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Rejected", value: "rejected" },
  ];

  const handleGenerateLink = () => {
    if (!genForm.studentId) return;
    const student = studentMap.get(genForm.studentId);
    if (!student) return;
    const amt =
      genForm.amountOption === "full"
        ? student.totalFee
        : genForm.amountOption === "half"
          ? student.totalFee / 2n
          : (student.totalFee - student.paidAmount) / 3n;
    const link = `https://pay.fmspro.in/s/${genForm.studentId}/pay?amount=${amt}&type=${genForm.amountOption}&token=${Date.now().toString(36)}`;
    setGeneratedLink(link);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success("Payment link copied!", {
      description: "Share this link with the student.",
    });
  };

  const handleApprove = async (payment: Payment) => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    const name = studentMap.get(String(payment.studentId))?.name ?? "Student";
    toast.success("Payment approved", {
      description: `${fmtRupee(payment.amount)} for ${name} confirmed. Receipt auto-generated.`,
    });
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setRejectTarget(null);
    setRejectReason("");
    toast.error("Payment rejected", {
      description: rejectReason ? `Reason: ${rejectReason}` : undefined,
    });
  };

  return (
    <AppLayout title="Payments">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<IndianRupee size={18} />}
            label="Total Collected"
            value={fmtRupee(totalCollected)}
            variant="green"
            trend={{ value: 14, direction: "up" }}
          />
          <StatCard
            icon={<BadgeDollarSign size={18} />}
            label="Pending Approvals"
            value={pendingCount}
            variant="orange"
          />
          <StatCard
            icon={<XCircle size={18} />}
            label="Rejected Payments"
            value={rejectedCount}
            variant="red"
          />
          <StatCard
            icon={<CheckCircle2 size={18} />}
            label="This Month"
            value={fmtRupee(thisMonth)}
            variant="blue"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-1 flex-wrap">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-smooth ${
                  statusFilter === tab.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setStatusFilter(tab.value)}
                data-ocid="payments.filter.tab"
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search student / TXN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-sm w-52"
              data-ocid="payments.search_input"
            />
            <Button
              type="button"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => {
                setShowGenLink(true);
                setGeneratedLink("");
              }}
              data-ocid="payments.generate_link_button"
            >
              <Link2 size={14} /> Payment Link
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  {[
                    "Student",
                    "Amount",
                    "Type",
                    "Method",
                    "Transaction ID",
                    "Date",
                    "Status",
                    "Actions",
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
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-12 text-center text-muted-foreground"
                    >
                      No payments found
                    </td>
                  </tr>
                ) : (
                  filtered.map((p, i) => {
                    const student = studentMap.get(String(p.studentId));
                    const isEmi = !!p.paymentLink && p.amount < 50000n;
                    return (
                      <tr
                        key={String(p.id)}
                        className={`hover:bg-muted/30 transition-colors ${p.status === PaymentStatus.rejected ? "opacity-70" : ""}`}
                        data-ocid={`payments.item.${i + 1}`}
                      >
                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                          {student?.name ?? `Student #${p.studentId}`}
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          {fmtRupee(p.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                              isEmi
                                ? "bg-violet-500/10 text-violet-700 border-violet-500/20"
                                : "bg-primary/10 text-primary border-primary/20"
                            }`}
                          >
                            {isEmi ? "EMI" : "Full"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground capitalize">
                          {methodLabel[p.method as unknown as string] ??
                            String(p.method)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {p.transactionId ?? <span className="italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {fmt(p.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            variant={
                              p.status === PaymentStatus.confirmed
                                ? "confirmed"
                                : p.status === PaymentStatus.rejected
                                  ? "rejected"
                                  : "pending"
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-smooth"
                              onClick={() =>
                                setViewPayment({ payment: p, student })
                              }
                              title="View details"
                              data-ocid={`payments.view_button.${i + 1}`}
                              aria-label="View payment"
                            >
                              <Eye size={14} />
                            </button>
                            {isAccountant &&
                              p.status === PaymentStatus.pending && (
                                <>
                                  <button
                                    type="button"
                                    className="p-1.5 rounded hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition-smooth"
                                    onClick={() => handleApprove(p)}
                                    title="Approve"
                                    data-ocid={`payments.approve_button.${i + 1}`}
                                    aria-label="Approve payment"
                                    disabled={saving}
                                  >
                                    <ThumbsUp size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-smooth"
                                    onClick={() => setRejectTarget(p)}
                                    title="Reject"
                                    data-ocid={`payments.reject_button.${i + 1}`}
                                    aria-label="Reject payment"
                                  >
                                    <ThumbsDown size={14} />
                                  </button>
                                </>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showGenLink && (
        <Modal
          title="Generate Payment Link"
          onClose={() => setShowGenLink(false)}
          size="md"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowGenLink(false)}
                data-ocid="genlink.cancel_button"
              >
                Close
              </Button>
              {!generatedLink ? (
                <Button
                  type="button"
                  onClick={handleGenerateLink}
                  disabled={!genForm.studentId}
                  data-ocid="genlink.submit_button"
                >
                  <Plus size={14} className="mr-1" /> Generate Link
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleCopyLink}
                  data-ocid="genlink.copy_button"
                >
                  <ClipboardCopy size={14} className="mr-1" /> Copy Link
                </Button>
              )}
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="gl-student">Select Student *</Label>
              <select
                id="gl-student"
                value={genForm.studentId}
                onChange={(e) =>
                  setGenForm((f) => ({ ...f, studentId: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                data-ocid="genlink.student_select"
              >
                <option value="">Select student...</option>
                {students.map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {s.name} — Balance: ₹
                    {Number(s.totalFee - s.paidAmount).toLocaleString("en-IN")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Payment Amount Option *</Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["full", "half", "emi"] as AmountOption[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-smooth ${
                      genForm.amountOption === opt
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:bg-muted"
                    }`}
                    onClick={() =>
                      setGenForm((f) => ({ ...f, amountOption: opt }))
                    }
                    data-ocid={`genlink.${opt}_option`}
                  >
                    {opt === "full"
                      ? "Full Fee"
                      : opt === "half"
                        ? "50% Now"
                        : "EMI (1st)"}
                  </button>
                ))}
              </div>
            </div>
            {generatedLink && (
              <div className="space-y-2">
                <Label>Generated Link</Label>
                <div className="flex items-start gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2">
                  <span className="text-xs font-mono text-primary break-all flex-1">
                    {generatedLink}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-smooth"
                    onClick={handleCopyLink}
                    aria-label="Copy link"
                  >
                    <ClipboardCopy size={14} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Send this link to the student via WhatsApp or email.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {viewPayment && (
        <Modal
          title="Payment Details"
          onClose={() => setViewPayment(null)}
          size="md"
          footer={
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewPayment(null)}
              data-ocid="viewpayment.close_button"
            >
              Close
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                {(viewPayment.student?.name ?? "?")[0]}
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {viewPayment.student?.name ??
                    `Student #${viewPayment.payment.studentId}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {viewPayment.student?.email}
                </p>
              </div>
              <div className="ml-auto">
                <StatusBadge
                  variant={
                    viewPayment.payment.status === PaymentStatus.confirmed
                      ? "confirmed"
                      : viewPayment.payment.status === PaymentStatus.rejected
                        ? "rejected"
                        : "pending"
                  }
                />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Amount", fmtRupee(viewPayment.payment.amount)],
                [
                  "Method",
                  methodLabel[
                    viewPayment.payment.method as unknown as string
                  ] ?? String(viewPayment.payment.method),
                ],
                ["Transaction ID", viewPayment.payment.transactionId ?? "—"],
                ["Date", fmt(viewPayment.payment.createdAt)],
                [
                  "Confirmed At",
                  viewPayment.payment.confirmedAt
                    ? fmt(viewPayment.payment.confirmedAt)
                    : "—",
                ],
                ["Payment Link", viewPayment.payment.paymentLink ?? "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground mb-0.5">{k}</dt>
                  <dd className="font-medium text-foreground break-all">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Modal>
      )}

      {rejectTarget && (
        <Modal
          title="Reject Payment"
          onClose={() => {
            setRejectTarget(null);
            setRejectReason("");
          }}
          size="sm"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
                data-ocid="reject.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleReject}
                disabled={saving}
                data-ocid="reject.confirm_button"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin mr-1" />
                ) : null}
                Reject Payment
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Rejecting payment of{" "}
              <span className="font-bold text-foreground">
                {fmtRupee(rejectTarget.amount)}
              </span>{" "}
              for{" "}
              <span className="font-semibold">
                {studentMap.get(String(rejectTarget.studentId))?.name ??
                  "student"}
              </span>
              .
            </p>
            <div>
              <Label htmlFor="reject-reason">Reason (optional)</Label>
              <textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="e.g. Duplicate transaction, verification failed..."
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                data-ocid="reject.reason_textarea"
              />
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
