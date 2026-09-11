import { adminClient } from "@/lib/supabase/admin";
import { createSlug } from "@/lib/utils/slug";
import { registerSchema } from "@/lib/validation/auth";

export interface RegisterData {
  organizationName: string;
  organizationType?: string;
  country: string;
  timezone: string;
  currency?: string;
  locale?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  adminName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
}

type SupabaseErrorLike = {
  code?: unknown;
  status?: unknown;
  statusCode?: unknown;
  message?: unknown;
};

function sanitizeDiagnosticMessage(error: unknown): string {
  const candidate = error as SupabaseErrorLike;
  const message = typeof candidate?.message === "string" ? candidate.message : "Unknown error";

  return message
    .replace(/[\r\n]+/g, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[redacted-phone]")
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .slice(0, 300);
}

function logRegistrationOperation(
  correlationId: string,
  operation: string,
  success: boolean,
  error?: unknown
) {
  const candidate = error as SupabaseErrorLike | undefined;
  const diagnostic = {
    operation,
    success,
    errorCode: typeof candidate?.code === "string" ? candidate.code : "",
    status: String(candidate?.status ?? candidate?.statusCode ?? ""),
    message: success ? "" : sanitizeDiagnosticMessage(error),
    correlationId,
  };

  if (success) {
    console.info(diagnostic);
  } else {
    console.error(diagnostic);
  }
}

async function ensureUniqueOrganizationSlug(baseName: string, correlationId: string): Promise<string> {
  const baseSlug = createSlug(baseName) || "organization";

  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const { data, error } = await adminClient
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();

    if (error) {
      logRegistrationOperation(correlationId, "organization slug lookup", false, error);
      throw error;
    }

    if (!data) {
      logRegistrationOperation(correlationId, "organization slug lookup", true);
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function registerOrganization(data: RegisterData, correlationId: string) {
  const payload = registerSchema.parse(data);

  const {
    email,
    password,
    organizationName,
    organizationType,
    country,
    timezone,
    currency,
    locale,
    contactEmail,
    contactPhone,
    website,
    adminName,
    firstName,
    lastName,
  } = payload;

  const firstNameValue = firstName?.trim() || adminName?.split(" ")[0]?.trim() || "Administrator";
  const lastNameValue = lastName?.trim() || adminName?.split(" ").slice(1).join(" ").trim() || "User";
  const contactEmailValue = contactEmail?.trim() || email;
  const slug = await ensureUniqueOrganizationSlug(organizationName, correlationId);

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      organization_name: organizationName,
      organization_type: organizationType ?? "NONPROFIT",
      first_name: firstNameValue,
      last_name: lastNameValue,
      admin_name: adminName || `${firstNameValue} ${lastNameValue}`.trim(),
      country,
      timezone,
      currency: currency ?? null,
      locale: locale ?? null,
      role: "ORG_ADMIN",
    },
  });

  if (authError || !authData.user) {
    logRegistrationOperation(correlationId, "Supabase Auth user creation", false, authError);
    throw new Error(authError?.message ?? "Unable to create user account.");
  }

  logRegistrationOperation(correlationId, "Supabase Auth user creation", true);

  const organizationPayload = {
    name: organizationName,
    slug,
    country,
    timezone,
    status: "PENDING",
    description: organizationType ?? "Organization profile under review.",
    website: website || null,
    contact_email: contactEmailValue || null,
    contact_phone: contactPhone || null,
  };

  const { data: organization, error: organizationError } = await adminClient
    .from("organizations")
    .insert(organizationPayload)
    .select()
    .single();

  if (organizationError || !organization) {
    logRegistrationOperation(correlationId, "organization INSERT", false, organizationError);
    throw new Error("Unable to create organization record.");
  }

  logRegistrationOperation(correlationId, "organization INSERT", true);

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: authData.user.id,
    email,
    full_name: adminName || `${firstNameValue} ${lastNameValue}`.trim(),
    organization_id: organization.id,
    role: "ORGANIZATION_ADMIN",
    country,
    timezone,
    is_active: true,
  });

  if (profileError) {
    logRegistrationOperation(correlationId, "profile INSERT", false, profileError);
    throw new Error("Unable to create organization administrator profile.");
  }

  logRegistrationOperation(correlationId, "profile INSERT", true);

  return {
    user: authData.user,
    organization,
  };
}