import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('rounded-card bg-white shadow-card border border-slate-100 p-5', className)}
      {...props}
    />
  );
}

export interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: 'brand' | 'field' | 'energy' | 'victory';
}

const accents: Record<NonNullable<StatCardProps['accent']>, string> = {
  brand: 'bg-brand/10 text-brand',
  field: 'bg-field/10 text-field',
  energy: 'bg-energy/10 text-energy',
  victory: 'bg-victory/10 text-victory',
};

export function StatCard({ label, value, hint, accent = 'brand' }: StatCardProps) {
  return (
    <Card className="flex items-start gap-4">
      <span className={clsx('inline-flex h-11 w-11 items-center justify-center rounded-xl', accents[accent])}>
        ●
      </span>
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p className="text-2xl font-bold text-ink">{value}</p>
        {hint ? <p className="text-xs text-muted mt-1">{hint}</p> : null}
      </div>
    </Card>
  );
}
