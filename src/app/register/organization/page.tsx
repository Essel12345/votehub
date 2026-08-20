import RegisterForm from "@/components/auth/RegisterForm";

export default function OrganizationRegistrationPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Public onboarding</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Create your organization</h1>
          <p className="mt-2 text-slate-600">Set up your organization profile, assign the founder as the organization administrator, and begin managing elections securely.</p>
        </div>
        <div className="p-8">
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
