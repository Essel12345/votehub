import { createClient } from "@/lib/supabase/Server";
import { getProfile } from "@/repositories/Profile.repository";
import { listAuditLogsForOrganization } from "@/lib/audit/audit.service";

export default async function SecurityPage() {
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
    pageSize: 5,
  });

  const failedLogins = logs.filter((log) => log.action === "AUTH_LOGIN_FAILED").length;
  const securityEvents = logs.filter((log) => log.action.includes("SECURITY") || log.action === "AUTH_LOGIN_FAILED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Security Center</h1>
        <p className="text-slate-500">Operational controls, event visibility, and policy enforcement.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Protected routes</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">Active</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Failed logins</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{failedLogins}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Security events</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{securityEvents}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Protected controls</h2>
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          <li>• Organization-scoped audit access with tenant isolation checks.</li>
          <li>• No raw ballot selections are included in security logs or summaries.</li>
          <li>• Authentication failures are recorded without storing passwords or tokens.</li>
          <li>• Security headers are enforced at the application edge for protected routes.</li>
        </ul>
      </div>
    </div>
  );
}
