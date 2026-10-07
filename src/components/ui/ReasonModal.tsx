"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

/** Replaces window.prompt() for the"enter a reason/notes and confirm"pattern used across the
 * maker-checker and dispute-resolution flows. */
export function ReasonModal({
  open,
  title,
  label,
  confirmLabel = "Confirm",
  danger,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  label: string;
  confirmLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm(reason);
      setReason("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={handleConfirm}
            loading={submitting}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <textarea
          autoFocus
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>
    </Modal>
  );
}
