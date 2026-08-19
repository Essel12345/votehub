"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/Client";

type LoginFormData = {
  email: string;
  password: string;
};

export default function LoginForm() {
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>();

  const router = useRouter();

  async function onSubmit(data: LoginFormData) {
    setServerError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        throw error;
      }

      router.push("/dashboard");
    } catch (error: unknown) {
      setServerError(
        error instanceof Error ? error.message : "Login failed."
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {serverError && (
        <div className="rounded-lg bg-red-100 border border-red-300 p-4 text-red-700">
          {serverError}
        </div>
      )}

      <div>
        <input
          type="email"
          {...register("email", { required: "Email is required" })}
          placeholder="Email Address"
          className="w-full rounded-lg border p-3"
        />
        <p className="text-red-500 text-sm">{errors.email?.message}</p>
      </div>

      <div>
        <input
          type="password"
          {...register("password", { required: "Password is required" })}
          placeholder="Password"
          className="w-full rounded-lg border p-3"
        />
        <p className="text-red-500 text-sm">{errors.password?.message}</p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>

    </form>
  );
}
