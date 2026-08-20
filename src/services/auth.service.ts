import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/Server";
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

async function ensureUniqueOrganizationSlug(baseName: string): Promise<string> {
  const supabase = await createClient();
  const baseSlug = createSlug(baseName) || "organization";

  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function registerOrganization(data: RegisterData) {
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
  const slug = await ensureUniqueOrganizationSlug(organizationName);

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
    throw new Error(authError?.message ?? "Unable to create user account.");
  }

  const supabase = await createClient();

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

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .insert(organizationPayload)
    .select()
    .single();

  if (organizationError || !organization) {
    throw new Error("Unable to create organization record.");
  }

  const { error: profileError } = await supabase.from("profiles").insert({
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
    throw new Error("Unable to create organization administrator profile.");
  }

  return {
    user: authData.user,
    organization,
  };
}