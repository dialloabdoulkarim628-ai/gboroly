'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  type Payment,
  type PaymentSummary,
  type Registration,
  type Tournament,
} from '@/lib/org-types';
import { Icon } from '../_icons';
import { Modal, inputCls, labelCls } from '../_modal';

function money(n: number, c = 'XOF') {
  return `${n.toLocaleString('fr-FR')} ${c}`;
}

function RecordPaymentModal({ tournamentId, onClose }: { tournamentId: string; onClose: () => void }) {
  const { apiFetch } = useAuth();
  const qc = useQueryClient();
  const [regId, setRegId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [error, setError] = useState<string | null>(null);

  const regs = useQuery({
    queryKey: ['registrations', tournamentId],
    queryFn: () => apiFetch<Registration[]>(`/tournaments/${tournamentId}/registrations`),
  });
  const approved = (regs.data ?? []).filter((r) => r.status === 'APPROVED');

  const record = useMutation({
    mutationFn: () =>
      apiFetch(`/registrations/${regId}/payments`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount), method }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', tournamentId] });
      qc.invalidateQueries({ queryKey: ['payment-summary', tournamentId] });
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <Modal title="Enregistrer un paiement" onClose={onClose}>
      {regs.isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-slate-50" />
      ) : approved.length === 0 ? (
        <p className="text-center text-sm text-muted">Aucune équipe validée à ce tournoi pour l’instant.</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            record.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className={labelCls}>Équipe *</label>
            <select className={inputCls} value={regId} onChange={(e) => setRegId(e.target.value)} required>
              <option value="">Sélectionner…</option>
              {approved.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.team.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Montant (XOF) *</label>
              <input type="number" min={1} className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" required />
            </div>
            <div>
              <label className={labelCls}>Moyen</label>
              <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && <div className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-slate-50">
              Annuler
            </button>
            <button type="submit" disabled={record.isPending || !regId || !amount} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
              {record.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 text-xl font-extrabold ${accent}`}>{value}</div>
    </div>
  );
}

export default function PaiementsPage() {
  const { apiFetch, activeOrg } = useAuth();
  const [tid, setTid] = useState('');
  const [open, setOpen] = useState(false);

  const tournaments = useQuery({
    queryKey: ['tournaments', activeOrg?.id],
    queryFn: () => apiFetch<Tournament[]>('/tournaments'),
    enabled: !!activeOrg,
  });
  useEffect(() => {
    if (!tid && tournaments.data?.length) setTid(tournaments.data[0].id);
  }, [tid, tournaments.data]);

  const summary = useQuery({
    queryKey: ['payment-summary', tid],
    queryFn: () => apiFetch<PaymentSummary>(`/tournaments/${tid}/payments/summary`),
    enabled: !!tid,
  });
  const payments = useQuery({
    queryKey: ['payments', tid],
    queryFn: () => apiFetch<Payment[]>(`/tournaments/${tid}/payments`),
    enabled: !!tid,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Paiements</h1>
          <p className="mt-1 text-sm text-muted">Suivez les encaissements et les revenus de vos tournois.</p>
        </div>
        <div className="flex gap-2">
          {tournaments.data && tournaments.data.length > 0 && (
            <select value={tid} onChange={(e) => setTid(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-brand">
              {tournaments.data.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <button onClick={() => setOpen(true)} disabled={!tid} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            <Icon name="plus" className="h-4 w-4" /> Encaisser
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Total encaissé" value={money(summary.data?.gross ?? 0)} accent="text-ink" />
        <SummaryCard label="Revenus organisateur" value={money(summary.data?.organizerRevenue ?? 0)} accent="text-field" />
        <SummaryCard label="Commission plateforme" value={money(summary.data?.platformCommission ?? 0)} accent="text-energy" />
        <SummaryCard label="Paiements" value={String(summary.data?.count ?? 0)} accent="text-brand" />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        <div className="border-b border-slate-100 px-5 py-3 text-sm font-bold text-ink">Historique</div>
        {payments.isLoading ? (
          <div className="h-32 animate-pulse bg-slate-50" />
        ) : !payments.data?.length ? (
          <p className="p-10 text-center text-sm text-muted">Aucun paiement enregistré pour ce tournoi.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {payments.data.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink">{p.team ?? 'Équipe'}</div>
                  <div className="text-xs text-muted">
                    {PAYMENT_METHOD_LABEL[p.method] ?? p.method}
                    {p.receiptRef ? ` · ${p.receiptRef}` : ''}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    p.status === 'PAID' ? 'bg-field/15 text-field' : p.status === 'REFUNDED' ? 'bg-danger/10 text-danger' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {p.status === 'PAID' ? 'Payé' : p.status === 'REFUNDED' ? 'Remboursé' : p.status}
                </span>
                <span className="w-28 text-right font-bold text-ink">{money(p.amount, p.currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {open && tid && <RecordPaymentModal tournamentId={tid} onClose={() => setOpen(false)} />}
    </div>
  );
}
