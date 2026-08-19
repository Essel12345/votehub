import ElectionForm from "@/components/elections/ElectionForm";

export default function NewElectionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create election</h1>
        <p className="text-slate-500">Add the basics for a new election.</p>
      </div>
      <ElectionForm />
    </div>
  );
}
