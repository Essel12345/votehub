import Link from "next/link";

import { listTemplatesForUser } from "@/services/elections/election-template.service";
import { createClient } from "@/lib/supabase/Server";

export default async function ElectionTemplatesPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">You must be signed in to manage templates.</div>;
  }

  const templates = await listTemplatesForUser(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Election templates</h1>
          <p className="text-slate-500">Reuse safe election configuration across your organization.</p>
        </div>
        <Link href="/dashboard/elections/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Create from template</Link>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
          No templates yet. Save a reusable voting configuration to start creating elections faster.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">{template.name}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs uppercase text-slate-600">{template.is_archived ? "Archived" : "Active"}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{template.description ?? "No description"}</p>
              <div className="mt-4 flex gap-2">
                <Link href="/dashboard/elections/new" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Use template</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
