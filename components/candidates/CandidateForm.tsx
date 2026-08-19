"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { candidateCreateSchema } from "@/lib/validation/candidate";

export default function CandidateForm({
  electionId,
  positionId,
  mode = "create",
  candidateId,
  defaultValues,
}: {
  electionId: string;
  positionId: string;
  mode?: "create" | "edit";
  candidateId?: string;
  defaultValues?: {
    first_name?: string;
    last_name?: string;
    display_name?: string;
    photo_url?: string;
    biography?: string;
    manifesto?: string;
  };
}) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    resolver: zodResolver(candidateCreateSchema),
    defaultValues: {
      first_name: defaultValues?.first_name ?? "",
      last_name: defaultValues?.last_name ?? "",
      display_name: defaultValues?.display_name ?? "",
      photo_url: defaultValues?.photo_url ?? "",
      biography: defaultValues?.biography ?? "",
      manifesto: defaultValues?.manifesto ?? "",
      status: "PENDING",
    },
  });

  async function onSubmit(values: Record<string, unknown>) {
    try {
      const response = await fetch(
        mode === "edit" && candidateId
          ? `/api/elections/${electionId}/positions/${positionId}/candidates/${candidateId}`
          : `/api/elections/${electionId}/positions/${positionId}/candidates`,
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError("root", { message: result?.error ?? "Unable to save candidate." });
        return;
      }

      router.push(`/dashboard/elections/${electionId}/positions/${positionId}/candidates`);
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to save candidate.";
      setError("root", { message });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">First name</label>
          <input {...register("first_name")} className="w-full rounded-lg border border-slate-300 p-3" />
          {errors.first_name ? <p className="mt-1 text-sm text-red-600">{String(errors.first_name.message)}</p> : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Last name</label>
          <input {...register("last_name")} className="w-full rounded-lg border border-slate-300 p-3" />
          {errors.last_name ? <p className="mt-1 text-sm text-red-600">{String(errors.last_name.message)}</p> : null}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Display name</label>
        <input {...register("display_name")} className="w-full rounded-lg border border-slate-300 p-3" />
        {errors.display_name ? <p className="mt-1 text-sm text-red-600">{String(errors.display_name.message)}</p> : null}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Photo URL</label>
        <input {...register("photo_url")} className="w-full rounded-lg border border-slate-300 p-3" placeholder="https://..." />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Biography</label>
        <textarea {...register("biography")} rows={5} className="w-full rounded-lg border border-slate-300 p-3" />
        {errors.biography ? <p className="mt-1 text-sm text-red-600">{String(errors.biography.message)}</p> : null}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Manifesto</label>
        <textarea {...register("manifesto")} rows={7} className="w-full rounded-lg border border-slate-300 p-3" />
        {errors.manifesto ? <p className="mt-1 text-sm text-red-600">{String(errors.manifesto.message)}</p> : null}
      </div>

      {"root" in errors ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {String(errors.root?.message)}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : mode === "edit" ? "Save candidate" : "Create candidate"}
      </button>
    </form>
  );
}
