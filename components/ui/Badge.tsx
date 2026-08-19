type BadgeProps = {
  children: React.ReactNode;
  tone?: "slate" | "amber" | "emerald" | "violet" | "red" | "gray";
  className?: string;
};

const tones = {
  slate: "bg-slate-100 text-slate-700",
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
  violet: "bg-violet-100 text-violet-700",
  red: "bg-red-100 text-red-700",
  gray: "bg-gray-200 text-gray-700",
};

export default function Badge({ children, tone = "slate", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
