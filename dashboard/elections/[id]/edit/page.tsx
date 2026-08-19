import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/Server";
import type { ElectionStatus } from "@/lib/validation/election";
import { getElectionForUser } from "@/services/elections/election.service";
import ElectionForm from "@/components/elections/ElectionForm";

export default async function EditElectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const election = await getElectionForUser(user.id, id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Edit election</h1>
        <p className="text-slate-500">Update details for {election.title}.</p>
      </div>

      <ElectionForm
        mode="edit"
        electionId={election.id}
        defaultValues={{
          title: election.title,
          description: election.description ?? "",
          status: election.status as ElectionStatus,
          starts_at: new Date(election.starts_at).toISOString().slice(0, 16),
          ends_at: new Date(election.ends_at).toISOString().slice(0, 16),
        }}
      />
    </div>
  );
}
