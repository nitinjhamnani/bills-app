"use client";

import { useEffect, useState } from "react";
import { trackedFetch } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { Modal } from "@/components/ui/Modal";
import { API_BASE_URL } from "@/lib/workspace";

/**
 * Shows a stored payment proof inside the app. The file is loaded through our API, so the
 * storage bucket is never opened directly.
 */
export function ProofModal({
  documentId,
  onClose,
}: {
  documentId: string | null;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null);
    setError(null);
    setContentType("");

    (async () => {
      try {
        const res = await trackedFetch(`${API_BASE_URL}/api/v1/documents/${documentId}/file`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setContentType(res.headers.get("content-type") ?? blob.type);
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setError("Could not open the payment proof");
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [documentId]);

  const image = contentType.startsWith("image/");
  const pdf = contentType.includes("pdf");

  return (
    <Modal open={documentId !== null} onClose={onClose} title="Payment proof" size="xl" raised>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !url ? (
        <p className="text-sm text-slate-500">Loading proof…</p>
      ) : image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Payment proof" className="mx-auto max-h-[65dvh] w-full object-contain" />
      ) : pdf ? (
        <iframe title="Payment proof" src={url} className="h-[65dvh] w-full rounded-lg border border-slate-200" />
      ) : (
        <iframe title="Payment proof" src={url} className="h-[65dvh] w-full rounded-lg border border-slate-200" />
      )}
    </Modal>
  );
}
