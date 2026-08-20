import { createClient } from "@/lib/supabase/Server";
import { getProfile } from "@/repositories/Profile.repository";
import { listAuditLogsForOrganization } from "@/lib/audit/audit.service";

export default async function AuditLogsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">Unauthorized.</div>;
  }

  const profile = await getProfile(user.id);
  if (!profile || !profile.organization_id) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">Organization access required.</div>;
  }

  const { logs = [] } = await listAuditLogsForOrganization(user.id, profile.organization_id, {
    page: 1,
    pageSize: 25,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-slate-500">Administrative actions and security events for this organization.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Date</th>
                <th className="px-4 py-3 font-medium text-slate-700">Actor</th>
                <th className="px-4 py-3 font-medium text-slate-700">Action</th>
                <th className="px-4 py-3 font-medium text-slate-700">Entity</th>
                <th className="px-4 py-3 font-medium text-slate-700">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No audit events found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-600">{log.actor_id ?? "SYSTEM"}</td>
                    <td className="px-4 py-3 text-slate-700">{log.action}</td>
                    <td className="px-4 py-3 text-slate-700">{log.entity_type}</td>
                    <td className="px-4 py-3 text-slate-600">{JSON.stringify(log.metadata ?? {})}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
