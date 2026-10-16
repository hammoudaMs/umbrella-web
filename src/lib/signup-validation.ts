import { z } from "zod";
import { PRODUCT_TYPES } from "@/lib/product-types";
import { TUNISIA_GOVERNORATES } from "@/lib/status-meta";

export type SignupRole = "EXPEDITEUR";

export type SignupField =
  | "name"
  | "email"
  | "phone"
  | "password"
  | "confirm"
  | "governorate"
  | "city"
  | "address"
  | "productTypes"
  | "productNotes";

export type SignupFormValues = {
  role: SignupRole;
  name: string;
  email: string;
  phone: string;
  password: string;
  confirm: string;
  governorate: string;
  city: string;
  address: string;
  productTypes: string[];
  productNotes: string;
};

export type SignupFieldErrors = Partial<Record<SignupField, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9]{8}$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const PRODUCT_SET = new Set<string>(PRODUCT_TYPES);
const GOV_SET = new Set<string>(TUNISIA_GOVERNORATES);

export function digitsOnly(value: string, max = 8): string {
  return value.replace(/\D/g, "").slice(0, max);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

const baseSchema = z.object({
  role: z.literal("EXPEDITEUR"),
  name: z
    .string()
    .trim()
    .min(2, "Nom trop court (2 caractères minimum)")
    .max(80, "Nom trop long (80 caractères max)"),
  email: z
    .string()
    .trim()
    .min(1, "Email requis")
    .refine((v) => EMAIL_RE.test(v), "Email invalide"),
  phone: z
    .string()
    .trim()
    .refine((v) => PHONE_RE.test(v), "Téléphone : 8 chiffres"),
  password: z
    .string()
    .min(8, "8 caractères minimum")
    .refine(
      (v) => PASSWORD_RE.test(v),
      "Au moins une lettre et un chiffre",
    ),
  confirm: z.string().min(1, "Confirmation requise"),
  governorate: z
    .string()
    .trim()
    .min(1, "Gouvernorat requis")
    .refine((v) => GOV_SET.has(v), "Gouvernorat invalide"),
  city: z
    .string()
    .trim()
    .min(2, "Ville requise")
    .max(80, "Ville trop longue"),
  address: z
    .string()
    .trim()
    .min(3, "Adresse trop courte (3 caractères minimum)")
    .max(200, "Adresse trop longue"),
  productTypes: z.array(z.string()),
  productNotes: z.string(),
});

export const signupSchema = baseSchema.superRefine((data, ctx) => {
  if (data.password !== data.confirm) {
    ctx.addIssue({
      code: "custom",
      path: ["confirm"],
      message: "Les mots de passe ne correspondent pas",
    });
  }

  const types = data.productTypes.map((t) => t.trim()).filter(Boolean);
  if (types.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["productTypes"],
      message: "Choisissez au moins un type de produit",
    });
  }
  for (const type of types) {
    if (!PRODUCT_SET.has(type)) {
      ctx.addIssue({
        code: "custom",
        path: ["productTypes"],
        message: "Type de produit invalide",
      });
      break;
    }
  }
  if (types.includes("Autre") && data.productNotes.trim().length < 2) {
    ctx.addIssue({
      code: "custom",
      path: ["productNotes"],
      message: "Précisez le type de produit",
    });
  }
});

export function validateSignup(
  values: SignupFormValues,
): { ok: true; data: SignupFormValues } | { ok: false; errors: SignupFieldErrors } {
  const parsed = signupSchema.safeParse({
    ...values,
    role: "EXPEDITEUR",
    name: values.name.trim(),
    email: normalizeEmail(values.email),
    phone: digitsOnly(values.phone),
    governorate: values.governorate.trim(),
    city: values.city.trim(),
    address: values.address.trim(),
    productNotes: values.productNotes.trim(),
  });

  if (parsed.success) {
    return {
      ok: true,
      data: {
        ...parsed.data,
        productTypes: parsed.data.productTypes,
        productNotes: parsed.data.productNotes.trim(),
      },
    };
  }

  const errors: SignupFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in errors)) {
      errors[key as SignupField] = issue.message;
    }
  }
  return { ok: false, errors };
}

export function validateSignupField(
  field: SignupField,
  values: SignupFormValues,
): string | undefined {
  const result = validateSignup(values);
  if (result.ok) return undefined;
  return result.errors[field];
}
