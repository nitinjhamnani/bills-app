"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import {
  REPORT_MAX_RANGE_DAYS,
  daysAgoIso,
  formatIstDate,
  inclusiveDays,
  lastMonthRange,
  thisMonthStartIso,
  todayIso,
} from "@/lib/report-format";

export { daysAgoIso, todayIso, thisMonthStartIso, lastMonthRange } from "@/lib/report-format";

export type DatePreset = "CUSTOM" | "7D" | "30D" | "THIS_MONTH" | "LAST_MONTH";

export const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "CUSTOM", label: "Pick dates" },
  { key: "7D", label: "Last 7 days" },
  { key: "30D", label: "Last 30 days" },
  { key: "THIS_MONTH", label: "This month" },
  { key: "LAST_MONTH", label: "Last month" },
];

export function rangeForPreset(preset: DatePreset) {
  const today = todayIso();
  if (preset === "7D") return { from: daysAgoIso(7), to: today };
  if (preset === "30D") return { from: daysAgoIso(30), to: today };
  if (preset === "THIS_MONTH") return { from: thisMonthStartIso(), to: today };
  if (preset === "LAST_MONTH") return lastMonthRange();
  return { from: today, to: today };
}

export function presetLabel(preset: DatePreset) {
  return DATE_PRESETS.find((item) => item.key === preset)?.label ?? "Pick dates";
}

export function useReportRange() {
  const today = todayIso();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [preset, setPreset] = useState<DatePreset>("CUSTOM");
  const [applied, setApplied] = useState({ from: today, to: today });
  const [appliedPreset, setAppliedPreset] = useState<DatePreset>("CUSTOM");
  const [generated, setGenerated] = useState(false);

  function selectPreset(next: DatePreset) {
    setPreset(next);
    if (next !== "CUSTOM") {
      const range = rangeForPreset(next);
      setFrom(range.from);
      setTo(range.to);
    }
  }

  function run(range?: { from: string; to: string }) {
    const next = range ?? { from, to };
    setApplied(next);
    setAppliedPreset(preset);
    setGenerated(true);
  }

  function resetDraft() {
    if (generated) {
      setFrom(applied.from);
      setTo(applied.to);
      setPreset(appliedPreset);
      return;
    }
    const next = todayIso();
    setFrom(next);
    setTo(next);
    setPreset("CUSTOM");
  }

  return {
    from,
    to,
    setFrom,
    setTo,
    preset,
    setPreset: selectPreset,
    applied,
    appliedPreset,
    generated,
    run,
    resetDraft,
  };
}

export type ReportRange = ReturnType<typeof useReportRange>;

export function reportPeriodDescription(range: ReportRange, idle: string) {
  if (!range.generated) return idle;
  return `Showing ${formatIstDate(range.applied.from)} to ${formatIstDate(range.applied.to)}.`;
}

export type DateRangeFilterHandle = { open: () => void };

type DateRangeFilterProps = {
  range: ReportRange;
  extras?: React.ReactNode;
  appliedSummary?: string;
  running?: boolean;
  onGenerate?: () => void;
  onCancel?: () => void;
  variant?: "bar" | "button";
  openLabel?: string;
  changeLabel?: string;
  modalTitle?: string;
  modalDescription?: string;
  confirmLabel?: string;
};

export const DateRangeFilter = forwardRef<DateRangeFilterHandle, DateRangeFilterProps>(
  function DateRangeFilter(
    {
      range,
      extras,
      appliedSummary,
      running,
      onGenerate,
      onCancel,
      variant = "button",
      openLabel = "Choose dates",
      changeLabel = "Change dates",
      modalTitle = "Choose dates",
      modalDescription = "Pick a period, then show the report.",
      confirmLabel = "Show",
    },
    ref,
  ) {
    const [open, setOpen] = useState(false);
    const days = inclusiveDays(range.from, range.to);
    const invalid = !range.from || !range.to || days < 1 || days > REPORT_MAX_RANGE_DAYS;
    const locked = range.preset !== "CUSTOM";
    const triggerLabel = range.generated ? changeLabel : openLabel;

    useImperativeHandle(ref, () => ({ open: () => setOpen(true) }), []);

    function cancel() {
      range.resetDraft();
      onCancel?.();
      setOpen(false);
    }

    function generate() {
      if (invalid) return;
      range.run({ from: range.from, to: range.to });
      onGenerate?.();
      setOpen(false);
    }

    const trigger = (
      <Button
        size="sm"
        variant={range.generated ? "outline" : "primary"}
        icon={<CalendarDays size={14} />}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>
    );

    return (
      <>
        {variant === "button" ? (
          trigger
        ) : (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {trigger}
            {range.generated && (
              <p className="text-xs font-medium text-slate-500">
                {formatIstDate(range.applied.from)} – {formatIstDate(range.applied.to)}
                {range.appliedPreset !== "CUSTOM" ? ` · ${presetLabel(range.appliedPreset)}` : ""}
                {appliedSummary ? ` · ${appliedSummary}` : ""}
              </p>
            )}
          </div>
        )}
        <Modal
          open={open}
          onClose={cancel}
          title={modalTitle}
          description={modalDescription}
          footer={
            <>
              <Button variant="outline" onClick={cancel}>
                Cancel
              </Button>
              <Button onClick={generate} disabled={invalid} loading={running}>
                {confirmLabel}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">Quick period</p>
              <div className="flex flex-wrap gap-1.5">
                {DATE_PRESETS.map((item) => {
                  const active = range.preset === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => range.setPreset(item.key)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        active
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Start date"
                type="date"
                value={range.from}
                max={range.to || undefined}
                readOnly={locked}
                disabled={locked}
                onChange={(e) => range.setFrom(e.target.value)}
                className={cn(locked && "[&_input]:bg-slate-50 [&_input]:text-slate-500")}
              />
              <Field
                label="End date"
                type="date"
                value={range.to}
                min={range.from || undefined}
                max={todayIso()}
                readOnly={locked}
                disabled={locked}
                onChange={(e) => range.setTo(e.target.value)}
                className={cn(locked && "[&_input]:bg-slate-50 [&_input]:text-slate-500")}
              />
            </div>
            <p className="text-[11px] font-medium text-slate-400">
              {locked
                ? "Start and end dates are filled in from the period you picked. Choose Pick dates to type your own."
                : "Dates start as today. Pick a period above, or type your own dates."}
            </p>
            {invalid && range.from && range.to && (
              <p className="text-[11px] font-medium text-rose-600">
                Please keep the range between 1 and {REPORT_MAX_RANGE_DAYS} days.
              </p>
            )}
            {extras && <div className="grid gap-3 sm:grid-cols-2 [&_label]:w-full">{extras}</div>}
          </div>
        </Modal>
      </>
    );
  },
);
