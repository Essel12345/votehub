import CandidateListPage from "../../../../../../../src/app/dashboard/elections/[electionId]/positions/[positionId]/candidates/page";

export default async function CandidatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; positionId: string }>;
  searchParams?: Promise<{ search?: string; status?: string }>;
}) {
  const { id, positionId } = await params;

  return CandidateListPage({
    params: Promise.resolve({
      electionId: id,
      positionId,
    }),
    searchParams,
  });
}