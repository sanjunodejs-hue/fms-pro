import { Role, createActor } from "@/backend";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { ActivityLog, UserProfile } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  FilePen,
  GitBranch,
  PlusCircle,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 20;

// Color-coded action icons + badges
const ACTION_CONFIG: Record<
  string,
  { color: string; icon: React.ReactNode; label?: string }
> = {
  add: {
    color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    icon: <PlusCircle size={12} />,
    label: "Created",
  },
  create: {
    color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    icon: <PlusCircle size={12} />,
    label: "Created",
  },
  update: {
    color: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
    icon: <FilePen size={12} />,
    label: "Updated",
  },
  edit: {
    color: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
    icon: <FilePen size={12} />,
    label: "Updated",
  },
  delete: {
    color: "bg-rose-500/10 text-rose-700 border-rose-500/20",
    icon: <Trash2 size={12} />,
    label: "Deleted",
  },
  remove: {
    color: "bg-rose-500/10 text-rose-700 border-rose-500/20",
    icon: <Trash2 size={12} />,
    label: "Deleted",
  },
  convert: {
    color: "bg-violet-500/10 text-violet-700 border-violet-500/20",
    icon: <GitBranch size={12} />,
    label: "Converted",
  },
  confirm: {
    color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    icon: <CheckCircle size={12} />,
    label: "Approved",
  },
  approve: {
    color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    icon: <CheckCircle size={12} />,
    label: "Approved",
  },
  reject: {
    color: "bg-rose-500/10 text-rose-700 border-rose-500/20",
    icon: <ShieldAlert size={12} />,
    label: "Rejected",
  },
  assign: {
    color: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    icon: <UserCheck size={12} />,
    label: "Assigned",
  },
  transfer: {
    color: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    icon: <UserCheck size={12} />,
    label: "Transferred",
  },
  generate: {
    color: "bg-primary/10 text-primary border-primary/20",
    icon: <PlusCircle size={12} />,
    label: "Generated",
  },
};

function getActionConfig(action: string) {
  const lower = action.toLowerCase();
  for (const [key, cfg] of Object.entries(ACTION_CONFIG)) {
    if (lower.startsWith(key) || lower.includes(key)) return cfg;
  }
  return {
    color: "bg-muted text-muted-foreground border-border",
    icon: <Activity size={12} />,
    label: action,
  };
}

function ActionBadge({ action }: { action: string }) {
  const { color, icon, label } = getActionConfig(action);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        color,
      )}
    >
      {icon}
      {label ?? action}
    </span>
  );
}

const ENTITY_COLORS: Record<string, string> = {
  lead: "text-primary",
  student: "text-emerald-600",
  payment: "text-amber-600",
  emi: "text-violet-600",
  receipt: "text-indigo-600",
  user: "text-rose-600",
  team: "text-cyan-600",
};

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toTimestamp(dateStr: string): bigint {
  return BigInt(new Date(dateStr).getTime()) * 1_000_000n;
}

const ACTION_TYPES = [
  { value: "", label: "All Actions" },
  { value: "add", label: "Created" },
  { value: "update", label: "Updated" },
  { value: "delete", label: "Deleted" },
  { value: "convert", label: "Converted" },
  { value: "confirm", label: "Approved" },
  { value: "reject", label: "Rejected" },
  { value: "assign", label: "Assigned" },
];

const ENTITY_TYPES = [
  { value: "", label: "All Entities" },
  { value: "Lead", label: "Lead" },
  { value: "Student", label: "Student" },
  { value: "Payment", label: "Payment" },
  { value: "EmiInstallment", label: "EMI" },
  { value: "Receipt", label: "Receipt" },
  { value: "User", label: "User" },
  { value: "Team", label: "Team" },
  { value: "Settings", label: "Settings" },
  { value: "FollowUp", label: "Follow-up" },
];

export default function ActivityLogs() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const { actor, isFetching } = useActor(createActor);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (role !== Role.admin) navigate("/dashboard", { replace: true });
  }, [role, navigate]);

  const { data: logs, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["activityLogs"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActivityLogs(null, null) as Promise<ActivityLog[]>;
    },
    enabled: !!actor && !isFetching,
  });

  const { data: allUsers } = useQuery<UserProfile[]>({
    queryKey: ["allUsers"],
    queryFn: async () =>
      actor ? (actor.getAllUsers() as Promise<UserProfile[]>) : [],
    enabled: !!actor && !isFetching,
  });

  const userMap = Object.fromEntries(
    (allUsers ?? []).map((u) => [u.id.toString(), u]),
  );

  const filtered = useMemo(() => {
    let result = logs ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          l.entityType.toLowerCase().includes(q),
      );
    }
    if (actionFilter) {
      result = result.filter((l) =>
        l.action.toLowerCase().includes(actionFilter),
      );
    }
    if (entityFilter) {
      result = result.filter((l) => l.entityType === entityFilter);
    }
    if (actorFilter) {
      result = result.filter((l) => l.userId.toString() === actorFilter);
    }
    if (fromDate) {
      const from = toTimestamp(fromDate);
      result = result.filter((l) => l.timestamp >= from);
    }
    if (toDate) {
      const to = toTimestamp(toDate) + 86_400_000_000_000n;
      result = result.filter((l) => l.timestamp <= to);
    }
    return result;
  }, [logs, search, actionFilter, entityFilter, actorFilter, fromDate, toDate]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)),
    [filtered],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearFilters = () => {
    setSearch("");
    setActionFilter("");
    setEntityFilter("");
    setActorFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const hasFilters =
    search || actionFilter || entityFilter || actorFilter || fromDate || toDate;

  return (
    <AppLayout title="Activity Logs">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground font-display">
            Activity Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Complete audit trail of all system actions
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          {/* Search row */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search by action, entity, or description…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
              data-ocid="logs.search_input"
            />
          </div>

          {/* Filter controls */}
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 rounded-lg border border-input bg-background px-3 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              data-ocid="logs.action_filter_select"
            >
              {ACTION_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 rounded-lg border border-input bg-background px-3 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              data-ocid="logs.entity_filter_select"
            >
              {ENTITY_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={actorFilter}
              onChange={(e) => {
                setActorFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 rounded-lg border border-input bg-background px-3 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              data-ocid="logs.actor_filter_select"
            >
              <option value="">All Users</option>
              {(allUsers ?? []).map((u) => (
                <option key={u.id.toString()} value={u.id.toString()}>
                  {u.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="logs-from"
                className="text-xs text-muted-foreground"
              >
                From
              </label>
              <input
                id="logs-from"
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                data-ocid="logs.from_date_input"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="logs-to"
                className="text-xs text-muted-foreground"
              >
                To
              </label>
              <input
                id="logs-to"
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                data-ocid="logs.to_date_input"
              />
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-primary hover:underline ml-1"
              >
                Clear all
              </button>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {filtered.length} entries
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
            <Activity size={15} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Activity Feed
            </span>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-14">
                <LoadingSpinner />
              </div>
            ) : paginated.length === 0 ? (
              <EmptyState
                message="No activity logs found"
                description="Activity will appear here as users perform actions."
                icon={<Activity size={24} className="text-muted-foreground" />}
              />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    {[
                      "Actor",
                      "Action",
                      "Entity",
                      "ID",
                      "Description",
                      "Time",
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
                  {paginated.map((log, i) => {
                    const user = userMap[log.userId.toString()];
                    const roleStr = user
                      ? (user.role as unknown as string)
                      : "";
                    const entityColor =
                      ENTITY_COLORS[log.entityType.toLowerCase()] ??
                      "text-foreground";
                    return (
                      <tr
                        key={String(log.id)}
                        className="hover:bg-muted/30 transition-colors"
                        data-ocid={`logs.item.${i + 1}`}
                      >
                        {/* Actor */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0",
                                roleStr === "admin"
                                  ? "bg-violet-500/15 text-violet-600"
                                  : roleStr === "teamHead"
                                    ? "bg-indigo-500/15 text-indigo-600"
                                    : roleStr === "counselor"
                                      ? "bg-emerald-500/15 text-emerald-600"
                                      : roleStr === "accountant"
                                        ? "bg-amber-500/15 text-amber-600"
                                        : "bg-muted text-muted-foreground",
                              )}
                            >
                              {user ? user.name.charAt(0).toUpperCase() : "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate max-w-[100px]">
                                {user
                                  ? user.name
                                  : `${log.userId.toString().slice(0, 12)}…`}
                              </p>
                            </div>
                          </div>
                        </td>
                        {/* Action */}
                        <td className="px-4 py-3">
                          <ActionBadge action={log.action} />
                        </td>
                        {/* Entity type */}
                        <td className="px-4 py-3">
                          <span
                            className={cn("text-xs font-medium", entityColor)}
                          >
                            {log.entityType}
                          </span>
                        </td>
                        {/* Entity ID */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">
                            {log.entityId ? `#${String(log.entityId)}` : "—"}
                          </span>
                        </td>
                        {/* Details */}
                        <td className="px-4 py-3">
                          <span
                            className="text-xs text-muted-foreground truncate block max-w-[240px]"
                            title={log.details}
                          >
                            {log.details || "—"}
                          </span>
                        </td>
                        {/* Timestamp */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-xs text-muted-foreground">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, sorted.length)}–
              {Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 transition-smooth"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page"
                data-ocid="logs.pagination_prev"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - page) <= 2)
                .map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-medium transition-smooth",
                      p === page
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground",
                    )}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
              <button
                type="button"
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 transition-smooth"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
                data-ocid="logs.pagination_next"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
