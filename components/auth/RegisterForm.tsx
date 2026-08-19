"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  registerSchema,
  type RegisterFormData,
} from "@/lib/validation/register";

export default function RegisterForm() {
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      organizationType: "NONPROFIT",
      country: "GH",
      timezone: "Africa/Accra",
      currency: "GHS",
      locale: "en-GH",
    },
  });

  async function onSubmit(data: RegisterFormData) {
    setSuccess("");
    setServerError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error ?? "Registration failed.");
      }

      setSuccess("Registration successful! Your organization is being created.");
      reset();
    } catch (error: unknown) {
      setServerError(error instanceof Error ? error.message : "Registration failed.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {success && (
        <div className="rounded-lg bg-green-100 border border-green-300 p-4 text-green-700">
          {success}
        </div>
      )}

      {serverError && (
        <div className="rounded-lg bg-red-100 border border-red-300 p-4 text-red-700">
          {serverError}
        </div>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-4">Organization Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <input {...register("organizationName")} placeholder="Organization Name" className="w-full rounded-lg border p-3" />
            <p className="text-red-500 text-sm">{errors.organizationName?.message}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Organization Type</label>
            <select {...register("organizationType")} className="w-full rounded-lg border p-3">
              <option value="NONPROFIT">Non-profit</option>
              <option value="EDUCATION">Education</option>
              <option value="COMMUNITY">Community</option>
              <option value="BUSINESS">Business</option>
              <option value="GOVERNMENT">Government</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Country (ISO code)</label>
            <input {...register("country")} placeholder="GH" className="w-full rounded-lg border p-3" />
            <p className="text-red-500 text-sm">{errors.country?.message}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Timezone</label>
            <input {...register("timezone")} placeholder="Africa/Accra" className="w-full rounded-lg border p-3" />
            <p className="text-red-500 text-sm">{errors.timezone?.message}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Currency</label>
            <input {...register("currency")} placeholder="GHS" className="w-full rounded-lg border p-3" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Locale</label>
            <input {...register("locale")} placeholder="en-GH" className="w-full rounded-lg border p-3" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Contact Email</label>
            <input type="email" {...register("contactEmail")} placeholder="team@example.org" className="w-full rounded-lg border p-3" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Contact Phone</label>
            <input {...register("contactPhone")} placeholder="+233 20 123 4567" className="w-full rounded-lg border p-3" />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Website</label>
            <input {...register("website")} placeholder="https://example.org" className="w-full rounded-lg border p-3" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Administrator Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <input {...register("adminName")} placeholder="Administrator Name" className="w-full rounded-lg border p-3" />
            <p className="text-red-500 text-sm">{errors.adminName?.message}</p>
          </div>

          <div>
            <input {...register("firstName")} placeholder="First Name" className="w-full rounded-lg border p-3" />
            <p className="text-red-500 text-sm">{errors.firstName?.message}</p>
          </div>

          <div>
            <input {...register("lastName")} placeholder="Last Name" className="w-full rounded-lg border p-3" />
            <p className="text-red-500 text-sm">{errors.lastName?.message}</p>
          </div>

          <div className="md:col-span-2">
            <input type="email" {...register("email")} placeholder="Email Address" className="w-full rounded-lg border p-3" />
            <p className="text-red-500 text-sm">{errors.email?.message}</p>
          </div>

          <div>
            <input type="password" {...register("password")} placeholder="Password" className="w-full rounded-lg border p-3" />
            <p className="text-red-500 text-sm">{errors.password?.message}</p>
          </div>

          <div>
            <input type="password" {...register("confirmPassword")} placeholder="Confirm Password" className="w-full rounded-lg border p-3" />
            <p className="text-red-500 text-sm">{errors.confirmPassword?.message}</p>
          </div>
        </div>
      </section>

      <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
        {isSubmitting ? "Creating Organization..." : "Create Organization"}
      </button>
    </form>
  );
}