"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, FileText, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CardHeader, ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, THead, TBody, TR, TD, TablePagination } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { REPORT_MAX_ROWS, generatedAtIst, pdfSafe } from "@/lib/report-format";
import { buildXlsxBlob, parseExportNumber } from "@/lib/xlsx";

export type ReportSortType = "text" | "number" | "date";

export interface ReportColumn<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  exportValue?: (row: T) => string | number;
  sortType?: ReportSortType;
}

type SortDir = "asc" | "desc";
type SortState = { key: string; dir: SortDir };

const DATE_HEADER = /date|when|created|due|paid at|onboarded|stuck|requested|credited|reviewed/i;
const NUMBER_HEADER = /amount|balance|count|gmv|fee|bills|days|staff|clients|entries|total|outstanding|settled|wallet|revenue/i;

function looksLikeDate(value: string) {
  if (!value || value === "—") return false;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return true;
  if (/^\d{1,2}\s+[A-Za-z]{3,}/.test(value)) return true;
  const time = Date.parse(value.replace(/\bSept\b/g, "Sep"));
  return !Number.isNaN(time);
}

function parseSortDate(value: unknown): number | null {
  if (value == null || value === "" || value === "—") return null;
  if (typeof value === "number" && Number.isFinite(value)) return null;
  const text = String(value).trim().replace(/\bSept\b/g, "Sep");
  const time = Date.parse(text);
  return Number.isNaN(time) ? null : time;
}

function inferSortType<T>(column: ReportColumn<T>, rows: T[]): ReportSortType {
  if (column.sortType) return column.sortType;
  if (!column.exportValue) return "text";
  const samples = rows
    .slice(0, 40)
    .map((row) => column.exportValue!(row))
    .filter((value) => value != null && value !== "" && value !== "—");
  if (DATE_HEADER.test(column.label) && samples.some((value) => typeof value === "string" && looksLikeDate(value))) {
    return "date";
  }
  if (
    samples.length > 0 &&
    samples.every((value) => typeof value === "number" || parseExportNumber(value) != null) &&
    !samples.every((value) => typeof value === "string" && looksLikeDate(value))
  ) {
    return "number";
  }
  if (samples.length > 0 && samples.every((value) => typeof value === "string" && looksLikeDate(value))) {
    return "date";
  }
  if (NUMBER_HEADER.test(column.label) && samples.every((value) => typeof value === "number" || parseExportNumber(value) != null)) {
    return "number";
  }
  return "text";
}

function sortComparable<T>(column: ReportColumn<T>, row: T, type: ReportSortType): string | number | null {
  const raw = column.exportValue?.(row);
  if (raw == null || raw === "" || raw === "—") return null;
  if (type === "number") {
    return typeof raw === "number" ? raw : parseExportNumber(raw);
  }
  if (type === "date") {
    return parseSortDate(raw);
  }
  return String(raw).toLocaleLowerCase("en-IN");
}

function compareSortValues(a: string | number | null, b: string | number | null, dir: SortDir) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const result = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "en-IN", { numeric: true });
  return dir === "asc" ? result : -result;
}

export interface ReportSummaryItem {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger" | "accent";
}

export interface ReportExportMeta {
  generatedFor?: string;
  dateRange?: string;
  extraRows?: Array<Array<string | number>>;
}

const PAGE_SIZE = 50;

const SUMMARY_TONE: Record<NonNullable<ReportSummaryItem["tone"]>, string> = {
  default: "text-slate-900",
  success: "text-emerald-700",
  danger: "text-rose-700",
  accent: "text-indigo-700",
};

export function ReportTable<T>({
  title,
  description,
  loading,
  rows,
  columns,
  exportFilename,
  emptyIcon = FileText,
  emptyTitle = "Nothing to show",
  emptyDescription = "Try widening the filters above.",
  emptyAction,
  headerActions,
  footer,
  exportMeta,
  rowKey,
  onRowClick,
  summary,
  fillHeight = true,
}: {
  title: string;
  description?: string;
  loading: boolean;
  rows: T[];
  columns: ReportColumn<T>[];
  exportFilename: string;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  exportMeta?: ReportExportMeta;
  rowKey?: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  summary?: ReportSummaryItem[];
  fillHeight?: boolean;
}) {
  const toast = useToast();
  const [exportingPdf, setExportingPdf] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState | null>(null);
  const exportColumns = columns.filter((c) => c.exportValue);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      exportColumns.some((column) => String(column.exportValue!(row) ?? "").toLowerCase().includes(query)),
    );
  }, [rows, search, exportColumns]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((item) => item.key === sort.key);
    if (!column?.exportValue) return filtered;
    const type = inferSortType(column, filtered);
    return [...filtered].sort((left, right) =>
      compareSortValues(sortComparable(column, left, type), sortComparable(column, right, type), sort.dir),
    );
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function toggleSort(column: ReportColumn<T>) {
    if (!column.exportValue) return;
    const type = inferSortType(column, filtered);
    const firstDir: SortDir = type === "text" ? "asc" : "desc";
    setPage(1);
    setSort((current) => {
      if (current?.key !== column.key) return { key: column.key, dir: firstDir };
      if (current.dir === firstDir) return { key: column.key, dir: firstDir === "asc" ? "desc" : "asc" };
      return null;
    });
  }

  function exportRows(source: T[]) {
    return source.map((row) => exportColumns.map((c) => c.exportValue!(row)));
  }

  function exportSummaryValue(value: string) {
    return value.replaceAll("₹", "Rs. ");
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportXlsx() {
    if (sorted.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const extraSummary = (exportMeta?.extraRows ?? []).flatMap((row) => {
      if (row.length < 2) return [];
      return [{ label: String(row[0] ?? ""), value: row[1] }];
    });
    downloadBlob(
      buildXlsxBlob({
        sheetName: title,
        title,
        meta: [
          exportMeta?.generatedFor ? { label: "Generated for", value: exportMeta.generatedFor } : null,
          exportMeta?.dateRange ? { label: "Period", value: exportMeta.dateRange } : null,
          { label: "Generated at", value: generatedAtIst() },
          { label: "Rows", value: String(sorted.length) },
        ].filter((item): item is { label: string; value: string } => item != null),
        summary: [
          ...(summary ?? []).map((item) => ({
            label: item.label,
            value: parseExportNumber(item.value) ?? exportSummaryValue(item.value),
          })),
          ...extraSummary,
        ],
        headers: exportColumns.map((c) => c.label),
        rows: exportRows(sorted),
      }),
      `${exportFilename}.xlsx`,
    );
    toast.success(`Exported ${sorted.length} row${sorted.length === 1 ? "" : "s"} as Excel`);
  }

  async function exportPdf() {
    if (sorted.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    setExportingPdf(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(16);
      doc.setTextColor(30, 27, 75);
      doc.text(pdfSafe(title), 14, 16);
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      let y = 22;
      for (const line of [
        exportMeta?.generatedFor,
        exportMeta?.dateRange ? `Period: ${exportMeta.dateRange}` : null,
        `Generated at: ${generatedAtIst()}  |  ${sorted.length} row${sorted.length === 1 ? "" : "s"}`,
      ].filter(Boolean) as string[]) {
        doc.text(pdfSafe(line), 14, y);
        y += 5;
      }
      if (summary?.length) {
        y += 2;
        const boxHeight = 8 + summary.length * 6;
        doc.setFillColor(238, 242, 255);
        doc.setDrawColor(199, 210, 254);
        doc.roundedRect(14, y, 269, boxHeight, 2, 2, "FD");
        doc.setFontSize(8);
        doc.setTextColor(79, 70, 229);
        doc.text("SUMMARY", 18, y + 6);
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        summary.forEach((item, index) => {
          doc.setFont("helvetica", "bold");
          doc.text(pdfSafe(`${item.label}:  ${exportSummaryValue(item.value)}`), 18, y + 13 + index * 6);
        });
        doc.setFont("helvetica", "normal");
        y += boxHeight + 4;
      }
      autoTable(doc, {
        startY: y,
        head: [exportColumns.map((c) => pdfSafe(c.label))],
        body: exportRows(sorted).map((row) => row.map((cell) => pdfSafe(cell))),
        styles: { fontSize: 8, font: "helvetica", fontStyle: "normal" },
        headStyles: { fillColor: [79, 70, 229], fontStyle: "bold" },
        foot: summary?.length
          ? [[
              pdfSafe(
                `SUMMARY: ${summary.map((item) => `${item.label} ${exportSummaryValue(item.value)}`).join("  |  ")}`,
              ),
              ...Array.from({ length: Math.max(0, exportColumns.length - 1) }, () => ""),
            ]]
          : undefined,
        footStyles: { fillColor: [238, 242, 255], textColor: [49, 46, 129], fontStyle: "bold", fontSize: 8 },
      });
      doc.save(`${exportFilename}.pdf`);
      toast.success(`Exported ${sorted.length} row${sorted.length === 1 ? "" : "s"} as PDF`);
    } catch {
      toast.error("Could not generate the PDF");
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <ListCard fitContent={!fillHeight}>
      <CardHeader
        title={title}
        description={loading ? "Loading..." : (description ?? `${sorted.length} row${sorted.length === 1 ? "" : "s"}`)}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {headerActions}
            <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={exportXlsx}>
              Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<FileText size={14} />}
              loading={exportingPdf}
              onClick={exportPdf}
            >
              Export PDF
            </Button>
          </div>
        }
      />
      {summary && summary.length > 0 && <ReportSummaryBar items={summary} />}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 py-2">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search this report"
            className="min-h-9 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        {rows.length >= REPORT_MAX_ROWS && (
          <p className="text-[11px] font-medium text-amber-700">Showing the first {REPORT_MAX_ROWS} rows.</p>
        )}
      </div>
      {loading ? (
        <TableSkeleton cols={columns.length} />
      ) : sorted.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <>
          <Table>
            <THead
              columns={columns.map((column) => {
                if (!column.exportValue) return column.label;
                const active = sort?.key === column.key;
                const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <button
                    key={column.key}
                    type="button"
                    onClick={() => toggleSort(column)}
                    className={cn(
                      "-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 uppercase tracking-widest transition-colors hover:text-indigo-700",
                      active ? "text-indigo-700" : "text-slate-800",
                    )}
                    aria-label={`Sort by ${column.label}`}
                  >
                    {column.label}
                    <Icon size={12} className={active ? "text-indigo-600" : "text-slate-400"} />
                  </button>
                );
              })}
            />
            <TBody>
              {pageRows.map((row, i) => (
                <TR
                  key={rowKey ? rowKey(row, (safePage - 1) * PAGE_SIZE + i) : (safePage - 1) * PAGE_SIZE + i}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((c) => (
                    <TD key={c.key}>{c.render(row)}</TD>
                  ))}
                </TR>
              ))}
            </TBody>
          </Table>
          {sorted.length > PAGE_SIZE && (
            <TablePagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={sorted.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </>
      )}
      {footer}
    </ListCard>
  );
}

export function ReportSummaryBar({ items }: { items: ReportSummaryItem[] }) {
  const cols =
    items.length >= 4 ? "sm:grid-cols-4" : items.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return (
    <div className={cn("grid shrink-0 grid-cols-2 gap-px border-b border-indigo-100 bg-indigo-100", cols)}>
      {items.map((item) => (
        <div key={item.label} className="bg-indigo-50/90 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">{item.label}</p>
          <p className={cn("mt-0.5 font-mono text-lg font-bold tracking-tight", SUMMARY_TONE[item.tone ?? "default"])}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/** @deprecated Use ReportTable summary instead. */
export function ReportTotals({ items }: { items: { label: string; value: string }[] }) {
  return <ReportSummaryBar items={items} />;
}

export function StatusChips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { key: T; label: string; count?: number }[];
}) {
  return (
    <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
      {options.map((item) => {
        const active = value === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={cn(
              "flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors",
              active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
            )}
          >
            {item.label}
            {item.count != null && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  active ? "bg-indigo-50 text-indigo-700" : "bg-white/70 text-slate-500",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
