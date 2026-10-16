"use client";

import { useEffect, useId, useState } from "react";
import { Camera, FileText, Trash2, Upload } from "lucide-react";
import { errorText, useToast } from "@/components/Feedback";
import { Button } from "@/components/ui";
import { apiUpload } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mediaUrl, type UploadKind } from "@/lib/media";
import { cn } from "@/lib/cn";

type Props = {
  label: string;
  kind: UploadKind;
  value: string | null;
  onChange: (url: string | null) => void;
  required?: boolean;
  hint?: string;
  capture?: boolean;
  className?: string;
};

export function DocumentUploadField({
  label,
  kind,
  value,
  onChange,
  required,
  hint,
  capture = true,
  className,
}: Props) {
  const id = useId();
  const { session } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  async function onFile(file: File | null) {
    if (!file) return;
    if (!session?.accessToken) {
      toast.error("Session requise pour l’upload");
      return;
    }
    if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    setLocalPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const uploaded = await apiUpload(file, session.accessToken, kind);
      onChange(uploaded.url);
      toast.success("Document envoyé");
    } catch (err) {
      toast.error("Upload impossible", errorText(err));
      setLocalPreview(null);
      onChange(null);
    } finally {
      setBusy(false);
    }
  }

  const previewSrc = localPreview || (value ? mediaUrl(value) : "");
  const isPdf = Boolean(value?.toLowerCase().endsWith(".pdf"));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ops-ink">
          {label}
          {required ? <span className="text-brand"> *</span> : null}
        </label>
        {value ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-semibold text-ops-ink/50 hover:text-brand"
            onClick={() => {
              if (localPreview?.startsWith("blob:")) {
                URL.revokeObjectURL(localPreview);
              }
              setLocalPreview(null);
              onChange(null);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Retirer
          </button>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-ops-ink/45">{hint}</p> : null}

      {previewSrc ? (
        <a
          href={mediaUrl(value) || previewSrc}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-xl border border-ops-card bg-ops-page/40"
        >
          {isPdf ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm font-medium text-ops-ink">
              <FileText className="h-5 w-5 text-brand" aria-hidden />
              Document PDF — ouvrir
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt={label}
              className="max-h-48 w-full object-contain"
            />
          )}
        </a>
      ) : (
        <label
          htmlFor={id}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ops-card bg-ops-page/30 px-4 py-8 text-center transition hover:border-brand/50",
            busy && "pointer-events-none opacity-60",
          )}
        >
          {capture ? (
            <Camera className="h-7 w-7 text-brand" aria-hidden />
          ) : (
            <Upload className="h-7 w-7 text-brand" aria-hidden />
          )}
          <span className="text-sm font-semibold text-ops-ink">
            {busy ? "Envoi…" : "Photo ou PDF"}
          </span>
          <span className="text-xs text-ops-ink/45">Max 8 Mo · image / PDF</span>
        </label>
      )}

      <input
        id={id}
        type="file"
        accept="image/*,application/pdf"
        capture={capture ? "environment" : undefined}
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          void onFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />

      {value || previewSrc ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={Upload}
            loading={busy}
            onClick={() => document.getElementById(id)?.click()}
          >
            Remplacer
          </Button>
        </div>
      ) : null}
    </div>
  );
}
