import Link from "next/link";

import ElectionStatusBadge from "@/components/elections/ElectionStatusBadge";

export type ElectionRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

type ElectionTableProps = {
  elections: ElectionRow[];
};

export default function ElectionTable({ elections }: ElectionTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Title
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Starts
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ends
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-200">
          {elections.map((election) => (
            <tr key={election.id} className="hover:bg-slate-50">
              <td className="px-4 py-4">
                <div className="font-medium text-slate-900">
                  {election.title}
                </div>

                <div className="mt-1 text-sm text-slate-500">
                  {election.description || "No description provided."}
                </div>
              </td>

              <td className="px-4 py-4">
                <ElectionStatusBadge status={election.status} />
              </td>

              <td className="px-4 py-4 text-sm text-slate-600">
                {new Date(election.starts_at).toLocaleString()}
              </td>

              <td className="px-4 py-4 text-sm text-slate-600">
                {new Date(election.ends_at).toLocaleString()}
              </td>

              <td className="px-4 py-4">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/elections/${election.id}`}
                    className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View
                  </Link>

                  <Link
                    href={`/dashboard/elections/${election.id}/edit`}
                    className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </Link>

                  <Link
                    href={`/dashboard/elections/${election.id}/positions`}
                    className="rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    Positions
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
