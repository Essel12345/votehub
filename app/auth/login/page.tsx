import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="border-b p-8">
          <h1 className="text-3xl font-bold text-slate-900">Sign in</h1>

          <p className="mt-2 text-slate-600">
            Sign in to your account.
          </p>
        </div>

        <div className="p-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}