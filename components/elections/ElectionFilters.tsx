type ElectionFiltersProps = {
  status: string;
  search: string;
  onStatusChange: (value: string) => void;
  onSearchChange: (value: string) => void;
};

const statuses = ["ALL", "DRAFT", "PUBLISHED", "OPEN", "CLOSED", "ARCHIVED"];

export default function ElectionFilters({
  status,
  search,
  onStatusChange,
  onSearchChange,
}: ElectionFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="flex-1">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search elections..."
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onStatusChange(value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              status === value
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
