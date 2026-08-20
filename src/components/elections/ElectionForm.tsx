"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  electionSchema,
  ElectionFormData,
  electionStatusEnum,
} from "@/lib/validation/election";

import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type ElectionFormProps = {
  mode?: "create" | "edit";
  electionId?: string;
  defaultValues?: Partial<ElectionFormData>;
};

export default function ElectionForm({
  mode = "create",
  electionId,
  defaultValues,
}: ElectionFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ElectionFormData>({
    resolver: zodResolver(electionSchema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      status: (defaultValues?.status as ElectionFormData["status"]) ?? "DRAFT",
      starts_at: defaultValues?.starts_at ?? "",
      ends_at: defaultValues?.ends_at ?? "",
    },
  });

  async function onSubmit(data: ElectionFormData) {
    const endpoint = mode === "edit" && electionId ? `/api/elections/${electionId}` : "/api/elections";
    const method = mode === "edit" ? "PUT" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        const message = result?.error ?? "Unable to save election.";
        setError("root", { message });
        return;
      }

      router.push("/dashboard/elections");
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to save election.";
      setError("root", { message });
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          label="Election Title"
          placeholder="Student Council Election"
          error={errors.title?.message}
          {...register("title")}
        />

        <Textarea
          label="Description"
          placeholder="Describe this election..."
          error={errors.description?.message}
          {...register("description")}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <Input
            type="datetime-local"
            label="Starts At"
            error={errors.starts_at?.message}
            {...register("starts_at")}
          />

          <Input
            type="datetime-local"
            label="Ends At"
            error={errors.ends_at?.message}
            {...register("ends_at")}
          />
        </div>

        <div className="space-y-2">
          <label className="font-medium">Status</label>
          <select
            {...register("status")}
            className="w-full rounded-lg border border-slate-300 p-3"
          >
            {electionStatusEnum.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          {errors.status ? <p className="text-sm text-red-500">{errors.status.message}</p> : null}
        </div>

        {errors.root ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errors.root.message}
          </div>
        ) : null}

        <Button loading={isSubmitting}>
          {mode === "edit" ? "Save changes" : "Create election"}
        </Button>
      </form>
    </Card>
  );
}