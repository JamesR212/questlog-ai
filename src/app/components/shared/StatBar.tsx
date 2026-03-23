'use client';

interface StatBarProps {
  label: string;
  value: number;
  max?: number;
  color: string;
  icon: string;
}

export default function StatBar({ label, value, max = 150, color, icon }: StatBarProps) {
  const pct = Math.min(100, (value / max) * 100);

  return (
    <div className="flex items-center gap-3">
      <span className="text-base w-5 text-center">{icon}</span>
      <span className="text-xs font-medium text-ql-3 w-7">{label}</span>
      <div className="flex-1 h-1.5 bg-ql-surface3 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-ql w-7 text-right tabular-nums">{value}</span>
    </div>
  );
}
