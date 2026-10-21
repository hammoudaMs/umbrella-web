"use client";

import { FormEvent, useState } from "react";
import { KeyRound, Save, UserRound } from "lucide-react";
import { LocaleToggle } from "@/components/LocaleToggle";
import { errorText, useToast } from "@/components/Feedback";
import { PlatformHoldSettings } from "@/components/PlatformHoldSettings";
import { SenderParcelInputsSettings } from "@/components/SenderParcelInputsSettings";
import { Avatar, Badge, Button, PageHeader, Panel, TextField } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { roleLabel } from "@/lib/roles";
import { useT } from "@/i18n/locale-context";

type ProfileErrors = Partial<Record<"name" | "email" | "phone", string>>;
type PasswordErrors = Partial<Record<"current" | "next" | "confirm", string>>;

export function SettingsForm({
  description,
}: {
  description?: string;
}) {
  const { session, updateProfile, changePassword } = useAuth();
  const toast = useToast();
  const t = useT();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});

  if (!session) return null;
  const { user } = session;

  async function onSaveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const errors: ProfileErrors = {};
    if (name.length < 2) errors.name = t("common.name");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = t("common.email");
    if (phone && !/^[0-9]{8}$/.test(phone)) errors.phone = "8";
    setProfileErrors(errors);
    if (Object.keys(errors).length) return;

    setSavingProfile(true);
    try {
      await updateProfile({ name, email, phone: phone || undefined });
      toast.success(t("common.success"));
    } catch (err) {
      toast.error(t("common.error"), errorText(err));
    } finally {
      setSavingProfile(false);
    }
  }

  async function onChangePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const current = String(form.get("current") ?? "");
    const next = String(form.get("next") ?? "");
    const confirmValue = String(form.get("confirm") ?? "");
    const errors: PasswordErrors = {};
    if (!current) errors.current = t("common.required");
    if (next.length < 8) errors.next = "8";
    if (confirmValue !== next) errors.confirm = t("common.error");
    setPasswordErrors(errors);
    if (Object.keys(errors).length) return;

    setSavingPassword(true);
    try {
      await changePassword(current, next);
      formEl.reset();
      toast.success(t("settings.changePassword"));
    } catch (err) {
      toast.error(t("common.error"), errorText(err));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t("settings.title")}
        description={description ?? t("settings.profile")}
      />

      <Panel className="flex flex-wrap items-center gap-4">
        <Avatar name={user.name} className="h-14 w-14 text-base" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl font-bold text-ops-ink">
            {user.name}
          </p>
          <p className="truncate text-sm text-ops-ink/50 keep-ltr">{user.email}</p>
        </div>
        <Badge tone="brand">{roleLabel(user.role, t)}</Badge>
      </Panel>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-ops-ink">
            {t("settings.language")}
          </h2>
          <LocaleToggle />
        </div>
      </Panel>

      {user.role === "EXPEDITEUR" ? <SenderParcelInputsSettings /> : null}

      {user.role === "SUPER_ADMIN" || user.role === "ADMIN" ? (
        <PlatformHoldSettings />
      ) : null}

      {user.role === "FINANCE" ||
      user.role === "CHEF_AGENCE" ||
      user.role === "EXPERT_COMPTABLE" ? (
        <PlatformHoldSettings readOnly />
      ) : null}

      <Panel>
        <div className="mb-4 flex items-center gap-2">
          <UserRound className="h-4 w-4 text-ops-accent" aria-hidden />
          <h2 className="font-display text-lg font-bold text-ops-ink">
            {t("settings.profile")}
          </h2>
        </div>
        <form onSubmit={onSaveProfile} noValidate className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="name"
            label={t("common.name")}
            defaultValue={user.name}
            autoComplete="name"
            error={profileErrors.name}
            wrapperClassName="sm:col-span-2"
          />
          <TextField
            name="email"
            type="email"
            label={t("common.email")}
            defaultValue={user.email}
            autoComplete="email"
            error={profileErrors.email}
          />
          <TextField
            name="phone"
            label={t("common.phone")}
            inputMode="numeric"
            defaultValue={user.phone ?? ""}
            autoComplete="tel"
            error={profileErrors.phone}
          />
          <div className="sm:col-span-2">
            <Button type="submit" icon={Save} loading={savingProfile}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel>
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-ops-accent" aria-hidden />
          <h2 className="font-display text-lg font-bold text-ops-ink">
            {t("settings.security")}
          </h2>
        </div>
        <form
          onSubmit={onChangePassword}
          noValidate
          className="grid gap-4 sm:grid-cols-3"
        >
          <TextField
            name="current"
            type="password"
            label={t("auth.password")}
            autoComplete="current-password"
            error={passwordErrors.current}
          />
          <TextField
            name="next"
            type="password"
            label={t("settings.changePassword")}
            autoComplete="new-password"
            error={passwordErrors.next}
          />
          <TextField
            name="confirm"
            type="password"
            label={t("common.confirm")}
            autoComplete="new-password"
            error={passwordErrors.confirm}
          />
          <div className="sm:col-span-3">
            <Button
              type="submit"
              variant="secondary"
              icon={KeyRound}
              loading={savingPassword}
            >
              {t("settings.changePassword")}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
