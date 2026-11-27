"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string | null;
}

export interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** When set, the menu toggles several values and stays open. */
  multiple?: boolean;
  values?: string[];
  onValuesChange?: (values: string[]) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  hint?: string;
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
  allowClear?: boolean;
  /** Whether to show the search input bar inside the dropdown popover. Defaults to true. */
  searchable?: boolean;
  /** Optional callback when the user types in the search box (useful for server-assisted search). */
  onSearchChange?: (query: string) => void;
  /** When true, options are assumed to be already filtered by the parent via onSearchChange. */
  disableClientFilter?: boolean;
  className?: string;
}

export function SearchableSelect({
  label,
  value,
  onChange,
  multiple = false,
  values = [],
  onValuesChange,
  options,
  placeholder = "Select an option...",
  searchPlaceholder = "Type to search...",
  emptyMessage = "No matching options found.",
  hint,
  disabled = false,
  loading = false,
  allowClear = false,
  searchable = true,
  onSearchChange,
  disableClientFilter = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxListHeight: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) ?? null,
    [options, value],
  );

  // Cache the last selected option so its label stays visible even if options list changes during a remote search
  const [cachedSelected, setCachedSelected] = useState<SearchableOption | null>(null);
  useEffect(() => {
    if (!value) {
      setCachedSelected(null);
    } else if (selectedOption) {
      setCachedSelected(selectedOption);
    }
  }, [value, selectedOption]);

  const activeSelection = selectedOption ?? cachedSelected;

  const filteredOptions = useMemo(() => {
    const q = searchable ? query.trim().toLowerCase() : "";
    const base = disableClientFilter
      ? options
      : !q
        ? options
        : options.filter(
            (opt) =>
              opt.label.toLowerCase().includes(q) ||
              (opt.sublabel ?? "").toLowerCase().includes(q),
          );

    if (multiple || !value) return base;

    const matchingSelected =
      base.find((opt) => opt.value === value) ??
      (!q && activeSelection && activeSelection.value === value ? activeSelection : null);

    if (!matchingSelected) return base;

    return [
      matchingSelected,
      ...base.filter((opt) => opt.value !== value),
    ];
  }, [options, query, searchable, disableClientFilter, value, activeSelection, multiple]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom - 16;
    const headerOffset = (searchable ? 52 : 12) + (multiple ? 40 : 0);
    const maxListHeight = Math.max(160, Math.min(280, spaceBelow - headerOffset));
    setMenuStyle({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      maxListHeight,
    });
  }, [multiple, searchable]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    function handleWindowEvents(e: Event) {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) {
        return;
      }
      updatePosition();
    }
    window.addEventListener("resize", handleWindowEvents);
    window.addEventListener("scroll", handleWindowEvents, true);
    return () => {
      window.removeEventListener("resize", handleWindowEvents);
      window.removeEventListener("scroll", handleWindowEvents, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function handleOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setHighlightedIndex(0);
      const timer = window.setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = 0;
        }
        if (searchable) {
          inputRef.current?.focus();
        }
      }, 10);
      return () => window.clearTimeout(timer);
    } else {
      setQuery("");
      onSearchChange?.("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, searchable]);

  function handleQueryChange(next: string) {
    setQuery(next);
    setHighlightedIndex(0);
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
    onSearchChange?.(next);
  }

  function handleSelect(option: SearchableOption) {
    if (multiple) {
      const next = values.includes(option.value)
        ? values.filter((item) => item !== option.value)
        : [...values, option.value];
      onValuesChange?.(next);
      return;
    }
    setCachedSelected(option);
    onChange(option.value);
    setOpen(false);
  }

  const selectedCount = multiple ? values.length : activeSelection ? 1 : 0;
  const visibleIds = filteredOptions.map((opt) => opt.value);
  const visibleSelectedCount = visibleIds.filter((id) => values.includes(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;

  function selectAllVisible() {
    const next = [...values];
    for (const id of visibleIds) {
      if (!next.includes(id)) next.push(id);
    }
    onValuesChange?.(next);
  }

  function deselectAllVisible() {
    const visible = new Set(visibleIds);
    onValuesChange?.(values.filter((id) => !visible.has(id)));
  }

  const selectedSummary = useMemo(() => {
    if (!multiple) return null;
    const labels = values
      .map((item) => options.find((opt) => opt.value === item)?.label ?? item)
      .filter(Boolean);
    if (labels.length === 0) return null;
    if (labels.length <= 2) return labels.join(", ");
    return `${labels.length} selected`;
  }, [multiple, options, values]);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
        event.preventDefault();
        if (!disabled) setOpen(true);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length === 0 ? 0 : (prev + 1) % filteredOptions.length,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length === 0
          ? 0
          : (prev - 1 + filteredOptions.length) % filteredOptions.length,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = filteredOptions[highlightedIndex];
      if (target) {
        handleSelect(target);
      }
    }
  }

  const dropdownMenu =
    open && menuStyle && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: menuStyle.top,
              left: menuStyle.left,
              width: menuStyle.width,
            }}
            className="z-[80] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/5"
            onKeyDown={handleKeyDown}
          >
            {searchable && (
              <div className="flex min-h-11 items-center gap-2.5 border-b border-slate-100 bg-slate-50/90 px-3.5 py-2.5">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                {loading && <Loader2 size={15} className="shrink-0 animate-spin text-indigo-600" />}
                {query && !loading && (
                  <button
                    type="button"
                    onClick={() => handleQueryChange("")}
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {multiple && filteredOptions.length > 0 && (
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-2 py-1.5">
                <div className="flex items-center">
                  <button
                    type="button"
                    disabled={allVisibleSelected}
                    onClick={selectAllVisible}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 disabled:cursor-default disabled:text-slate-300 disabled:hover:bg-transparent"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    disabled={visibleSelectedCount === 0}
                    onClick={deselectAllVisible}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-default disabled:text-slate-300 disabled:hover:bg-transparent"
                  >
                    Deselect all
                  </button>
                </div>
                <span className="shrink-0 pr-1.5 text-[11px] font-medium tabular-nums text-slate-400">
                  {visibleSelectedCount} of {filteredOptions.length}
                </span>
              </div>
            )}

            <ul
              ref={listRef}
              role="listbox"
              style={{ maxHeight: menuStyle.maxListHeight }}
              className="flex flex-col gap-0.5 overflow-y-auto p-1.5"
            >
              {loading && filteredOptions.length === 0 ? (
                <li className="px-3.5 py-5 text-center text-sm text-slate-500">
                  Loading options...
                </li>
              ) : filteredOptions.length === 0 ? (
                <li className="px-3.5 py-5 text-center text-sm text-slate-500">
                  {emptyMessage}
                </li>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = multiple ? values.includes(opt.value) : opt.value === value;
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <li key={opt.value} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onClick={() => handleSelect(opt)}
                        className={cn(
                          "flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm transition-colors",
                          isSelected
                            ? "bg-indigo-50/90 font-semibold text-indigo-950"
                            : isHighlighted
                              ? "bg-slate-100/80 text-slate-900"
                              : "text-slate-700 hover:bg-slate-50",
                        )}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="truncate">{opt.label}</span>
                          {opt.sublabel && (
                            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-500">
                              {opt.sublabel}
                            </span>
                          )}
                        </span>
                        {isSelected && <Check size={16} className="shrink-0 text-indigo-600" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className={cn("relative flex flex-col gap-1.5 text-sm", className)}>
      <span className="font-medium text-slate-700">{label}</span>

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border bg-surface px-3 py-2 text-left text-sm transition-colors outline-none",
          open
            ? "border-indigo-500 ring-2 ring-indigo-500/20"
            : "border-slate-300 hover:border-slate-400",
          disabled && "cursor-not-allowed bg-slate-50 opacity-60",
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {multiple ? (
            selectedSummary ? (
              <span className="truncate font-medium text-slate-900">{selectedSummary}</span>
            ) : (
              <span className="truncate text-slate-400">{placeholder}</span>
            )
          ) : activeSelection ? (
            <>
              <span className="truncate font-medium text-slate-900">
                {activeSelection.label}
              </span>
              {activeSelection.sublabel && (
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-500">
                  {activeSelection.sublabel}
                </span>
              )}
            </>
          ) : (
            <span className="truncate text-slate-400">{placeholder}</span>
          )}
        </span>

        <span className="flex shrink-0 items-center gap-1 text-slate-400">
          {allowClear && selectedCount > 0 && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              title="Clear selection"
              onClick={(event) => {
                event.stopPropagation();
                setCachedSelected(null);
                if (multiple) onValuesChange?.([]);
                else onChange("");
              }}
              className="rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={cn("transition-transform duration-150", open && "rotate-180 text-indigo-600")}
          />
        </span>
      </button>

      {dropdownMenu}

      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </div>
  );
}
