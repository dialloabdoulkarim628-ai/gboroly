import { getTournament } from '@/lib/api';
import { EmptyState } from '../_components';
import { RegisterForm } from './_form';

type Params = { params: Promise<{ slug: string }> };

export default async function RegisterPage({ params }: Params) {
  const { slug } = await params;
  const t = await getTournament(slug);
  if (!t) return <EmptyState>Tournoi introuvable.</EmptyState>;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink">Inscrire mon équipe</h1>
        <p className="text-sm text-muted">
          {t.name} — {[t.city, t.country].filter(Boolean).join(', ')}
        </p>
      </div>
      <RegisterForm slug={slug} categories={t.categories} />
    </div>
  );
}
