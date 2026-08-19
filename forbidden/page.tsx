export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="max-w-md rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Forbidden</h1>
        <p className="mt-3 text-slate-600">You do not have permission to access this resource.</p>
      </div>
    </main>
  );
}
