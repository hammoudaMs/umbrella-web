"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { CONTACT_INTEREST_KEYS } from "@/components/landing/landing-data";
import { useT } from "@/i18n/locale-context";

export function LandingContact() {
  const t = useT();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  function toggleInterest(value: string) {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/public/contact", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim() || undefined,
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim() || undefined,
          interests,
        }),
      });
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("landing.contactSendFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-[#EFE8E0] px-5 py-10 sm:px-6 sm:py-12 md:px-10 md:py-14"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(153,18,17,0.1) 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10">
        <div className="flex flex-col text-center lg:pe-4 lg:text-start">
          <p className="reveal text-[10px] font-semibold uppercase tracking-[0.24em] text-[#991211]/75 sm:text-[11px]">
            {t("landing.contactEyebrow")}
          </p>
          <h2 className="reveal mt-1.5 font-display text-[clamp(1.55rem,3.6vw,2.35rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-black sm:mt-2">
            {t("landing.contactTitle")}
          </h2>
          <p className="reveal mx-auto mt-2 max-w-sm text-[13px] leading-snug text-black/55 sm:text-[14px] lg:mx-0">
            {t("landing.contactLead")}
          </p>
          <div className="reveal mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] text-black/60 lg:justify-start">
            <a
              href="mailto:contact@umbrella.tn"
              className="keep-ltr font-medium text-[#991211] underline-offset-4 hover:underline"
              dir="ltr"
            >
              contact@umbrella.tn
            </a>
            <a
              href="tel:+21625025073"
              className="keep-ltr hover:text-[#991211]"
              dir="ltr"
            >
              +216 25 025 073
            </a>
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-white/90 p-4 ring-1 ring-black/[0.05] sm:p-5 md:p-6">
          {sent ? (
            <div className="flex flex-1 flex-col items-start justify-center">
              <h3 className="font-display text-xl font-semibold text-black sm:text-2xl">
                {t("landing.contactThanks")}
              </h3>
              <p className="mt-2 text-[13px] text-black/50 sm:text-sm">
                {t("landing.contactThanksBody")}
              </p>
              <Link
                href="/login"
                className="magnet mt-5 rounded-full bg-[#991211] px-6 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#7a0e0e]"
              >
                {t("landing.signIn")}
              </Link>
            </div>
          ) : (
            <form
              onSubmit={(e) => void onSubmit(e)}
              className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-3.5"
            >
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-3.5">
                <Field
                  label={t("landing.contactName")}
                  value={name}
                  onChange={setName}
                  placeholder="Sarra"
                  required
                />
                <Field
                  label={t("landing.contactShop")}
                  value={company}
                  onChange={setCompany}
                  placeholder="Atlas Mode"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-3.5">
                <Field
                  label={t("landing.contactEmail")}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="vous@boutique.tn"
                  required
                  ltr
                />
                <Field
                  label={t("landing.contactPhone")}
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                  placeholder="+216 …"
                  required
                  ltr
                />
              </div>

              <fieldset className="min-w-0">
                <legend className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">
                  {t("landing.contactInterests")}
                </legend>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CONTACT_INTEREST_KEYS.map((item) => {
                    const on = interests.includes(item.value);
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => toggleInterest(item.value)}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
                          on
                            ? "bg-[#991211] text-white"
                            : "bg-[#EFE8E0] text-black/60 hover:bg-[#E5DBD4]"
                        }`}
                      >
                        {t(item.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="min-h-0 flex-1">
                <label
                  htmlFor="contact-msg"
                  className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40"
                >
                  {t("landing.contactNeed")}
                </label>
                <textarea
                  id="contact-msg"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder={t("landing.contactNeedPlaceholder")}
                  className="mt-1.5 h-[calc(100%-1.25rem)] min-h-[4.5rem] w-full resize-none rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[13px] text-black outline-none placeholder:text-black/30 focus:border-[#991211]/40"
                />
              </div>

              {error ? (
                <p className="text-[12px] text-[#991211]">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="magnet mt-auto w-full shrink-0 rounded-full bg-[#991211] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#7a0e0e] disabled:opacity-60 sm:w-auto sm:px-9"
              >
                {busy ? t("landing.contactSending") : t("landing.contactSend")}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  ltr = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  type?: string;
  ltr?: boolean;
}) {
  const id = `field-${label}`;
  return (
    <div>
      <label
        htmlFor={id}
        className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={ltr ? "ltr" : undefined}
        className={`mt-1.5 w-full rounded-full border border-black/10 bg-white px-3.5 py-2 text-[13px] text-black outline-none placeholder:text-black/30 focus:border-[#991211]/40 ${
          ltr ? "keep-ltr" : ""
        }`}
      />
    </div>
  );
}
