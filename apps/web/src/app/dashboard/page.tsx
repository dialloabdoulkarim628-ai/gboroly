'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Icon, type IconName } from './_icons';

interface DashboardData {
  organization: { name: string; currency: string; city?: string | null } | null;
  stats: {
    activeTournaments: number;
    registeredTeams: number;
    upcomingMatches: number;
    paymentsReceived: number;
    currency: string;
  };
  matches: { played: number; upcoming: number; total: number };
  revenue: number;
  featuredTournament: {
    id: string;
    name: string;
    slug: string;
    city?: string | null;
    status: string;
    sport?: string | null;
    teams: number;
    categories: number;
    progressIndex: number;
    steps: string[];
  } | null;
  upcomingMatches: {
    id: string;
    tournament: string;
    slug: string;
    scheduledAt?: string | null;
    field?: string | null;
    home: string;
    away: string;
  }[];
}

function fmtMoney(n: number, currency: string) {
  return `${n.toLocaleString('fr-FR')} ${currency}`;
}
function fmtTime(iso?: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
function fmtDay(iso?: string | null) {
  if (!iso) return 'À planifier';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

const ACCENTS: Record<string, { bg: string; text: string }> = {
  brand: { bg: 'bg-brand/10', text: 'text-brand' },
  field: { bg: 'bg-field/10', text: 'text-field' },
  energy: { bg: 'bg-energy/10', text: 'text-energy' },
  victory: { bg: 'bg-victory/15', text: 'text-victory' },
};

function StatCard({
  icon,
  accent,
  label,
  value,
  hint,
}: {
  icon: IconName;
  accent: keyof typeof ACCENTS;
  label: string;
  value: string;
  hint?: string;
}) {
  const a = ACCENTS[accent];
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${a.bg} ${a.text}`}>
          <Icon name={icon} />
        </span>
        <div className="min-w-0">
          <div className="text-sm text-muted">{label}</div>
          <div className="mt-1 text-2xl font-extrabold text-ink">{value}</div>
          {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
        </div>
      </div>
    </div>
  );
}

function Donut({ played, upcoming }: { played: number; upcoming: number }) {
  const total = played + upcoming;
  const r = 42;
  const c = 2 * Math.PI * r;
  const playedFrac = total ? played / total : 0;
  return (
    <svg viewBox="0 0 120 120" className="h-36 w-36">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#E7ECF3" strokeWidth="14" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="#1269D3"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${c * playedFrac} ${c}`}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="56" textAnchor="middle" className="fill-ink text-xl font-extrabold">
        {total}
      </text>
      <text x="60" y="74" textAnchor="middle" className="fill-slate-400 text-[10px]">
        Matchs
      </text>
    </svg>
  );
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  READY: 'Prêt',
  PUBLISHED: 'Publié',
  ONGOING: 'En cours',
  COMPLETED: 'Terminé',
};

export default function DashboardHome() {
  const { user, activeOrg, apiFetch } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', activeOrg?.id],
    queryFn: () => apiFetch<DashboardData>('/me/dashboard'),
    enabled: !!activeOrg,
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
            Bonjour, {user?.firstName ?? ''} <span className="align-middle">👋</span>
          </h1>
          <p className="mt-1 text-sm text-muted">Voici un aperçu de vos activités aujourd’hui.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
            <Icon name="plus" className="h-4 w-4" /> Créer un tournoi
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50">
            <Icon name="import" className="h-4 w-4" /> Importer
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-danger/10 px-5 py-4 text-sm text-danger">
          Impossible de charger le tableau de bord : {(error as Error).message}
        </div>
      )}

      {/* Cartes stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !data ? (
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white shadow-card" />
          ))
        ) : (
          <>
            <StatCard icon="trophy" accent="brand" label="Tournois actifs" value={String(data.stats.activeTournaments)} hint="Publiés ou en cours" />
            <StatCard icon="teams" accent="field" label="Équipes inscrites" value={String(data.stats.registeredTeams)} hint="Validées" />
            <StatCard icon="calendar" accent="energy" label="Matchs à venir" value={String(data.stats.upcomingMatches)} hint="Programmés" />
            <StatCard icon="payments" accent="victory" label="Paiements reçus" value={fmtMoney(data.stats.paymentsReceived, data.stats.currency)} hint="Total encaissé" />
          </>
        )}
      </div>

      {/* Tournoi phare + prochains matchs */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Phare */}
        <div className="rounded-2xl bg-white p-5 shadow-card lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold text-ink">Mon tournoi phare</h2>
          {isLoading ? (
            <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
          ) : data?.featuredTournament ? (
            <div className="overflow-hidden rounded-2xl bg-navy text-white">
              <div className="flex items-center gap-4 p-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-extrabold">
                  {data.featuredTournament.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-field px-2 py-0.5 text-[11px] font-semibold">
                      {STATUS_LABEL[data.featuredTournament.status] ?? data.featuredTournament.status}
                    </span>
                    <span className="text-xs text-white/60">{data.featuredTournament.sport}</span>
                  </div>
                  <h3 className="truncate text-xl font-extrabold">{data.featuredTournament.name}</h3>
                  <p className="text-sm text-white/70">
                    {data.featuredTournament.teams} {data.featuredTournament.teams > 1 ? 'équipes' : 'équipe'} ·{' '}
                    {data.featuredTournament.categories}{' '}
                    {data.featuredTournament.categories > 1 ? 'catégories' : 'catégorie'}
                    {data.featuredTournament.city ? ` · ${data.featuredTournament.city}` : ''}
                  </p>
                </div>
                <Link
                  href={`/t/${data.featuredTournament.slug}`}
                  className="hidden rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 sm:block"
                >
                  Voir la page →
                </Link>
              </div>
              {/* Stepper */}
              <div className="border-t border-white/10 bg-white/5 p-5">
                <div className="mb-3 text-sm font-semibold">Progression du tournoi</div>
                <div className="flex items-center">
                  {data.featuredTournament.steps.map((step, i) => {
                    const done = i < data.featuredTournament!.progressIndex;
                    const current = i === data.featuredTournament!.progressIndex;
                    return (
                      <div key={step} className="flex flex-1 flex-col items-center">
                        <div className="flex w-full items-center">
                          <div className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : done || current ? 'bg-field' : 'bg-white/20'}`} />
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                              done ? 'bg-field text-white' : current ? 'bg-white text-navy' : 'bg-white/20 text-white/60'
                            }`}
                          >
                            {done ? '✓' : i + 1}
                          </div>
                          <div className={`h-0.5 flex-1 ${i === data.featuredTournament!.steps.length - 1 ? 'opacity-0' : done ? 'bg-field' : 'bg-white/20'}`} />
                        </div>
                        <span className="mt-2 text-center text-[10px] text-white/70 sm:text-xs">{step}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-muted">
              Aucun tournoi pour l’instant. Créez votre premier tournoi pour démarrer.
            </div>
          )}
        </div>

        {/* Prochains matchs */}
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Prochains matchs</h2>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
            ) : data?.upcomingMatches?.length ? (
              data.upcomingMatches.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                  <div className="text-center">
                    <div className="text-sm font-bold text-ink">{fmtTime(m.scheduledAt)}</div>
                    <div className="text-[10px] text-muted">{fmtDay(m.scheduledAt)}</div>
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="truncate font-semibold text-ink">
                      {m.home} <span className="text-muted">vs</span> {m.away}
                    </div>
                    <div className="truncate text-xs text-brand">
                      {m.tournament}
                      {m.field ? ` · ${m.field}` : ''}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-muted">
                Aucun match programmé.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Répartition + revenus */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 text-lg font-bold text-ink">Répartition des matchs</h2>
          {data ? (
            <div className="flex items-center gap-4">
              <Donut played={data.matches.played} upcoming={data.matches.upcoming} />
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-brand" /> Joués
                  <span className="ml-auto font-semibold text-ink">{data.matches.played}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#E7ECF3]" /> À venir
                  <span className="ml-auto font-semibold text-ink">{data.matches.upcoming}</span>
                </div>
                <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
                  <span className="text-muted">Total</span>
                  <span className="ml-auto font-semibold text-ink">{data.matches.total}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-36 animate-pulse rounded-xl bg-slate-50" />
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Revenus</h2>
            <span className="text-xs text-muted">Total encaissé</span>
          </div>
          <div className="text-3xl font-extrabold text-ink">
            {data ? fmtMoney(data.revenue, data.stats.currency) : '—'}
          </div>
          <div className="mt-4 flex h-24 items-end gap-1">
            {/* Barre de progression décorative basée sur le réel (part payée) */}
            {data && data.matches.total > 0 ? (
              <div className="w-full">
                <div className="mb-1 flex justify-between text-xs text-muted">
                  <span>Avancement des matchs</span>
                  <span>{Math.round((data.matches.played / data.matches.total) * 100)}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-field"
                    style={{ width: `${(data.matches.played / data.matches.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted">Les revenus apparaîtront ici dès les premiers paiements.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
