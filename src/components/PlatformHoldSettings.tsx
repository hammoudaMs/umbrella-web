"use client";

import { FormEvent, useEffect, useState } from "react";
import { Hourglass, Save } from "lucide-react";
import { errorText, useToast } from "@/components/Feedback";
import { Button, Panel, TextField } from "@/components/ui";
import { useApi, useApiQuery } from "@/lib/use-api";
import { useT } from "@/i18n/locale-context";

type PlatformSettings = { versementHoldHours: number };

export function PlatformHoldSettings({
  readOnly = false,
}: {
  readOnly?: boolean;
}) {
  const request = useApi();
  const toast = useToast();
  const t = useT();
  const query = useApiQuery<PlatformSettings>("/settings/platform");
  const [hours, setHours] = useState("48");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (query.data?.versementHoldHours != null) {
      setHours(String(query.data.versementHoldHours));
    }
  }, [query.data?.versementHoldHours]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    const n = Number(hours);
    if (!Number.isFinite(n) || n < 1 || n > 720) {
      toast.error(t("settings.holdHoursInvalid"));
      return;
    }
    setSaving(true);
    try {
      const updated = await request<PlatformSettings>(
        "/settings/platform",
        "PATCH",
        { versementHoldHours: Math.floor(n) },
      );
      setHours(String(updated.versementHoldHours));
      toast.success(t("common.success"));
      await query.reload();
    } catch (err) {
      toast.error(t("common.error"), errorText(err));
    } finally {
      setSaving(false);
    }
  }

  const displayHours =
    query.data?.versementHoldHours ?? (Number(hours) || 48);

  return (
    <Panel>
      <div className="mb-4 flex items-center gap-2">
        <Hourglass className="h-4 w-4 text-ops-accent" aria-hidden />
        <h2 className="font-display text-lg font-bold text-ops-ink">
          {t("settings.versementHold")}
        </h2>
      </div>
      <p className="mb-4 text-sm text-ops-ink/50">
        {t("settings.versementHoldHint")}
      </p>
      {readOnly ? (
        <p className="text-sm font-semibold text-ops-ink">
          {t("settings.holdHoursReadonly", { hours: displayHours })}
        </p>
      ) : (
        <form
          onSubmit={(e) => void onSave(e)}
          className="flex flex-wrap items-end gap-3"
        >
          <TextField
            name="versementHoldHours"
            label={t("settings.holdHoursLabel")}
            type="number"
            min={1}
            max={720}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="w-40"
          />
          <Button type="submit" icon={Save} loading={saving || query.loading}>
            {t("common.save")}
          </Button>
        </form>
      )}
    </Panel>
  );
}
