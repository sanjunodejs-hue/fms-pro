import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TableColumn } from "@/types";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "./EmptyState";
import { LoadingSpinner } from "./LoadingSpinner";

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pageSize?: number;
  searchPlaceholder?: string;
  emptyMessage?: string;
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  exportFileName?: string;
  actions?: React.ReactNode;
  filterBar?: React.ReactNode;
}

type SortDir = "asc" | "desc" | null;

export function DataTable<T>({
  columns,
  data,
  loading = false,
  pageSize = 10,
  searchPlaceholder = "Search...",
  emptyMessage = "No records found",
  rowKey,
  onRowClick,
  exportFileName,
  actions,
  filterBar,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = (row as Record<string, unknown>)[col.key as string];
        return String(val ?? "")
          .toLowerCase()
          .includes(q);
      }),
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String((a as Record<string, unknown>)[sortKey] ?? "");
      const bv = String((b as Record<string, unknown>)[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
      setSortDir(null);
    }
    setPage(1);
  };

  const handleExport = () => {
    const header = columns.map((c) => c.label).join(",");
    const rows = sorted.map((row) =>
      columns
        .map((col) => {
          const val = (row as Record<string, unknown>)[col.key as string];
          return `"${String(val ?? "").replace(/"/g, "'")}"`;
        })
        .join(","),
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFileName ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ col }: { col: TableColumn<T> }) => {
    if (!col.sortable) return null;
    const key = col.key as string;
    if (sortKey !== key)
      return <ChevronsUpDown size={12} className="ml-1 opacity-35" />;
    return sortDir === "asc" ? (
      <ChevronUp size={12} className="ml-1 text-primary" />
    ) : (
      <ChevronDown size={12} className="ml-1 text-primary" />
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search + actions bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-sm"
            data-ocid="table.search_input"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {exportFileName && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={handleExport}
              data-ocid="table.export_button"
            >
              <Download size={13} />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      {filterBar && <div>{filterBar}</div>}

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key as string}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap",
                      col.sortable &&
                        "cursor-pointer hover:text-foreground select-none",
                      col.width,
                    )}
                    onClick={() =>
                      col.sortable && handleSort(col.key as string)
                    }
                    onKeyDown={(e) =>
                      col.sortable &&
                      e.key === "Enter" &&
                      handleSort(col.key as string)
                    }
                    tabIndex={col.sortable ? 0 : undefined}
                  >
                    <span className="flex items-center">
                      {col.label}
                      <SortIcon col={col} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="py-14 text-center">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-14">
                    <EmptyState message={emptyMessage} />
                  </td>
                </tr>
              ) : (
                paginated.map((row, _i) => (
                  <tr
                    key={rowKey(row)}
                    className={cn(
                      "hover:bg-muted/30 transition-colors",
                      onRowClick && "cursor-pointer",
                    )}
                    onClick={() => onRowClick?.(row)}
                    onKeyDown={(e) => e.key === "Enter" && onRowClick?.(row)}
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? "button" : undefined}
                    aria-label={
                      onRowClick ? `View row ${rowKey(row)}` : undefined
                    }
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key as string}
                        className="px-4 py-3 text-foreground"
                      >
                        {col.render
                          ? col.render(row)
                          : String(
                              (row as Record<string, unknown>)[
                                col.key as string
                              ] ?? "",
                            )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-xs text-muted-foreground">
          {sorted.length > 0
            ? `Showing ${Math.min((page - 1) * pageSize + 1, sorted.length)}–${Math.min(page * pageSize, sorted.length)} of ${sorted.length} records`
            : "No records"}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="p-1.5 rounded-md hover:bg-muted disabled:opacity-40 transition-smooth"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
              data-ocid="table.pagination_prev"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - page) <= 2)
              .map((p) => (
                <button
                  key={p}
                  type="button"
                  className={cn(
                    "w-7 h-7 rounded-md text-xs font-medium transition-smooth",
                    p === page
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-muted text-muted-foreground",
                  )}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
            <button
              type="button"
              className="p-1.5 rounded-md hover:bg-muted disabled:opacity-40 transition-smooth"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
              data-ocid="table.pagination_next"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
