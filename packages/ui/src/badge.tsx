import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

type Tone = 'brand' | 'field' | 'energy' | 'victory' | 'muted' | 'danger';

const tones: Record<Tone, string> = {
  brand: 'bg-brand/10 text-brand',
  field: 'bg-field/10 text-field',
  energy: 'bg-energy/10 text-energy',
  victory: 'bg-victory/15 text-[#8a6100]',
  muted: 'bg-slate-100 text-muted',
  danger: 'bg-danger/10 text-danger',
};

export function Badge({
  tone = 'muted',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
