export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Unauthorized</h1>
        <p className="mt-3 text-slate-600">You need to sign in before accessing this area.</p>
      </div>
    </main>
  );
}
