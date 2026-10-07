"use client";

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useLayoutEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

const ColumnLabelsContext = createContext<string[]>([]);
const SetColumnLabelsContext = createContext<(labels: string[]) => void>(() => {});

function nodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join(" ").trim();
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return nodeText(props.children);
  }
  return "";
}

/**
 * The scroll container: fills whatever height its flex parent gives it (a `Card` with
 * `flex flex-1 min-h-0 flex-col` around it) and scrolls internally in both directions once
 * content overflows - the table's own header stays pinned via `THead`'s `sticky` position,
 * so long lists never grow the page itself. Below the `md` breakpoint the same rows render
 * as stacked cards.
 */
export function Table({ children }: { children: React.ReactNode }) {
  const [labels, setLabels] = useState<string[]>([]);
  return (
    <SetColumnLabelsContext.Provider value={setLabels}>
      <ColumnLabelsContext.Provider value={labels}>
        <div className="data-table min-h-0 flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            {children}
          </table>
        </div>
      </ColumnLabelsContext.Provider>
    </SetColumnLabelsContext.Provider>
  );
}

export function THead({ columns }: { columns: React.ReactNode[] }) {
  const setLabels = useContext(SetColumnLabelsContext);
  const signature = columns.map(nodeText).join("\u0001");

  useLayoutEffect(() => {
    setLabels(signature.split("\u0001"));
  }, [setLabels, signature]);

  return (
    <thead className="sticky top-0 z-10 border-b-2 border-slate-300 bg-slate-200/70 shadow-2xs backdrop-blur-md">
      <tr>
        {columns.map((c, i) => (
          <th
            key={i}
            className="px-5 py-3.5 text-left text-[11px] font-extrabold tracking-widest whitespace-nowrap text-slate-800 uppercase"
          >
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>;
}

export function TR({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  const labels = useContext(ColumnLabelsContext);
  const labelled: ReactNode[] = [];
  let column = 0;
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child) || child.type !== TD) {
      labelled.push(child);
      continue;
    }
    const element = child as ReactElement<{ colSpan?: number; "data-label"?: string }>;
    const span = element.props.colSpan ?? 1;
    const label = span > 1 ? "" : (element.props["data-label"] ?? labels[column] ?? "");
    labelled.push(cloneElement(element, { "data-label": label }));
    column += span;
  }

  return (
    <tr
      className={cn("transition-colors duration-100 hover:bg-slate-50/90", className)}
      {...props}
    >
      {labelled}
    </tr>
  );
}

export function TD({
  children,
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-5 py-3.5 text-xs font-medium whitespace-nowrap text-slate-700", className)}
      {...props}
    >
      {children}
    </td>
  );
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}) {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <span>
          Showing <strong className="font-semibold text-slate-800">{start}</strong> to{" "}
          <strong className="font-semibold text-slate-800">{end}</strong> of{" "}
          <strong className="font-semibold text-slate-800">{totalItems}</strong> entries
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="min-h-11 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-accent sm:min-h-0"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="min-h-11 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0"
        >
          Previous
        </button>
        <span className="px-2 font-semibold text-slate-700">
          {currentPage} / {Math.max(1, totalPages)}
        </span>
        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="min-h-11 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0"
        >
          Next
        </button>
      </div>
    </div>
  );
}
