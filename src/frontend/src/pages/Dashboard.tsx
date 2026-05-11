import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  dummyDashboardStats,
  dummyStudents,
  leadFunnelData,
  revenueChartData,
} from "@/data/dummyData";
import { useGetDashboardStats } from "@/hooks/useBackend";
import type { BadgeVariant } from "@/types";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  IndianRupee,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatCurrency(val: bigint | number): string {
  const n = typeof val === "bigint" ? Number(val) : val;
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function timeAgo(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const diffMs = Date.now() - ms;
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

const emiStatusToBadge = (s: string): BadgeVariant => {
  const map: Record<string, BadgeVariant> = {
    pending: "pending",
    paid: "paid",
    overdue: "overdue",
  };
  return map[s] ?? "pending";
};

const actionIconMap: Record<string, React.ReactNode> = {
  CONVERT_LEAD: <GraduationCap size={14} className="text-emerald-500" />,
  CONFIRM_PAYMENT: <CreditCard size={14} className="text-violet-500" />,
  GENERATE_RECEIPT: <BookOpen size={14} className="text-blue-500" />,
  ADD_LEAD: <Users size={14} className="text-primary" />,
  ADD_FOLLOWUP: <Calendar size={14} className="text-amber-500" />,
  ASSIGN_LEAD: <CheckCircle2 size={14} className="text-green-500" />,
  ADD_USER: <Users size={14} className="text-primary" />,
  CREATE_TEAM: <Users size={14} className="text-indigo-500" />,
  UPDATE_LEAD_STATUS: <Activity size={14} className="text-orange-500" />,
  GENERATE_PAYMENT_LINK: <CreditCard size={14} className="text-cyan-500" />,
};

const FUNNEL_COLORS = ["#6366f1", "#f59e0b", "#22c55e", "#ef4444"];

const studentMap = new Map(dummyStudents.map((s) => [String(s.id), s.name]));

interface TooltipPayload {
  value: number;
  name: string;
  color: string;
}

function CustomAreaTooltip({
  active,
  payload,
  label,
}: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-elevated text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === "emi" ? "EMI" : p.name === "full" ? "Full Pay" : "Total"}:{" "}
          {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

function CustomBarTooltip({
  active,
  payload,
  label,
}: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-elevated text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-foreground">{payload[0]?.value} leads</p>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();
  const navigate = useNavigate();

  const displayStats = stats ?? dummyDashboardStats;

  const funnelWithColors = leadFunnelData.map((item, i) => ({
    ...item,
    fill: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
  }));

  return (
    <AppLayout title="Dashboard">
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          {/* Page header */}
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Student Fee Management CRM · FMS Pro
            </p>
          </div>

          {/* Stat cards */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
            data-ocid="dashboard.stats.section"
          >
            <StatCard
              icon={<Users size={20} />}
              label="Total Leads"
              value={String(displayStats.totalLeads)}
              trend={{ value: 12, direction: "up" }}
              variant="indigo"
            />
            <StatCard
              icon={<GraduationCap size={20} />}
              label="Converted Students"
              value={String(displayStats.convertedStudents)}
              trend={{ value: 8, direction: "up" }}
              variant="green"
            />
            <StatCard
              icon={<IndianRupee size={20} />}
              label="Total Revenue"
              value={formatCurrency(displayStats.totalRevenue)}
              trend={{ value: 15, direction: "up" }}
              variant="purple"
            />
            <StatCard
              icon={<CreditCard size={20} />}
              label="Pending EMI"
              value={String(displayStats.pendingEmi)}
              trend={{ value: 3, direction: "down" }}
              variant="orange"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Revenue Area Chart */}
            <div className="xl:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-subtle">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Revenue Overview
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Monthly breakdown: Full Pay vs EMI
                  </p>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                  onClick={() => navigate("/reports")}
                  data-ocid="dashboard.revenue_chart.view_reports"
                >
                  View Reports <ArrowRight size={12} />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                  data={revenueChartData}
                  margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradFull" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#6366f1"
                        stopOpacity={0.35}
                      />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradEmi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    className="opacity-[0.07]"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    className="text-muted-foreground"
                    tickFormatter={(v: number) => `₹${v / 1000}K`}
                  />
                  <Tooltip content={<CustomAreaTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="full"
                    name="full"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#gradFull)"
                  />
                  <Area
                    type="monotone"
                    dataKey="emi"
                    name="emi"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#gradEmi)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3 justify-center">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-3 h-1.5 rounded-full bg-indigo-500 block" />{" "}
                  Full Payment
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-3 h-1.5 rounded-full bg-emerald-500 block" />{" "}
                  EMI
                </span>
              </div>
            </div>

            {/* Lead Funnel Bar Chart */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-subtle">
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-foreground">
                  Lead Funnel
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Conversion pipeline status
                </p>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={funnelWithColors}
                  layout="vertical"
                  margin={{ top: 0, right: 12, left: 8, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "currentColor" }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    className="text-muted-foreground"
                    width={70}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelWithColors.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.fill}
                        fillOpacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {funnelWithColors.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: FUNNEL_COLORS[i] }}
                    />
                    <span className="text-xs text-muted-foreground truncate">
                      {item.name}
                    </span>
                    <span className="text-xs font-semibold text-foreground ml-auto">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* EMI Due List */}
            <div
              className="bg-card border border-border rounded-2xl p-5 shadow-subtle"
              data-ocid="dashboard.emi_due.section"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <CreditCard size={14} className="text-amber-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    EMI Due Soon
                  </h3>
                </div>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => navigate("/emi")}
                  data-ocid="dashboard.emi_due.view_all"
                >
                  View All
                </button>
              </div>
              {displayStats.upcomingEmi.length ? (
                <ul className="space-y-3">
                  {displayStats.upcomingEmi.slice(0, 5).map((emi, i) => (
                    <li
                      key={String(emi.id)}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                      data-ocid={`dashboard.emi_due.item.${i + 1}`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {studentMap.get(String(emi.studentId)) ??
                            `Student #${emi.studentId}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          EMI #{String(emi.installmentNumber)} ·{" "}
                          {formatTimestamp(emi.dueDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs font-bold text-foreground">
                          {formatCurrency(emi.amount)}
                        </span>
                        <StatusBadge
                          variant={emiStatusToBadge(
                            emi.status as unknown as string,
                          )}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No upcoming EMI
                </p>
              )}
            </div>

            {/* Recent Activity Feed */}
            <div
              className="bg-card border border-border rounded-2xl p-5 shadow-subtle"
              data-ocid="dashboard.activity.section"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity size={14} className="text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Recent Activity
                  </h3>
                </div>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => navigate("/activity-logs")}
                  data-ocid="dashboard.activity.view_all"
                >
                  View All
                </button>
              </div>
              <ul className="space-y-3">
                {displayStats.recentActivities.slice(0, 7).map((log, i) => (
                  <li
                    key={String(log.id)}
                    className="flex items-start gap-2.5"
                    data-ocid={`dashboard.activity.item.${i + 1}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      {actionIconMap[log.action] ?? (
                        <Activity size={12} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground leading-snug truncate">
                        {log.details}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {timeAgo(log.timestamp)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Upcoming Follow-ups */}
            <div
              className="bg-card border border-border rounded-2xl p-5 shadow-subtle"
              data-ocid="dashboard.followups.section"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Calendar size={14} className="text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Upcoming Follow-ups
                  </h3>
                </div>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => navigate("/followups")}
                  data-ocid="dashboard.followups.view_all"
                >
                  View All
                </button>
              </div>
              {displayStats.upcomingFollowUps.length ? (
                <ul className="space-y-3">
                  {displayStats.upcomingFollowUps.slice(0, 5).map((fu, i) => (
                    <li
                      key={String(fu.id)}
                      className="flex items-start gap-2 py-2 border-b border-border last:border-0"
                      data-ocid={`dashboard.followups.item.${i + 1}`}
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">
                          {i + 1}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground line-clamp-1">
                          {fu.notes || "Follow-up scheduled"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Calendar size={10} />
                          {formatTimestamp(fu.nextFollowUpDate)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No upcoming follow-ups
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
