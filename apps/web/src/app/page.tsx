'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/* ─────────── Icônes ─────────── */
const P = {
  check: <path d="M20 6 9 17l-5-5" />,
  bolt: <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />,
  calendar: (<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></>),
  trophy: (<><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3M9 20h6M12 14v6" /></>),
  share: (<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5" /></>),
  bell: (<><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></>),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  star: <path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 21l-4.9-2.6.9-5.5-4-3.9L9.5 8Z" />,
  play: <path d="M6 4l14 8-14 8V4Z" />,
  live: (<><circle cx="12" cy="12" r="3" /><path d="M5 12a7 7 0 0 1 14 0M8.5 15.5a3.5 3.5 0 0 1 7 0" /></>),
};
function Ic({ d, className = 'h-5 w-5' }: { d: keyof typeof P; className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>{P[d]}</svg>;
}

/* ─────────── Mot rotatif ─────────── */
function Rotating({ words, className = '' }: { words: string[]; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % words.length), 2200);
    return () => clearInterval(t);
  }, [words.length]);
  return <span className={`inline-block transition-all duration-500 ${className}`} key={i}>{words[i]}</span>;
}

/* ─────────── Puce “fait” ─────────── */
function Feat({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-field/15 text-field">
        <Ic d="check" className="h-3.5 w-3.5" />
      </span>
      <span className="text-sm leading-relaxed text-ink/80">{children}</span>
    </li>
  );
}

/* ─────────── Faux navigateur (mockup) ─────────── */
function Window({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_-20px_rgba(7,27,69,0.35)]">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ml-3 truncate text-xs text-muted">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-ink">
      {/* ─────────── NAV ─────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/85 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/"><img src="/logo-gboroly-horizontal.png" alt="Gboroly" className="h-11 w-auto" /></Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-ink/70 md:flex">
            <a href="#fonctionnalites" className="hover:text-ink">Fonctionnalités</a>
            <Link href="/discover" className="hover:text-ink">Découvrir</Link>
            <a href="#tarifs" className="hover:text-ink">Tarifs</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink/80 hover:bg-slate-100">Se connecter</Link>
            <Link href="/login" className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">Commencer</Link>
          </div>
        </nav>
      </header>

      {/* ─────────── HERO ─────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-brand/5 blur-3xl" />
        <div className="absolute -left-40 top-40 h-96 w-96 rounded-full bg-energy/5 blur-3xl" />
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3.5 py-1.5 text-xs font-semibold text-brand">
              <Ic d="star" className="h-3.5 w-3.5 text-victory" /> The African Sports Tournament OS
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] text-navy sm:text-5xl">
              Organisez des tournois que{' '}
              <span className="relative inline-block">
                <span className="absolute inset-x-0 bottom-1 -z-0 h-4 -rotate-1 bg-victory/40" />
                <span className="font-script relative z-10 pr-1 text-[1.08em] text-brand">
                  <Rotating words={['les équipes', 'les joueurs', 'les organisateurs', 'les supporters']} />
                </span>
              </span>{' '}
              vont adorer
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
              Le logiciel qui digitalise vos tournois de A à Z — inscriptions, calendrier, scores,
              classements et paiements. Vous gagnez du temps, tout le monde reste informé.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 font-semibold text-white shadow-lg shadow-brand/25 hover:bg-brand-dark">
                Commencer gratuitement <Ic d="arrow" className="h-4 w-4" />
              </Link>
              <Link href="/discover" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-6 py-3.5 font-semibold text-ink hover:bg-slate-50">
                Découvrir les tournois
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted">Gratuit pour l'organisateur au démarrage · FCFA & Mobile Money · pensé pour l'Afrique</p>
          </div>

          {/* Image */}
          <div className="relative">
            <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-br from-brand/20 to-energy/20 blur-2xl" />
            <img
              src="/hero.png"
              alt="Tournoi de Maracana à Abidjan"
              className="aspect-[4/3] w-full rounded-3xl object-cover shadow-[0_25px_70px_-25px_rgba(7,27,69,0.5)] ring-1 ring-black/5"
            />
            <div className="absolute bottom-4 left-4 flex items-center gap-2.5 rounded-2xl bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-sm font-extrabold text-white">M</span>
              <div>
                <div className="text-xs font-bold text-ink">Maracana Cup Abidjan</div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-field">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-field" /> En direct · 8 équipes
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Aperçu produit */}
        <div className="mx-auto max-w-5xl px-5 pb-16">
          <Window title="gboroly.app · Maracana Cup Abidjan 2026">
            <div className="rounded-xl bg-navy p-4 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-lg font-extrabold">M</span>
                <div><div className="flex items-center gap-2"><span className="rounded-full bg-field px-2 py-0.5 text-[10px] font-semibold">En cours</span><span className="text-[11px] text-white/60">Maracana</span></div><div className="font-bold">Maracana Cup Abidjan 2026</div></div>
                <span className="ml-auto hidden text-xs text-white/60 sm:block">8 équipes · Abidjan</span>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[['Groupe A', 'FC Abobo', '9'], ['Groupe A', 'Espoir Marcory', '4'], ['Groupe B', 'AS Cocody', '7']].map(([g, e, p]) => (
                <div key={e} className="rounded-xl border border-slate-100 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted">{g}</div>
                  <div className="mt-1 flex items-center justify-between"><span className="text-sm font-semibold text-ink">{e}</span><span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">{p} pts</span></div>
                </div>
              ))}
            </div>
          </Window>
        </div>
      </section>

      {/* ─────────── BANDEAU SPORTS ─────────── */}
      <section className="border-y border-slate-100 bg-canvas py-16">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <h2 className="text-3xl font-extrabold text-navy sm:text-4xl">
            Digitalisez votre prochain tournoi de{' '}
            <span className="font-script pr-1 text-[1.08em] text-brand">Maracana</span>
          </h2>
          <p className="mt-4 text-lg text-muted">Conçu pour le Maracana — de la phase de poules aux phases finales, avec vos règles de départage.</p>
          <Link href="/login" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 font-semibold text-white shadow-lg shadow-brand/25 hover:bg-brand-dark">
            Commencer gratuitement <Ic d="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ─────────── GAGNEZ DU TEMPS ─────────── */}
      <section id="fonctionnalites" className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand"><Ic d="bolt" className="h-3.5 w-3.5" /> Gagnez du temps</span>
            <h2 className="mt-4 text-3xl font-extrabold text-navy sm:text-4xl">Gardez le contrôle, sans stress</h2>
            <p className="mt-3 text-muted">Rendez le jour J serein, sans course contre la montre.</p>
            <ul className="mt-6 space-y-4">
              <Feat>Générez le calendrier automatiquement, ajustez-le à la main</Feat>
              <Feat>Saisissez les scores — le classement et le bracket se mettent à jour tout seuls</Feat>
              <Feat>Passez d'un tour à l'autre en un clic</Feat>
              <Feat>Faites vos modifications vous-même, instantanément — sans dépendre de personne</Feat>
            </ul>
          </div>
          {/* Bracket mockup */}
          <Window title="Phases finales — mise à jour en direct">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Demi-finales</div>
                {[['FC Abobo', 'Espoir Marcory'], ['AS Cocody', 'Étoile Yop.']].map((m, k) => (
                  <div key={k} className="mb-3 rounded-xl border border-slate-100 p-2.5">
                    <div className="flex items-center justify-between rounded-lg bg-field/10 px-2 py-1.5 font-semibold text-field"><span>{m[0]}</span><span>✓</span></div>
                    <div className="mt-1 px-2 py-1.5 text-ink/70">{m[1]}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col justify-center">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Finale</div>
                <div className="rounded-xl border border-slate-100 p-2.5">
                  <div className="flex items-center justify-between rounded-lg bg-field/10 px-2 py-1.5 font-semibold text-field"><span>FC Abobo</span><span>✓</span></div>
                  <div className="mt-1 px-2 py-1.5 text-ink/70">AS Cocody</div>
                </div>
                <button className="mt-3 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white">Saisir le score</button>
              </div>
            </div>
          </Window>
        </div>
      </section>

      {/* ─────────── PERSONNALISEZ ─────────── */}
      <section className="bg-canvas py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-2 lg:items-center">
          <Window title="Page publique du tournoi">
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-navy p-3 text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-energy text-sm font-bold">M</span>
                <div className="text-sm font-bold">Maracana Cup Abidjan 2026</div>
                <button className="ml-auto flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs"><Ic d="share" className="h-3.5 w-3.5" /> Partager</button>
              </div>
              <div className="flex gap-2">
                {['Accueil', 'Matchs', 'Classement', 'Équipes'].map((t, k) => (
                  <span key={t} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${k === 0 ? 'bg-brand text-white' : 'bg-slate-100 text-muted'}`}>{t}</span>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['Règles', 'Sponsors', 'Bannière'].map((t) => (
                  <div key={t} className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-muted">{t}</div>
                ))}
              </div>
            </div>
          </Window>
          <div className="lg:order-first">
            <span className="inline-flex items-center gap-2 rounded-full bg-energy/10 px-3 py-1 text-xs font-semibold text-energy"><Ic d="share" className="h-3.5 w-3.5" /> Partagez</span>
            <h2 className="mt-4 text-3xl font-extrabold text-navy sm:text-4xl">Personnalisez votre événement</h2>
            <p className="mt-3 text-muted">Partager les infos de votre tournoi n'a jamais été aussi simple.</p>
            <ul className="mt-6 space-y-4">
              <Feat>Une page publique par tournoi : règles, sponsors, actualités</Feat>
              <Feat>À vos couleurs — bannière et branding personnalisés</Feat>
              <Feat>Partagez en un lien (ou QR code) — équipes et supporters suivent tout</Feat>
              <Feat>Mise à jour en direct : scores, classements, phases finales</Feat>
            </ul>
          </div>
        </div>
      </section>

      {/* ─────────── FINI LE “ON JOUE OÙ” ─────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-field/10 px-3 py-1 text-xs font-semibold text-field"><Ic d="bell" className="h-3.5 w-3.5" /> Restez informé</span>
            <h2 className="mt-4 text-3xl font-extrabold text-navy sm:text-4xl">Fini le « On joue où&nbsp;? »</h2>
            <p className="mt-3 text-muted">Offrez à tous — joueurs, entraîneurs, parents, supporters — une vision claire de l'action.</p>
            <ul className="mt-6 space-y-4">
              <Feat>Fini les textos de dernière minute et les matchs manqués</Feat>
              <Feat>Calendrier accessible et mises à jour en direct</Feat>
              <Feat>Suivez le tournoi, sur place ou à distance</Feat>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { d: 'live' as const, t: 'En direct', s: 'Scores mis à jour en temps réel', c: 'text-energy bg-energy/10' },
              { d: 'calendar' as const, t: 'Calendrier', s: 'Prochains matchs, heures, terrains', c: 'text-brand bg-brand/10' },
              { d: 'trophy' as const, t: 'Classements', s: 'Poules, bracket, meilleurs buteurs', c: 'text-victory bg-victory/15' },
              { d: 'share' as const, t: 'Partage', s: 'Un lien, tout le monde suit', c: 'text-field bg-field/10' },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${f.c}`}><Ic d={f.d} /></span>
                <div className="mt-3 font-bold text-ink">{f.t}</div>
                <div className="mt-1 text-sm text-muted">{f.s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── CTA FINAL ─────────── */}
      <section id="tarifs" className="px-5 py-16">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-navy px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Prêt à faire vivre vos tournois&nbsp;?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">Créez votre premier tournoi en quelques minutes. Gratuit pour démarrer.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 font-semibold text-white shadow-lg shadow-brand/30 hover:bg-brand-dark">
              Commencer gratuitement <Ic d="arrow" className="h-4 w-4" />
            </Link>
            <Link href="/t/maracana-cup-abidjan-2026" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 font-semibold text-white hover:bg-white/10">
              <Ic d="play" className="h-4 w-4" /> Voir une démo
            </Link>
          </div>
          <p className="mt-5 text-sm font-semibold tracking-wide text-victory">ORGANISEZ • GÉREZ • FAITES VIVRE</p>
        </div>
      </section>

      {/* ─────────── FOOTER ─────────── */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <img src="/logo-gboroly-horizontal.png" alt="Gboroly" className="h-11 w-auto" />
            <p className="mt-3 max-w-xs text-sm text-muted">Le système d'exploitation des tournois sportifs africains. De l'inscription à la finale.</p>
          </div>
          {[
            { h: 'Produit', l: [['Fonctionnalités', '#fonctionnalites'], ['Découvrir', '/discover'], ['Se connecter', '/login']] },
            { h: 'Ressources', l: [['Guides', '#'], ['Support', '#'], ['Statut', '#']] },
            { h: 'Légal', l: [['Confidentialité', '#'], ['Conditions', '#'], ['Mentions légales', '#']] },
          ].map((col) => (
            <div key={col.h}>
              <div className="text-sm font-bold text-ink">{col.h}</div>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {col.l.map(([label, href]) => (
                  <li key={label}><Link href={href} className="hover:text-ink">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-5 text-xs text-muted sm:flex-row">
            <span>© {new Date().getFullYear()} Gboroly. Tous droits réservés.</span>
            <span>Fièrement conçu en Côte d'Ivoire 🇨🇮</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
