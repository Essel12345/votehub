import { z } from "zod";

export const registerSchema = z
  .object({
    organizationName: z
      .string()
      .trim()
      .min(3, "Organization name must be at least 3 characters"),
    organizationType: z
      .string()
      .trim()
      .min(2, "Organization type is required")
      .optional()
      .default("NONPROFIT"),
    country: z
      .string()
      .trim()
      .min(2, "Country is required"),
    timezone: z
      .string()
      .trim()
      .min(2, "Timezone is required"),
    currency: z.string().trim().optional().or(z.literal("")),
    locale: z.string().trim().optional().or(z.literal("")),
    contactEmail: z
      .string()
      .trim()
      .email("Please enter a valid contact email")
      .optional()
      .or(z.literal("")),
    contactPhone: z.string().trim().max(32).optional().or(z.literal("")),
    website: z.string().trim().url("Please enter a valid URL").optional().or(z.literal("")),
    adminName: z
      .string()
      .trim()
      .min(2, "Administrator name is required"),
    firstName: z
      .string()
      .trim()
      .min(2, "First name is required")
      .optional(),
    lastName: z
      .string()
      .trim()
      .min(2, "Last name is required")
      .optional(),
    email: z
      .string()
      .trim()
      .email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[0-9]/, "Password must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;