/**
 * Stat Card Component
 * 
 * Displays a statistic with icon, title, value, and optional details
 */

import { LucideIcon } from "lucide-react";

interface DetailItem {
  label: string;
  value: string | number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string; // bg-* class
  iconColor: string; // text-* class
  details?: DetailItem[];
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  color,
  iconColor,
  details,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header with icon and title */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          </div>
          <div className={`${color} p-3 rounded-lg`}>
            <Icon className={`w-8 h-8 ${iconColor}`} />
          </div>
        </div>
      </div>

      {/* Details breakdown */}
      {details && details.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 space-y-2">
          {details.map((detail, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-gray-600">{detail.label}</span>
              <span className="font-medium text-gray-900">{detail.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
