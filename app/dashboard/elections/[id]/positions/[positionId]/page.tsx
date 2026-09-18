import PositionDetailsPage from "../../../../../../src/app/dashboard/elections/[electionId]/positions/[positionId]/page";

export default async function PositionPage({
  params,
}: {
  params: Promise<{ id: string; positionId: string }>;
}) {
  const { id, positionId } = await params;

  return PositionDetailsPage({
    params: Promise.resolve({
      electionId: id,
      positionId,
    }),
  });
}
