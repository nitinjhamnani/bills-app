"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { AuditLogView } from "@/components/AuditLogView";
import { useToast } from "@/components/ui/Toast";
import type { AuditLogEntry } from "@/lib/types";

export default function PlatformAuditLogPage() {
  const toast = useToast();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<AuditLogEntry[]>("/api/v1/platform/audit-log")
      .then(setEntries)
      .catch((err) =>
        toast.error(err instanceof ApiError ? err.message : "Failed to load audit log"),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuditLogView
      title="Audit log"
      description="Platform actions across organisations, newest first."
      entries={entries}
      loading={loading}
    />
  );
}
