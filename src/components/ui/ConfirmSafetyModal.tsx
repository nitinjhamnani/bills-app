"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Field } from "./Field";

export function ConfirmSafetyModal({
  open,
  title,
  description,
  confirmMatchText,
  danger = true,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmMatchText: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [typedText, setTypedText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isValid = typedText.trim().toLowerCase() === confirmMatchText.trim().toLowerCase();

  async function handleConfirm() {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await onConfirm();
      setTypedText("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={handleConfirm}
            disabled={!isValid}
            loading={submitting}
          >
            Confirm action
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          To prevent accidental changes in high-risk environments, please type{" "}
          <strong className="font-mono text-slate-800">{confirmMatchText}</strong> below to enable confirmation:
        </p>
        <Field
          label="Verification phrase"
          value={typedText}
          onChange={(e) => setTypedText(e.target.value)}
          placeholder={confirmMatchText}
        />
      </div>
    </Modal>
  );
}
