import { Badge, Button, StatCard } from '@gboroly/ui';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Badge tone="energy" className="mb-6">
            The African Sports Tournament OS
          </Badge>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
            Vos tournois, <span className="text-brand-light">simplement.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            Gboroly digitalise et automatise tout le processus d’organisation d’un tournoi —
            de l’inscription à la finale. Fini le papier, Excel et WhatsApp dispersé.
          </p>
          <p className="mt-4 font-semibold tracking-wide text-victory">
            ORGANISEZ • GÉREZ • FAITES VIVRE
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg">Créer un tournoi</Button>
            <Button size="lg" variant="ghost" className="border-white/20 text-white hover:bg-white/10">
              Découvrir la démo
            </Button>
          </div>
        </div>
      </section>

      {/* Stats preview */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="mb-6 text-2xl font-bold text-ink">Un centre de contrôle unique</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Tournois actifs" value="4" hint="Multi-catégories" accent="brand" />
          <StatCard label="Équipes inscrites" value="48" hint="+8% ce mois" accent="field" />
          <StatCard label="Matchs à venir" value="15" hint="Aujourd’hui : 5" accent="energy" />
          <StatCard label="Paiements reçus" value="5 420 000 FCFA" hint="+18%" accent="victory" />
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ['Automatisation', 'Groupes, calendrier, classement, qualifications, bracket — générés automatiquement.'],
            ['Mobile-first & Afrique', 'FCFA, Mobile Money, WhatsApp, connexions faibles : pensé pour le terrain.'],
            ['Page publique', 'Chaque tournoi a sa page rapide, partageable, mise à jour en direct.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-card border border-slate-100 bg-white p-6 shadow-card">
              <h3 className="text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-muted">
          Gboroly — Vos tournois, simplement. · Côte d’Ivoire · Maracana
        </div>
      </footer>
    </main>
  );
}
