import Link from "next/link";

import { createClient } from "@/lib/supabase/Server";
import ElectionFilters from "@/components/elections/ElectionFilters";
import ElectionTable from "@/components/elections/ElectionTable";
import EmptyState from "@/components/ui/EmptyState";
import { listMyElections, countMyElections } from "@/services/elections/election.service";

const pageSize = 10;

export default async function ElectionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const currentPage = Number(params.page ?? "1");
  const query = params.search ?? "";
  const status = params.status ?? "ALL";

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        You must be signed in to manage elections.
      </div>
    );
  }

  const normalizedStatus = status === "ALL" ? undefined : status;

  const [elections, totalCount] = await Promise.all([
    listMyElections(user.id, {
      search: query || undefined,
      status: normalizedStatus,
      page: currentPage,
      pageSize,
    }),
    countMyElections(user.id, {
      search: query || undefined,
      status: normalizedStatus,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Elections</h1>
          <p className="text-slate-500">Manage your organization&apos;s election lifecycle.</p>
        </div>

        <Link
          href="/dashboard/elections/new"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Create election
        </Link>
      </div>

      <ElectionFilters
        status={status}
        search={query}
        onStatusChange={(nextStatus) => {
          const params = new URLSearchParams();
          if (query) params.set("search", query);
          if (nextStatus !== "ALL") params.set("status", nextStatus);
          params.set("page", "1");
          return undefined;
        }}
        onSearchChange={() => undefined}
      />

      {elections.length === 0 ? (
        <EmptyState
          title="No elections found"
          description="Create your first election or adjust your search and filters."
          action={
            <Link href="/dashboard/elections/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Create election
            </Link>
          }
        />
      ) : (
        <>
          <ElectionTable elections={elections} />

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-500">
              Showing page {currentPage} of {totalPages} • {totalCount} total
            </p>
            <div className="flex gap-2">
              {currentPage > 1 ? (
                <Link
                  href={{ pathname: "/dashboard/elections", query: { ...params, page: String(currentPage - 1) } }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Prev
                </Link>
              ) : null}

              {currentPage < totalPages ? (
                <Link
                  href={{ pathname: "/dashboard/elections", query: { ...params, page: String(currentPage + 1) } }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
