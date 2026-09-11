"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

type RegisterFormData = {
  organizationName: string;
  organizationType: string;
  country: string;
  timezone: string;
  currency: string;
  locale: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  adminName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export default function RegisterForm() {
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterFormData>({
    defaultValues: {
      organizationType: "NONPROFIT",
      country: "GH",
      timezone: "Africa/Accra",
      currency: "GHS",
      locale: "en-GH",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError("");
    setSuccessMessage("");
    setIsSubmitting(true);

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
        throw new Error(
          result?.error ||
            result?.message ||
            "Registration failed. Please try again."
        );
      }

      setSuccessMessage(
        result?.message ||
          "Registration successful! Your VoteHub organization has been created."
      );

      reset();
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-7 w-7 text-white"
          >
            <path d="M4 4h16v16H4z" />
            <path d="M8 12l3 3 5-6" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Create your VoteHub account
        </h1>

        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
          Set up your organization and administrator account to start managing
          secure elections with VoteHub.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Server Error */}
        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mt-0.5 h-5 w-5 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-11.5a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zM10 14.25a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>

            <span>{serverError}</span>
          </div>
        )}

        {/* Success */}
        {successMessage && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mt-0.5 h-5 w-5 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.172 7.707 8.879a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4.586-4.586z"
                clipRule="evenodd"
              />
            </svg>

            <span>{successMessage}</span>
          </div>
        )}

        {/* Organization Information */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7 border-b border-slate-100 pb-5">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 21h18" />
                  <path d="M5 21V5l7-3v19" />
                  <path d="M19 21V9l-7-4" />
                  <path d="M9 9h1" />
                  <path d="M9 13h1" />
                  <path d="M9 17h1" />
                  <path d="M15 13h1" />
                  <path d="M15 17h1" />
                </svg>
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                  Organization Information
                </h2>

                <p className="text-sm text-slate-500">
                  Tell us about your organization.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Organization Name */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Organization Name
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                {...register("organizationName", {
                  required: "Organization name is required",
                })}
                placeholder="e.g. Ghana Students Association"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />

              {errors.organizationName?.message && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.organizationName.message}
                </p>
              )}
            </div>

            {/* Organization Type */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Organization Type
                <span className="ml-1 text-red-500">*</span>
              </label>

              <select
                {...register("organizationType", {
                  required: "Organization type is required",
                })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition-all hover:border-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="NONPROFIT">Non-profit</option>
                <option value="EDUCATION">Education</option>
                <option value="COMMUNITY">Community</option>
                <option value="BUSINESS">Business</option>
                <option value="GOVERNMENT">Government</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Country */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Country
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                {...register("country", {
                  required: "Country is required",
                })}
                placeholder="GH"
                maxLength={2}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm uppercase text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                2-letter country code, e.g. GH
              </p>

              {errors.country?.message && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.country.message}
                </p>
              )}
            </div>

            {/* Timezone */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Timezone
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                {...register("timezone", {
                  required: "Timezone is required",
                })}
                placeholder="Africa/Accra"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />

              {errors.timezone?.message && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.timezone.message}
                </p>
              )}
            </div>

            {/* Currency */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Currency
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                {...register("currency", {
                  required: "Currency is required",
                })}
                placeholder="GHS"
                maxLength={3}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm uppercase text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Example: GHS, USD, GBP
              </p>

              {errors.currency?.message && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.currency.message}
                </p>
              )}
            </div>

            {/* Locale */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Locale
              </label>

              <input
                {...register("locale")}
                placeholder="en-GH"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Example: en-GH
              </p>
            </div>

            {/* Contact Email */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Contact Email
              </label>

              <input
                type="email"
                {...register("contactEmail")}
                placeholder="team@example.org"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            {/* Contact Phone */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Contact Phone
              </label>

              <input
                type="tel"
                {...register("contactPhone")}
                placeholder="+233 20 123 4567"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            {/* Website */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Website
                <span className="ml-2 font-normal text-slate-400">
                  (Optional)
                </span>
              </label>

              <input
                type="url"
                {...register("website")}
                placeholder="https://example.org"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
          </div>
        </section>

        {/* Administrator Information */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7 border-b border-slate-100 pb-5">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21a8 8 0 00-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                  Administrator Information
                </h2>

                <p className="text-sm text-slate-500">
                  Create the account that will manage your organization.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Administrator Name */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Administrator Name
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                {...register("adminName", {
                  required: "Administrator name is required",
                })}
                placeholder="e.g. John Mensah"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />

              {errors.adminName?.message && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.adminName.message}
                </p>
              )}
            </div>

            {/* First Name */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                First Name
              </label>

              <input
                {...register("firstName")}
                placeholder="John"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />

              {errors.firstName?.message && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Last Name
              </label>

              <input
                {...register("lastName")}
                placeholder="Mensah"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />

              {errors.lastName?.message && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.lastName.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Administrator Email
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                type="email"
                {...register("email", {
                  required: "Email is required",
                })}
                placeholder="admin@example.org"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />

              {errors.email?.message && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Password
                <span className="ml-1 text-red-500">*</span>
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 8,
                      message: "Password must be at least 8 characters",
                    },
                  })}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 pr-12 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                      <path d="M9.9 4.2A10.7 10.7 0 0112 4c5 0 8.7 4 10 8a12.6 12.6 0 01-3 4.4" />
                      <path d="M6.6 6.6C4.8 7.9 3.6 10 2 12c1.3 4 5 8 10 8 1.3 0 2.5-.3 3.6-.8" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Minimum 8 characters. Use uppercase, lowercase, and numbers
                for a stronger password.
              </p>

              {errors.password?.message && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Terms */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-center text-xs leading-5 text-slate-500">
            By creating an account, you agree to use VoteHub responsibly and
            follow your organization&apos;s election and data-management
            policies.
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="group flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-600/25 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {isSubmitting ? (
            <>
              <svg
                className="h-5 w-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>

              Creating your organization...
            </>
          ) : (
            <>
              Create VoteHub Organization

              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 transition-transform group-hover:translate-x-1"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </>
          )}
        </button>

        {/* Login */}
        <p className="text-center text-sm text-slate-500">
          Already have a VoteHub account?{" "}
          <a
            href="/auth/login"
            className="font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
          >
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
}
