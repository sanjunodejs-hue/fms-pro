import { createActor } from "@/backend";
import { AppLayout } from "@/components/layout/AppLayout";
import { Modal } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dummyEmiInstallments, dummyStudents } from "@/data/dummyData";
import type { EmiInstallment, Student } from "@/types";
import { EmiStatus } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  IndianRupee,
  ListChecks,
  Plus,
  TrendingUp,
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

type StatusFilter = "all" | "paid" | "pending" | "overdue";

interface EmiFormState {
  studentId: string;
  totalFee: string;
  installments: string;
  startDate: string;
}

export default function Emi() {
  const { actor, isFetching } = useActor(createActor);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [studentFilter, setStudentFilter] = useState("");
  const [showGenerate, setShowGenerate] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [emiForm, setEmiForm] = useState<EmiFormState>({
    studentId: "",
    totalFee: "",
    installments: "3",
    startDate: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: installments = dummyEmiInstallments } = useQuery<
    EmiInstallment[]
  >({
    queryKey: ["emiInstallments"],
    queryFn: async () => {
      if (!actor) return dummyEmiInstallments;
      return actor.getEmiInstallments(null) as Promise<EmiInstallment[]>;
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
    let list = [...installments];
    if (statusFilter !== "all") {
      list = list.filter((i) =>
        statusFilter === "paid"
          ? i.status === EmiStatus.paid
          : statusFilter === "overdue"
            ? i.status === EmiStatus.overdue
            : i.status === EmiStatus.pending,
      );
    }
    if (studentFilter.trim()) {
      const q = studentFilter.toLowerCase();
      list = list.filter((i) =>
        (studentMap.get(String(i.studentId))?.name ?? "")
          .toLowerCase()
          .includes(q),
      );
    }
    return list;
  }, [installments, statusFilter, studentFilter, studentMap]);

  const totalActive = installments.filter(
    (i) => i.status !== EmiStatus.paid,
  ).length;
  const overdueCount = installments.filter(
    (i) => i.status === EmiStatus.overdue,
  ).length;
  const collected = installments
    .filter((i) => i.status === EmiStatus.paid)
    .reduce((s, i) => s + i.amount, 0n);
  const pending = installments
    .filter((i) => i.status !== EmiStatus.paid)
    .reduce((s, i) => s + i.amount, 0n);

  const byStudent = useMemo(() => {
    const map = new Map<string, EmiInstallment[]>();
    for (const inst of filtered) {
      const sid = String(inst.studentId);
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid)!.push(inst);
    }
    return Array.from(map.entries()).map(([sid, insts]) => ({
      sid,
      student: studentMap.get(sid),
      insts: [...insts].sort(
        (a, b) => Number(a.installmentNumber) - Number(b.installmentNumber),
      ),
    }));
  }, [filtered, studentMap]);

  const statusTabs: { label: string; value: StatusFilter; count: number }[] = [
    { label: "All", value: "all", count: installments.length },
    {
      label: "Paid",
      value: "paid",
      count: installments.filter((i) => i.status === EmiStatus.paid).length,
    },
    {
      label: "Pending",
      value: "pending",
      count: installments.filter((i) => i.status === EmiStatus.pending).length,
    },
    { label: "Overdue", value: "overdue", count: overdueCount },
  ];

  const handleGenerate = async () => {
    if (!emiForm.studentId || !emiForm.totalFee || !emiForm.startDate) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setShowGenerate(false);
    setEmiForm({
      studentId: "",
      totalFee: "",
      installments: "3",
      startDate: "",
    });
    toast.success("EMI plan generated!", {
      description: `${emiForm.installments} installments of ₹${Math.round(Number(emiForm.totalFee) / Number(emiForm.installments)).toLocaleString("en-IN")} scheduled.`,
    });
  };

  const handleMarkPaid = (inst: EmiInstallment) => {
    const name = studentMap.get(String(inst.studentId))?.name ?? "Student";
    toast.success(`EMI #${inst.installmentNumber} marked paid`, {
      description: `${name} — ${fmtRupee(inst.amount)}`,
    });
  };

  const handleReminder = (inst: EmiInstallment) => {
    const name = studentMap.get(String(inst.studentId))?.name ?? "Student";
    toast.info("Reminder sent!", {
      description: `EMI #${inst.installmentNumber} reminder sent to ${name} via email & WhatsApp.`,
    });
  };

  const emiInstPerMonth =
    emiForm.totalFee && emiForm.installments
      ? Math.round(Number(emiForm.totalFee) / Number(emiForm.installments))
      : 0;

  return (
    <AppLayout title="EMI Management">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<ListChecks size={18} />}
            label="Total Active"
            value={totalActive}
            variant="blue"
          />
          <StatCard
            icon={<AlertTriangle size={18} />}
            label="Overdue Count"
            value={overdueCount}
            variant="red"
          />
          <StatCard
            icon={<TrendingUp size={18} />}
            label="This Month Collected"
            value={fmtRupee(collected)}
            variant="green"
          />
          <StatCard
            icon={<IndianRupee size={18} />}
            label="Pending Amount"
            value={fmtRupee(pending)}
            variant="orange"
          />
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
                data-ocid="emi.filter.tab"
              >
                {tab.label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    statusFilter === tab.value ? "bg-white/20" : "bg-border"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Filter by student..."
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              className="h-9 text-sm w-48"
              data-ocid="emi.student_search_input"
            />
            <Button
              type="button"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => setShowGenerate(true)}
              data-ocid="emi.generate_plan_button"
            >
              <Plus size={14} /> Generate Plan
            </Button>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <Bell size={16} className="text-primary shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">Auto-reminders active: </span>
            EMI due 3 days before · Overdue daily at 9 AM · Payment confirmation
            on receipt
          </p>
        </div>

        <div className="space-y-3">
          {byStudent.length === 0 ? (
            <div
              className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground"
              data-ocid="emi.empty_state"
            >
              No EMI installments found
            </div>
          ) : (
            byStudent.map(({ sid, student, insts }, gi) => {
              const isExpanded =
                expandedStudent === sid || byStudent.length <= 4;
              const hasOverdue = insts.some(
                (i) => i.status === EmiStatus.overdue,
              );
              return (
                <div
                  key={sid}
                  className={`bg-card border rounded-xl overflow-hidden shadow-subtle transition-smooth ${
                    hasOverdue ? "border-destructive/30" : "border-border"
                  }`}
                  data-ocid={`emi.item.${gi + 1}`}
                >
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-smooth"
                    onClick={() =>
                      setExpandedStudent(
                        isExpanded && expandedStudent === sid ? null : sid,
                      )
                    }
                    data-ocid={`emi.student_toggle.${gi + 1}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {(student?.name ?? "?")[0]}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-foreground">
                          {student?.name ?? sid}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {insts.length} installments ·{" "}
                          {fmtRupee(insts.reduce((s, i) => s + i.amount, 0n))}{" "}
                          total
                        </p>
                      </div>
                      {hasOverdue && (
                        <span className="ml-2 text-xs bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded-full font-medium">
                          Overdue
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronDown
                        size={16}
                        className="text-muted-foreground"
                      />
                    ) : (
                      <ChevronRight
                        size={16}
                        className="text-muted-foreground"
                      />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="relative pl-6 space-y-2">
                        <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-border" />
                        {insts.map((inst, ii) => (
                          <div
                            key={String(inst.id)}
                            className="relative flex items-start gap-4"
                          >
                            <div
                              className={`absolute -left-6 mt-1 w-4 h-4 rounded-full border-2 ${
                                inst.status === EmiStatus.paid
                                  ? "bg-emerald-500 border-emerald-500"
                                  : inst.status === EmiStatus.overdue
                                    ? "bg-destructive border-destructive"
                                    : "bg-card border-amber-400"
                              }`}
                            />
                            <div
                              className={`flex-1 flex items-center justify-between p-3 rounded-lg border text-sm ${
                                inst.status === EmiStatus.overdue
                                  ? "bg-destructive/5 border-destructive/20"
                                  : inst.status === EmiStatus.paid
                                    ? "bg-emerald-50/50 border-emerald-200/50 dark:bg-emerald-500/5 dark:border-emerald-500/20"
                                    : "bg-muted/30 border-border"
                              }`}
                            >
                              <div className="flex flex-wrap items-center gap-4">
                                <span className="font-semibold text-foreground w-20">
                                  EMI #{String(inst.installmentNumber)}
                                </span>
                                <span className="font-bold text-foreground">
                                  {fmtRupee(inst.amount)}
                                </span>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Calendar size={12} />
                                  <span className="text-xs">
                                    Due: {fmt(inst.dueDate)}
                                  </span>
                                </div>
                                {inst.paidDate && (
                                  <div className="flex items-center gap-1 text-emerald-600">
                                    <CheckCircle2 size={12} />
                                    <span className="text-xs">
                                      Paid: {fmt(inst.paidDate)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <StatusBadge
                                  variant={
                                    inst.status === EmiStatus.paid
                                      ? "paid"
                                      : inst.status === EmiStatus.overdue
                                        ? "overdue"
                                        : "pending"
                                  }
                                />
                                {inst.status !== EmiStatus.paid && (
                                  <>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs gap-1"
                                      onClick={() => handleMarkPaid(inst)}
                                      data-ocid={`emi.mark_paid_button.${ii + 1}`}
                                    >
                                      <CheckCircle2 size={11} /> Mark Paid
                                    </Button>
                                    <button
                                      type="button"
                                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-smooth"
                                      onClick={() => handleReminder(inst)}
                                      title="Send reminder"
                                      data-ocid={`emi.reminder_button.${ii + 1}`}
                                      aria-label="Send reminder"
                                    >
                                      <Bell size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {showGenerate && (
        <Modal
          title="Generate EMI Plan"
          onClose={() => setShowGenerate(false)}
          size="md"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowGenerate(false)}
                disabled={saving}
                data-ocid="emi.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={
                  saving ||
                  !emiForm.studentId ||
                  !emiForm.totalFee ||
                  !emiForm.startDate
                }
                data-ocid="emi.submit_button"
              >
                {saving ? "Generating..." : "Generate Plan"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="emi-student">Student *</Label>
              <select
                id="emi-student"
                value={emiForm.studentId}
                onChange={(e) => {
                  const s = students.find(
                    (st) => String(st.id) === e.target.value,
                  );
                  setEmiForm((f) => ({
                    ...f,
                    studentId: e.target.value,
                    totalFee: s
                      ? String(s.totalFee - s.paidAmount)
                      : f.totalFee,
                  }));
                }}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                data-ocid="emi.student_select"
              >
                <option value="">Select student...</option>
                {students.map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {s.name} — Balance: {fmtRupee(s.totalFee - s.paidAmount)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="emi-fee">Total Fee Amount *</Label>
                <Input
                  id="emi-fee"
                  type="number"
                  value={emiForm.totalFee}
                  onChange={(e) =>
                    setEmiForm((f) => ({ ...f, totalFee: e.target.value }))
                  }
                  className="mt-1"
                  placeholder="85000"
                  data-ocid="emi.total_fee_input"
                />
              </div>
              <div>
                <Label htmlFor="emi-count">Number of Installments *</Label>
                <select
                  id="emi-count"
                  value={emiForm.installments}
                  onChange={(e) =>
                    setEmiForm((f) => ({ ...f, installments: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  data-ocid="emi.installments_select"
                >
                  {[3, 6, 9, 12, 18].map((n) => (
                    <option key={n} value={n}>
                      {n} months
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="emi-start">Start Date *</Label>
              <Input
                id="emi-start"
                type="date"
                value={emiForm.startDate}
                onChange={(e) =>
                  setEmiForm((f) => ({ ...f, startDate: e.target.value }))
                }
                className="mt-1"
                data-ocid="emi.start_date_input"
              />
            </div>
            {emiInstPerMonth > 0 && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 flex items-center gap-3">
                <CreditCard size={16} className="text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Monthly Installment: ₹
                    {emiInstPerMonth.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {emiForm.installments} × ₹
                    {emiInstPerMonth.toLocaleString("en-IN")} over{" "}
                    {emiForm.installments} months
                  </p>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
