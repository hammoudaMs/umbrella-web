"use client";

import { SettingsForm } from "@/components/SettingsForm";
import { useT } from "@/i18n/locale-context";

export default function FinanceSettingsPage() {
  const t = useT();
  return <SettingsForm description={t("settings.descFinance")} />;
}