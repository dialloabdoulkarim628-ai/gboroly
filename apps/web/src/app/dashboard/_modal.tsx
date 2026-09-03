'use client';

import { Icon } from './_icons';

/** Modal simple centrée, fond cliquable pour fermer. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-slate-100" aria-label="Fermer">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export const inputCls =
  'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand';
export const labelCls = 'mb-1 block text-sm font-medium text-ink';
