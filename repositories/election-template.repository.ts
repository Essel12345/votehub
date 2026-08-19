import { createClient } from "@/lib/supabase/Server";

export interface ElectionTemplateRecord {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  description: string | null;
  slug: string | null;
  template_data: Record<string, unknown>;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export async function listElectionTemplatesForOrganization(organizationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("election_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ElectionTemplateRecord[];
}

export async function createElectionTemplate(input: {
  organization_id: string;
  created_by: string;
  name: string;
  description?: string | null;
  slug?: string | null;
  template_data: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("election_templates")
    .insert({
      organization_id: input.organization_id,
      created_by: input.created_by,
      name: input.name,
      description: input.description ?? null,
      slug: input.slug ?? null,
      template_data: input.template_data,
      is_archived: false,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as ElectionTemplateRecord;
}

export async function getElectionTemplateById(templateId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("election_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ElectionTemplateRecord | null) ?? null;
}

export async function updateElectionTemplate(
  templateId: string,
  updates: Partial<Pick<ElectionTemplateRecord, "name" | "description" | "slug" | "template_data" | "is_archived">>
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("election_templates")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as ElectionTemplateRecord;
}

export async function deleteElectionTemplate(templateId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("election_templates").delete().eq("id", templateId);
  if (error) {
    throw error;
  }

  return true;
}
