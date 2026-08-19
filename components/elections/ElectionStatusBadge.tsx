import Badge from "@/components/ui/Badge";

const statusToneMap: Record<string, "slate" | "amber" | "emerald" | "violet" | "red" | "gray"> = {
  DRAFT: "slate",
  PUBLISHED: "amber",
  OPEN: "emerald",
  CLOSED: "violet",
  ARCHIVED: "gray",
};

export default function ElectionStatusBadge({ status }: { status: string }) {
  return <Badge tone={statusToneMap[status] ?? "slate"}>{status}</Badge>;
}
