import type { ReactNode } from 'react';

interface StatCardProps {
  value: number | string;
  label: string;
  icon?: ReactNode;
}

export function StatCard({ value, label, icon }: StatCardProps) {
  return (
    <div className="stat bg-base-200 rounded-box">
      {icon && <div className="stat-figure text-primary">{icon}</div>}
      <div className="stat-value text-2xl">{value}</div>
      <div className="stat-desc">{label}</div>
    </div>
  );
}
