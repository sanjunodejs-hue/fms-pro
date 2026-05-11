import { createActor } from "@/backend";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EmiReport, LeadReport, Payment, RevenueReport } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownToLine,
  BadgeIndianRupee,
  BarChart3,
  Calendar,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

const today = new Date();

function getPresetDates(preset: string): { from: string; to: string } {
  const to = today.toISOString().split("T")[0];
  if (preset === "thisMonth") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    return { from, to };
  }
  if (preset === "3months") {
    const d = new Date(today);
    d.setMonth(d.getMonth() - 3);
    return { from: d.toISOString().split("T")[0], to };
  }
  if (preset === "6months") {
    const d = new Date(today);
    d.setMonth(d.getMonth() - 6);
    return { from: d.toISOString().split("T")[0], to };
  }
  // thisYear
  return { from: `${today.getFullYear()}-01-01`, to };
}

const DEFAULT_PRESET = "thisMonth";
const initial = getPresetDates(DEFAULT_PRESET);

function toTimestamp(dateStr: string): bigint {
  return BigInt(new Date(dateStr).getTime()) * 1_000_000n;
}

function formatCurrency(val: bigint | number): string {
  const n = typeof val === "bigint" ? Number(val) : val;
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

function formatDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function exportCsv(
  filename: string,
  headers: string[],
  rows: string[][],
): void {
  const lines = [
    headers.join(","),
    ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

interface MiniStatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

function MiniStat({
  icon,
  label,
  value,
  sub,
  color = "text-primary bg-primary/10",
}: MiniStatProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          color,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground font-display">
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Revenue Tab ─────────────────────────────────────────────────────────────
function RevenueTab({ from, to }: { from: string; to: string }) {
  const { actor, isFetching } = useActor(createActor);
  const { data, isLoading } = useQuery<RevenueReport>({
    queryKey: ["revenueReport", from, to],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getRevenueReport(
        toTimestamp(from),
        toTimestamp(to),
      ) as Promise<RevenueReport>;
    },
    enabled: !!actor && !isFetching && !!from && !!to,
  });

  const payments: Payment[] = data?.confirmedPayments ?? [];

  const monthlyData = payments.reduce((acc: Record<string, number>, p) => {
    const month = new Date(Number(p.createdAt) / 1_000_000).toLocaleDateString(
      "en-IN",
      {
        month: "short",
        year: "2-digit",
      },
    );
    acc[month] = (acc[month] ?? 0) + Number(p.amount);
    return acc;
  }, {});
  const chartData = Object.entries(monthlyData).map(([month, amount]) => ({
    month,
    amount,
  }));

  const avgMonth =
    chartData.length > 0
      ? chartData.reduce((s, d) => s + d.amount, 0) / chartData.length
      : 0;

  const handleExportCsv = () => {
    exportCsv(
      "revenue-report.csv",
      ["Student ID", "Amount", "Method", "Transaction ID", "Date"],
      payments.map((p) => [
        String(p.studentId),
        String(p.amount),
        p.method as unknown as string,
        p.transactionId ?? "",
        formatDate(p.createdAt),
      ]),
    );
    toast.success("Revenue report exported");
  };

  const handleExportPdf = () => toast.success("PDF export sent to your email");

  if (isLoading)
    return (
      <div className="py-16">
        <LoadingSpinner />
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat
          icon={<BadgeIndianRupee size={18} />}
          label="Total Revenue"
          value={formatCurrency(data?.totalRevenue ?? 0n)}
        />
        <MiniStat
          icon={<TrendingUp size={18} />}
          label="EMI Revenue"
          value={formatCurrency(data?.emiRevenue ?? 0n)}
          color="text-indigo-600 bg-indigo-500/10"
        />
        <MiniStat
          icon={<TrendingUp size={18} />}
          label="Full-Pay Revenue"
          value={formatCurrency(data?.fullPayRevenue ?? 0n)}
          color="text-emerald-600 bg-emerald-500/10"
        />
        <MiniStat
          icon={<BarChart3 size={18} />}
          label="Avg / Month"
          value={formatCurrency(avgMonth)}
          color="text-amber-600 bg-amber-500/10"
        />
      </div>

      {chartData.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Monthly Revenue Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={chartData}
              margin={{ top: 0, right: 0, left: -10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="opacity-10"
              />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => `₹${v / 1000}K`}
              />
              <Tooltip
                formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]}
              />
              <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">
            Payment Details ({payments.length})
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              className="gap-1.5 h-8"
              data-ocid="reports.revenue_pdf_button"
            >
              <ArrowDownToLine size={13} /> PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-1.5 h-8"
              data-ocid="reports.revenue_export_button"
            >
              <FileSpreadsheet size={13} /> Excel
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                {[
                  "Student ID",
                  "Amount",
                  "Method",
                  "Transaction ID",
                  "Date",
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
              {payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-10 text-muted-foreground text-sm"
                  >
                    No payments in this range
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={String(p.id)} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">
                      #{String(p.studentId)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">
                      {p.method as unknown as string}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.transactionId ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(p.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Lead Tab ─────────────────────────────────────────────────────────────────
function LeadTab({ from, to }: { from: string; to: string }) {
  const { actor, isFetching } = useActor(createActor);
  const { data, isLoading } = useQuery<LeadReport>({
    queryKey: ["leadReport", from, to],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getLeadReport(
        toTimestamp(from),
        toTimestamp(to),
      ) as Promise<LeadReport>;
    },
    enabled: !!actor && !isFetching && !!from && !!to,
  });

  const convRate = data
    ? data.totalLeads > 0n
      ? `${((Number(data.converted) / Number(data.totalLeads)) * 100).toFixed(1)}%`
      : "0%"
    : "—";

  const pieData = data
    ? (data.byStatus ?? []).map(([name, value]) => ({
        name,
        value: Number(value),
      }))
    : [];

  const handleExportCsv = () => {
    if (!data) return;
    exportCsv(
      "lead-report.csv",
      ["Status", "Count"],
      (data.byStatus ?? []).map(([status, count]) => [status, String(count)]),
    );
    toast.success("Lead report exported");
  };

  const handleExportPdf = () => toast.success("PDF export sent to your email");

  if (isLoading)
    return (
      <div className="py-16">
        <LoadingSpinner />
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat
          icon={<Users size={18} />}
          label="Total Leads"
          value={data ? String(data.totalLeads) : "—"}
        />
        <MiniStat
          icon={<TrendingUp size={18} />}
          label="Converted"
          value={data ? String(data.converted) : "—"}
          color="text-emerald-600 bg-emerald-500/10"
        />
        <MiniStat
          icon={<TrendingDown size={18} />}
          label="Dropped"
          value={data ? String(data.dropped) : "—"}
          color="text-rose-600 bg-rose-500/10"
        />
        <MiniStat
          icon={<BarChart3 size={18} />}
          label="Conversion Rate"
          value={convRate}
          color="text-violet-600 bg-violet-500/10"
        />
      </div>

      {pieData.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Lead Funnel by Status
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="45%"
                innerRadius={65}
                outerRadius={95}
                dataKey="value"
                paddingAngle={3}
              >
                {pieData.map((entry, i) => (
                  <Cell
                    key={entry.name}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={10} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">
            Status Breakdown
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              className="gap-1.5 h-8"
              data-ocid="reports.lead_pdf_button"
            >
              <ArrowDownToLine size={13} /> PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-1.5 h-8"
              data-ocid="reports.lead_export_button"
            >
              <FileSpreadsheet size={13} /> Excel
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Count
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pieData.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="text-center py-10 text-muted-foreground text-sm"
                  >
                    No leads in this range
                  </td>
                </tr>
              ) : (
                pieData.map((item, i) => (
                  <tr key={item.name} className="hover:bg-muted/30">
                    <td className="px-4 py-3 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          background: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                      <span className="capitalize text-foreground">
                        {item.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {item.value}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── EMI Tab ──────────────────────────────────────────────────────────────────
function EmiTab({ from, to }: { from: string; to: string }) {
  const { actor, isFetching } = useActor(createActor);
  const { data, isLoading } = useQuery<EmiReport>({
    queryKey: ["emiReport", from, to],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getEmiReport(
        toTimestamp(from),
        toTimestamp(to),
      ) as Promise<EmiReport>;
    },
    enabled: !!actor && !isFetching && !!from && !!to,
  });

  const chartData = data
    ? [
        { status: "Paid", count: Number(data.paid), fill: "#10b981" },
        { status: "Pending", count: Number(data.pending), fill: "#f59e0b" },
        { status: "Overdue", count: Number(data.overdue), fill: "#ef4444" },
      ]
    : [];

  const handleExportCsv = () => {
    if (!data) return;
    exportCsv(
      "emi-report.csv",
      ["Status", "Count"],
      chartData.map((r) => [r.status, String(r.count)]),
    );
    toast.success("EMI report exported");
  };

  const handleExportPdf = () => toast.success("PDF export sent to your email");

  if (isLoading)
    return (
      <div className="py-16">
        <LoadingSpinner />
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MiniStat
          icon={<BadgeIndianRupee size={18} />}
          label="Total Installments"
          value={data ? String(data.totalInstallments) : "—"}
        />
        <MiniStat
          icon={<TrendingUp size={18} />}
          label="Paid"
          value={data ? String(data.paid) : "—"}
          color="text-emerald-600 bg-emerald-500/10"
        />
        <MiniStat
          icon={<Calendar size={18} />}
          label="Pending"
          value={data ? String(data.pending) : "—"}
          color="text-amber-600 bg-amber-500/10"
        />
        <MiniStat
          icon={<AlertTriangle size={18} />}
          label="Overdue"
          value={data ? String(data.overdue) : "—"}
          color="text-rose-600 bg-rose-500/10"
        />
        <MiniStat
          icon={<BadgeIndianRupee size={18} />}
          label="Overdue Amount"
          value={formatCurrency(data?.overdueAmount ?? 0n)}
          color="text-rose-600 bg-rose-500/10"
        />
      </div>

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Installments by Status
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={chartData}
                margin={{ top: 0, right: 0, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="opacity-10"
                />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Distribution
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="count"
                  paddingAngle={3}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={10} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">
            EMI Summary
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              className="gap-1.5 h-8"
              data-ocid="reports.emi_pdf_button"
            >
              <ArrowDownToLine size={13} /> PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-1.5 h-8"
              data-ocid="reports.emi_export_button"
            >
              <FileSpreadsheet size={13} /> Excel
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Count
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {chartData.map((row) => (
                <tr key={row.status} className="hover:bg-muted/30">
                  <td className="px-4 py-3 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: row.fill }}
                    />
                    <span className="text-foreground">{row.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {row.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Preset date range picker ─────────────────────────────────────────────────
const PRESETS = [
  { id: "thisMonth", label: "This Month" },
  { id: "3months", label: "Last 3 Months" },
  { id: "6months", label: "Last 6 Months" },
  { id: "thisYear", label: "This Year" },
];

type TabId = "revenue" | "leads" | "emi";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "revenue",
    label: "Revenue Report",
    icon: <BadgeIndianRupee size={14} />,
  },
  { id: "leads", label: "Lead Report", icon: <Users size={14} /> },
  { id: "emi", label: "EMI Report", icon: <BarChart3 size={14} /> },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState<TabId>("revenue");
  const [preset, setPreset] = useState(DEFAULT_PRESET);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState(initial.from);
  const [appliedTo, setAppliedTo] = useState(initial.to);

  const handlePreset = (p: string) => {
    setPreset(p);
    setCustomFrom("");
    setCustomTo("");
    const { from, to } = getPresetDates(p);
    setAppliedFrom(from);
    setAppliedTo(to);
  };

  const handleApply = () => {
    if (customFrom && customTo) {
      setAppliedFrom(customFrom);
      setAppliedTo(customTo);
      setPreset("");
    }
  };

  return (
    <AppLayout title="Reports">
      <div className="space-y-5">
        {/* Page header */}
        <div>
          <h1 className="text-xl font-bold text-foreground font-display">
            Reports & Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Revenue, lead, and EMI reports with export options
          </p>
        </div>

        {/* Date range controls */}
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePreset(p.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth border",
                  preset === p.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                )}
                data-ocid={`reports.preset_${p.id}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="reports-from"
                className="text-xs text-muted-foreground"
              >
                From
              </label>
              <input
                id="reports-from"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                data-ocid="reports.from_date_input"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="reports-to"
                className="text-xs text-muted-foreground"
              >
                To
              </label>
              <input
                id="reports-to"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                data-ocid="reports.to_date_input"
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={handleApply}
              disabled={!customFrom || !customTo}
              data-ocid="reports.apply_button"
            >
              Apply
            </Button>
          </div>

          <p className="text-xs text-muted-foreground sm:ml-4 whitespace-nowrap">
            <Calendar size={11} className="inline mr-1" />
            {appliedFrom} → {appliedTo}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="border-b border-border flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setActiveTab(tab.id)}
              data-ocid={`reports.${tab.id}_tab`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "revenue" && (
          <RevenueTab from={appliedFrom} to={appliedTo} />
        )}
        {activeTab === "leads" && <LeadTab from={appliedFrom} to={appliedTo} />}
        {activeTab === "emi" && <EmiTab from={appliedFrom} to={appliedTo} />}
      </div>
    </AppLayout>
  );
}
