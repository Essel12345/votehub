"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Position = {
  id: string;
  election_id: string;
  title: string;
  description: string | null;
};

export default function EditPositionPage() {
  const params = useParams<{
    id: string;
    positionId: string;
  }>();

  const router = useRouter();

  const electionId = params.id;
  const positionId = params.positionId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPosition() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/elections/${electionId}/positions/${positionId}`
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result?.error || "Unable to load position."
          );
        }

        const position = result?.data as Position;

        setTitle(position.title ?? "");
        setDescription(position.description ?? "");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load position."
        );
      } finally {
        setLoading(false);
      }
    }

    if (electionId && positionId) {
      loadPosition();
    }
  }, [electionId, positionId]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/elections/${electionId}/positions/${positionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            description,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Unable to update position."
        );
      }

      router.push(
        `/dashboard/elections/${electionId}/positions/${positionId}`
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update position."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-slate-500">
          Loading position...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-medium text-blue-600">
          Election Positions
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          Edit Position
        </h1>

        <p className="mt-2 text-slate-500">
          Update this position&apos;s title and description.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="title"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Position title
          </label>

          <input
            id="title"
            type="text"
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            placeholder="e.g. SRC President"
            required
            disabled={saving}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Description
          </label>

          <textarea
            id="description"
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            placeholder="Describe this position..."
            rows={5}
            disabled={saving}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/dashboard/elections/${electionId}/positions`
              )
            }
            disabled={saving}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Updating..." : "Update Position"}
          </button>
        </div>
      </form>
    </div>
  );
}