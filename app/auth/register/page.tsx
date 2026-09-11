import RegisterForm from "../../../components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="border-b p-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Create your organization
          </h1>

          <p className="mt-2 text-slate-600">
            Register your organization and create your administrator account.
          </p>
        </div>

        <div className="p-8">
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}