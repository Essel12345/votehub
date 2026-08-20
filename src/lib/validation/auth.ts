import { z } from "zod";

export const registerSchema = z
  .object({
    organizationName: z
      .string()
      .trim()
      .min(2, "Organization name must be at least 2 characters"),
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
    currency: z
      .string()
      .trim()
      .min(2, "Currency is required when needed")
      .optional(),
    locale: z
      .string()
      .trim()
      .min(2, "Locale is required when needed")
      .optional(),
    contactEmail: z
      .string()
      .trim()
      .email("Please enter a valid contact email")
      .optional()
      .or(z.literal("")),
    contactPhone: z
      .string()
      .trim()
      .max(32, "Phone number is too long")
      .optional()
      .or(z.literal("")),
    website: z
      .string()
      .trim()
      .max(255, "Website is too long")
      .optional()
      .or(z.literal("")),
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
    email: z.string().trim().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[0-9]/, "Password must contain a number"),
  });

export type RegisterRequest = z.infer<typeof registerSchema>;
