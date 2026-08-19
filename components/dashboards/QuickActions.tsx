import Link from "next/link";

export default function QuickActions() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Quick actions</h2>
      <div className="mt-4 space-y-3">
        <Link href="/dashboard/elections/new" className="block rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Create election
        </Link>
        <Link href="/dashboard/voters" className="block rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Import voters
        </Link>
        <Link href="/dashboard/settings" className="block rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Organization settings
        </Link>
      </div>
    </div>
  );
}
