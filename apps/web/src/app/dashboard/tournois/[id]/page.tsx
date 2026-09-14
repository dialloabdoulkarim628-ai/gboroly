'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  fmtDate,
  fmtFee,
  STATUS_META,
  type Category,
  type Checklist,
  type CompetitionInfo,
  type Registration,
  type Team,
  type Tournament,
} from '@/lib/org-types';
import { Icon } from '../../_icons';
import { Modal, inputCls, labelCls } from '../../_modal';

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 font-semibold text-ink">{value}</div>
    </div>
  );
}

/** Carte de section de configuration avec numéro d'étape. */
function SetupCard({
  step,
  title,
  subtitle,
  done,
  children,
}: {
  step: number;
  title: string;
  subtitle: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-card">
      <div className="mb-4 flex items-start gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            done ? 'bg-field text-white' : 'bg-brand/10 text-brand'
          }`}
        >
          {done ? '✓' : step}
        </span>
        <div>
          <h3 className="text-base font-bold text-ink">{title}</h3>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────── 1. Équipes / inscriptions ───────────────────────────
 * La catégorie est gérée en coulisses : une catégorie par défaut (nom du tournoi)
 * est créée automatiquement si aucune n'existe, puis toutes les équipes y sont
 * inscrites. L'organisateur n'a donc jamais à manipuler la notion de catégorie. */
function TeamsSection({
  id,
  defaultCategoryName,
  onChange,
}: {
  id: string;
  defaultCategoryName: string;
  onChange: () => void;
}) {
  const { apiFetch } = useAuth();
  const qc = useQueryClient();
  const [teamId, setTeamId] = useState('');
  const ensuring = useRef(false);

  const teams = useQuery({ queryKey: ['teams'], queryFn: () => apiFetch<Team[]>('/teams') });
  const cats = useQuery({
    queryKey: ['categories', id],
    queryFn: () => apiFetch<Category[]>(`/tournaments/${id}/categories`),
  });
  const regs = useQuery({
    queryKey: ['registrations', id],
    queryFn: () => apiFetch<Registration[]>(`/tournaments/${id}/registrations`),
  });

  const ensureCategory = useMutation({
    mutationFn: () =>
      apiFetch<Category>(`/tournaments/${id}/categories`, {
        method: 'POST',
        body: JSON.stringify({ name: defaultCategoryName }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories', id] });
      onChange();
    },
  });

  // Provisionne une catégorie par défaut une seule fois s'il n'y en a aucune.
  useEffect(() => {
    if (cats.data && cats.data.length === 0 && !ensuring.current) {
      ensuring.current = true;
      ensureCategory.mutate();
    }
  }, [cats.data]);

  const categoryId = cats.data?.[0]?.id ?? '';

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['registrations', id] });
    onChange();
  };
  const register = useMutation({
    mutationFn: (tId: string) =>
      apiFetch(`/tournaments/${id}/registrations`, {
        method: 'POST',
        body: JSON.stringify({ teamId: tId, categoryId }),
      }),
    onSuccess: () => {
      setTeamId('');
      invalidate();
    },
  });
  const approve = useMutation({
    mutationFn: (regId: string) => apiFetch(`/registrations/${regId}/approve`, { method: 'POST' }),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: (regId: string) =>
      apiFetch(`/registrations/${regId}/reject`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: invalidate,
  });

  const registered = new Set((regs.data ?? []).map((r) => r.team.id));
  const availableTeams = (teams.data ?? []).filter((t) => !registered.has(t.id));
  const approvedCount = (regs.data ?? []).filter((r) => r.status === 'APPROVED').length;

  const noTeams = teams.data && teams.data.length === 0;

  return (
    <SetupCard
      step={1}
      title="Équipes"
      subtitle="Inscrivez des équipes puis validez-les — 2 validées minimum."
      done={approvedCount >= 2}
    >
      {noTeams ? (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-muted">
          Vous n’avez pas encore d’équipe dans votre organisation.{' '}
          <Link href="/dashboard/equipes" className="font-semibold text-brand hover:underline">
            Créer des équipes →
          </Link>
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (teamId && categoryId) register.mutate(teamId);
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="">Choisir une équipe…</option>
            {availableTeams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!teamId || !categoryId || register.isPending}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            <Icon name="plus" className="h-4 w-4" /> Inscrire
          </button>
        </form>
      )}
      {register.error && <p className="mt-2 text-xs text-danger">{(register.error as Error).message}</p>}

      {regs.data && regs.data.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold text-muted">
            {approvedCount} validée{approvedCount > 1 ? 's' : ''} · {regs.data.length} inscrite{regs.data.length > 1 ? 's' : ''}
          </div>
          {regs.data.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{r.team.name}</span>
              {r.status === 'APPROVED' ? (
                <span className="rounded-full bg-field/15 px-2 py-0.5 text-xs font-semibold text-field">Validée</span>
              ) : r.status === 'PENDING' ? (
                <>
                  <button
                    onClick={() => approve.mutate(r.id)}
                    disabled={approve.isPending}
                    className="rounded-lg bg-field/10 px-2.5 py-1 text-xs font-semibold text-field hover:bg-field/20 disabled:opacity-50"
                  >
                    Valider
                  </button>
                  <button
                    onClick={() => reject.mutate(r.id)}
                    disabled={reject.isPending}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-muted hover:text-danger disabled:opacity-50"
                  >
                    Refuser
                  </button>
                </>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{r.status}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </SetupCard>
  );
}

/* ─────────────────────────── 3. Format de compétition ─────────────────────────── */
const FORMAT_TYPES = [
  { value: 'ROUND_ROBIN', label: 'Championnat', desc: 'Chaque équipe affronte toutes les autres.' },
  { value: 'GROUP_STAGE', label: 'Phase de groupes', desc: 'Poules + classement par groupe.' },
  { value: 'SINGLE_ELIMINATION', label: 'Élimination directe', desc: 'Tableau à élimination simple.' },
  { value: 'DOUBLE_ELIMINATION', label: 'Double élimination', desc: 'Bracket gagnants + perdants (4 ou 8 équipes).' },
  { value: 'GROUP_TO_PLAYOFFS', label: 'Poules + phases finales', desc: 'Groupes puis tableau final des qualifiés.' },
];

function FormatModal({
  categoryId,
  categoryName,
  onClose,
  onDone,
}: {
  categoryId: string;
  categoryName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { apiFetch } = useAuth();
  const [type, setType] = useState('GROUP_TO_PLAYOFFS');
  const [groups, setGroups] = useState(2);
  const [qualifyPerGroup, setQualifyPerGroup] = useState(2);
  const [doubleRound, setDoubleRound] = useState(false);

  const needsGroups = type === 'GROUP_STAGE' || type === 'GROUP_TO_PLAYOFFS';
  const needsQualify = type === 'GROUP_TO_PLAYOFFS';
  const allowsDouble = type === 'ROUND_ROBIN' || type === 'GROUP_STAGE' || type === 'GROUP_TO_PLAYOFFS';

  const generate = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = { type };
      if (needsGroups) body.groups = groups;
      if (needsQualify) body.qualifyPerGroup = qualifyPerGroup;
      if (allowsDouble) body.doubleRound = doubleRound;
      return apiFetch(`/categories/${categoryId}/competition`, { method: 'POST', body: JSON.stringify(body) });
    },
    onSuccess: () => {
      onDone();
      onClose();
    },
  });

  return (
    <Modal title={`Format — ${categoryName}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Type de compétition</label>
          <div className="space-y-2">
            {FORMAT_TYPES.map((f) => (
              <label
                key={f.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                  type === f.value ? 'border-brand bg-brand/5' : 'border-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={f.value}
                  checked={type === f.value}
                  onChange={() => setType(f.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink">{f.label}</span>
                  <span className="block text-xs text-muted">{f.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {needsGroups && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nombre de groupes</label>
              <input type="number" min={1} max={32} value={groups} onChange={(e) => setGroups(Number(e.target.value))} className={inputCls} />
            </div>
            {needsQualify && (
              <div>
                <label className={labelCls}>Qualifiés par groupe</label>
                <input type="number" min={1} max={8} value={qualifyPerGroup} onChange={(e) => setQualifyPerGroup(Number(e.target.value))} className={inputCls} />
              </div>
            )}
          </div>
        )}

        {allowsDouble && (
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={doubleRound} onChange={(e) => setDoubleRound(e.target.checked)} />
            Matchs aller-retour
          </label>
        )}

        {generate.error && <p className="text-sm text-danger">{(generate.error as Error).message}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-slate-50">Annuler</button>
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {generate.isPending ? 'Génération…' : 'Générer le format'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function FormatSection({ id, onChange }: { id: string; onChange: () => void }) {
  const { apiFetch } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const cats = useQuery({
    queryKey: ['categories', id],
    queryFn: () => apiFetch<Category[]>(`/tournaments/${id}/categories`),
  });
  const comps = useQuery({
    queryKey: ['competitions', id],
    queryFn: () => apiFetch<CompetitionInfo[]>(`/tournaments/${id}/competitions`),
  });

  const compByCat = new Map((comps.data ?? []).map((c) => [c.category, c]));
  const formatLabel = (v: string) => FORMAT_TYPES.find((f) => f.value === v)?.label ?? v;

  return (
    <SetupCard
      step={2}
      title="Format de compétition"
      subtitle="Choisissez comment se joue le tournoi (après avoir validé les équipes)."
      done={!!comps.data?.length && cats.data?.length === comps.data?.length}
    >
      {cats.data && cats.data.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-muted">Préparation…</p>
      ) : (
        <div className="space-y-2">
          {(cats.data ?? []).map((c) => {
            const comp = compByCat.get(c.name);
            return (
              <div key={c.id} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{c.name}</span>
                {comp ? (
                  <span className="rounded-full bg-field/15 px-2.5 py-0.5 text-xs font-semibold text-field">
                    {formatLabel(comp.formatType)}
                  </span>
                ) : (
                  <button
                    onClick={() => setEditing({ id: c.id, name: c.name })}
                    className="rounded-lg bg-brand/10 px-3 py-1 text-xs font-semibold text-brand hover:bg-brand/20"
                  >
                    Configurer
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {editing && (
        <FormatModal
          categoryId={editing.id}
          categoryName={editing.name}
          onClose={() => setEditing(null)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['competitions', id] });
            onChange();
          }}
        />
      )}
    </SetupCard>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */
export default function TournoiDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { apiFetch, activeOrg } = useAuth();
  const qc = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);

  const t = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => apiFetch<Tournament>(`/tournaments/${id}`),
    enabled: !!activeOrg,
  });
  const checklist = useQuery({
    queryKey: ['checklist', id],
    queryFn: () => apiFetch<Checklist>(`/tournaments/${id}/checklist`),
    enabled: !!activeOrg,
  });

  const refreshChecklist = () => qc.invalidateQueries({ queryKey: ['checklist', id] });

  const publish = useMutation({
    mutationFn: () => apiFetch<Tournament>(`/tournaments/${id}/publish`, { method: 'POST' }),
    onSuccess: () => {
      setNotice('🎉 Tournoi publié ! Il est désormais visible publiquement.');
      qc.invalidateQueries({ queryKey: ['tournament', id] });
      qc.invalidateQueries({ queryKey: ['checklist', id] });
      qc.invalidateQueries({ queryKey: ['tournaments', activeOrg?.id] });
    },
    onError: (e) => setNotice(`⚠️ ${(e as Error).message}`),
  });

  if (t.isLoading) return <div className="mx-auto max-w-4xl"><div className="h-40 animate-pulse rounded-2xl bg-white shadow-card" /></div>;
  if (t.error || !t.data)
    return (
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-10 text-center shadow-card">
        <p className="text-sm text-danger">{(t.error as Error)?.message ?? 'Tournoi introuvable'}</p>
        <Link href="/dashboard/tournois" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
          ← Mes tournois
        </Link>
      </div>
    );

  const tournament = t.data;
  const status = STATUS_META[tournament.status];
  const items = checklist.data?.items ?? [];
  const requiredUnmet = items.filter((i) => i.required && !i.met);
  const canPublish =
    (tournament.status === 'DRAFT' || tournament.status === 'READY') && requiredUnmet.length === 0;
  const editable = !['ONGOING', 'COMPLETED', 'ARCHIVED', 'CANCELLED'].includes(tournament.status);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/dashboard/tournois" className="text-sm font-semibold text-brand hover:underline">
          ← Mes tournois
        </Link>
      </div>

      {/* En-tête */}
      <div className="overflow-hidden rounded-2xl bg-navy text-white shadow-card">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-extrabold">
            {tournament.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}>{status.label}</span>
            <h1 className="mt-1 truncate text-2xl font-extrabold">{tournament.name}</h1>
            <p className="text-sm text-white/70">{[tournament.city, tournament.country].filter(Boolean).join(', ')}</p>
          </div>
          {(tournament.status === 'PUBLISHED' || tournament.status === 'ONGOING' || tournament.status === 'COMPLETED') && (
            <Link
              href={`/t/${tournament.slug}`}
              className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20"
            >
              Voir la page publique →
            </Link>
          )}
        </div>
      </div>

      {notice && <div className="rounded-2xl bg-brand/5 px-5 py-3 text-sm font-medium text-brand">{notice}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne gauche : infos + configuration */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl bg-white p-6 shadow-card">
            <h2 className="mb-4 text-lg font-bold text-ink">Informations</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Info label="Début" value={fmtDate(tournament.startDate)} />
              <Info label="Fin" value={fmtDate(tournament.endDate)} />
              <Info label="Frais" value={fmtFee(tournament.registrationFee, tournament.currency)} />
              <Info label="Max équipes" value={tournament.maxTeams ? String(tournament.maxTeams) : '—'} />
              <Info label="Visibilité" value={tournament.visibility === 'PUBLIC' ? 'Public' : 'Privé'} />
              <Info label="Devise" value={tournament.currency} />
            </div>
            {tournament.description && (
              <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-muted">{tournament.description}</p>
            )}
          </div>

          {editable && (
            <>
              <h2 className="pt-2 text-lg font-bold text-ink">Configuration du tournoi</h2>
              <TeamsSection id={id} defaultCategoryName={tournament.name} onChange={refreshChecklist} />
              <FormatSection id={id} onChange={refreshChecklist} />

              {/* Terrains & Calendrier : pages dédiées */}
              <SetupCard
                step={3}
                title="Terrains & Calendrier"
                subtitle="Ajoutez vos terrains puis générez l’agenda des matchs."
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Link
                    href={`/dashboard/terrains?t=${id}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-ink hover:border-brand hover:bg-brand/5"
                  >
                    <Icon name="fields" className="h-5 w-5 text-brand" /> Gérer les terrains
                  </Link>
                  <Link
                    href={`/dashboard/calendrier?t=${id}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-ink hover:border-brand hover:bg-brand/5"
                  >
                    <Icon name="calendar" className="h-5 w-5 text-brand" /> Générer le calendrier
                  </Link>
                </div>
              </SetupCard>
            </>
          )}
        </div>

        {/* Colonne droite : publication */}
        <div className="rounded-2xl bg-white p-6 shadow-card lg:sticky lg:top-6 lg:self-start">
          <h2 className="mb-1 text-lg font-bold text-ink">Publication</h2>
          <p className="mb-4 text-xs text-muted">Complétez les éléments requis pour publier.</p>
          <div className="space-y-2">
            {checklist.isLoading ? (
              <div className="h-24 animate-pulse rounded-xl bg-slate-50" />
            ) : (
              items.map((it) => (
                <div key={it.key} className="flex items-center gap-2 text-sm">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                      it.met ? 'bg-field text-white' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {it.met ? '✓' : '○'}
                  </span>
                  <span className={it.met ? 'text-ink' : 'text-muted'}>{it.label}</span>
                  {it.required && !it.met && (
                    <span className="ml-auto text-[10px] font-semibold uppercase text-danger">requis</span>
                  )}
                </div>
              ))
            )}
          </div>

          {tournament.status === 'DRAFT' || tournament.status === 'READY' ? (
            <button
              onClick={() => publish.mutate()}
              disabled={!canPublish || publish.isPending}
              className="mt-5 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publish.isPending ? 'Publication…' : 'Publier le tournoi'}
            </button>
          ) : (
            <div className="mt-5 rounded-xl bg-field/10 px-4 py-2.5 text-center text-sm font-semibold text-field">
              ✓ Tournoi {status.label.toLowerCase()}
            </div>
          )}
          {!canPublish && (tournament.status === 'DRAFT' || tournament.status === 'READY') && requiredUnmet.length > 0 && (
            <p className="mt-2 text-center text-xs text-muted">
              {requiredUnmet.length} élément(s) requis à compléter.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
