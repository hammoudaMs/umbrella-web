"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { errorText, useToast } from "@/components/Feedback";
import {
  Button,
  ErrorBanner,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { PRODUCT_TYPES } from "@/lib/product-types";
import {
  digitsOnly,
  normalizeEmail,
  validateSignup,
  type SignupFieldErrors,
  type SignupFormValues,
} from "@/lib/signup-validation";
import { TUNISIA_GOVERNORATES } from "@/lib/status-meta";
import { useT } from "@/i18n/locale-context";

const INITIAL: SignupFormValues = {
  role: "EXPEDITEUR",
  name: "",
  email: "",
  phone: "",
  password: "",
  confirm: "",
  governorate: "Tunis",
  city: "",
  address: "",
  productTypes: [],
  productNotes: "",
};

export default function SignupPage() {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { signUp } = useAuth();
  const [values, setValues] = useState<SignupFormValues>(INITIAL);
  const [errors, setErrors] = useState<SignupFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const showOtherNotes = useMemo(
    () => values.productTypes.includes("Autre"),
    [values.productTypes],
  );

  function patch<K extends keyof SignupFormValues>(
    key: K,
    value: SignupFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleProduct(type: string) {
    setValues((prev) => {
      const has = prev.productTypes.includes(type);
      return {
        ...prev,
        productTypes: has
          ? prev.productTypes.filter((x) => x !== type)
          : [...prev.productTypes, type],
      };
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const result = validateSignup(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await signUp({
        name: result.data.name,
        email: result.data.email,
        phone: result.data.phone,
        password: result.data.password,
        role: "EXPEDITEUR",
        governorate: result.data.governorate,
        city: result.data.city,
        address: result.data.address,
        productTypes: result.data.productTypes,
        productNotes: result.data.productNotes || undefined,
        shopName: result.data.name,
      });
      toast.success(t("auth.signupPendingToast"));
      router.replace("/compte-en-attente");
    } catch (err) {
      setFormError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={t("auth.signupTitle")}
      subtitle={t("auth.signupSubtitle")}
      footer={
        <>
          {t("auth.alreadyHaveAccount")}{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            {t("auth.submit")}
          </Link>
        </>
      }
    >
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        {formError ? <ErrorBanner message={formError} /> : null}

        <TextField
          label={t("common.name")}
          value={values.name}
          onChange={(e) => patch("name", e.target.value)}
          error={errors.name}
          autoComplete="name"
          required
        />
        <TextField
          label={t("common.email")}
          type="email"
          value={values.email}
          onChange={(e) => patch("email", normalizeEmail(e.target.value))}
          error={errors.email}
          autoComplete="email"
          required
        />
        <TextField
          label={t("common.phone")}
          value={values.phone}
          onChange={(e) => patch("phone", digitsOnly(e.target.value))}
          error={errors.phone}
          inputMode="numeric"
          autoComplete="tel"
          required
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label={t("auth.password")}
            type="password"
            value={values.password}
            onChange={(e) => patch("password", e.target.value)}
            error={errors.password}
            autoComplete="new-password"
            required
          />
          <TextField
            label={t("auth.confirmPassword")}
            type="password"
            value={values.confirm}
            onChange={(e) => patch("confirm", e.target.value)}
            error={errors.confirm}
            autoComplete="new-password"
            required
          />
        </div>

        <SelectField
          label={t("auth.governorate")}
          value={values.governorate}
          onChange={(e) => patch("governorate", e.target.value)}
          error={errors.governorate}
        >
          {TUNISIA_GOVERNORATES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </SelectField>
        <TextField
          label={t("auth.city")}
          value={values.city}
          onChange={(e) => patch("city", e.target.value)}
          error={errors.city}
          required
        />
        <TextAreaField
          label={t("common.address")}
          value={values.address}
          onChange={(e) => patch("address", e.target.value)}
          error={errors.address}
          rows={2}
          required
        />

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {t("auth.productTypes")}
          </legend>
          {errors.productTypes ? (
            <p className="text-xs text-[#E11D48]">{errors.productTypes}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {PRODUCT_TYPES.map((type) => {
              const on = values.productTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleProduct(type)}
                  className={
                    on
                      ? "rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white"
                      : "rounded-full border border-cream bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted hover:border-brand/40"
                  }
                >
                  {type}
                </button>
              );
            })}
          </div>
        </fieldset>

        {showOtherNotes ? (
          <TextField
            label={t("auth.productNotes")}
            value={values.productNotes}
            onChange={(e) => patch("productNotes", e.target.value)}
            error={errors.productNotes}
          />
        ) : null}

        <Button type="submit" icon={UserPlus} className="w-full" loading={busy}>
          {t("auth.signupSubmit")}
        </Button>
        <p className="text-center text-xs text-ink-muted">
          {t("auth.signupPendingHint")}
        </p>
      </form>
    </AuthLayout>
  );
}
