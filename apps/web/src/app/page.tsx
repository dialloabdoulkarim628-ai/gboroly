'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

/* ─────────── Icônes (SVG, jamais d'emoji) ─────────── */
const P = {
  check: <path d="M20 6 9 17l-5-5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  calendar: (<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></>),
  trophy: (<><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3M9 20h6M12 14v6" /></>),
  users: (<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></>),
  pin: (<><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>),
  wallet: (<><rect x="3" y="6" width="18" height="14" rx="2.5" /><path d="M3 10h18M16 15h2M7 3.5 15 6" /></>),
  star: <path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 21l-4.9-2.6.9-5.5-4-3.9L9.5 8Z" />,
  megaphone: (<><path d="M3 10v4a1 1 0 0 0 1 1h3l6 4V5L7 9H4a1 1 0 0 0-1 1Z" /><path d="M17 8.5a5 5 0 0 1 0 7" /></>),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  play: <path d="M7 4.5v15l12.5-7.5L7 4.5Z" />,
  live: (<><circle cx="12" cy="12" r="2.5" /><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" /></>),
  link: <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />,
};
type IconName = keyof typeof P;
function Ic({ d, className = 'h-5 w-5' }: { d: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {P[d]}
    </svg>
  );
}

/** Anneau de focus clavier, identique partout. */
const ring = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light focus-visible:ring-offset-2';
const ringDark = `${ring} focus-visible:ring-offset-[#03060F]`;

const FILM_SECONDS = 44;
const DEMO_SLUG = '/t/maracana-cup-abidjan-2026';

/* ─────────── Le film : lecture au clic, sous-titré, pause hors écran ─────────── */
function Film({ playSignal }: { playSignal: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  const start = useCallback(() => {
    const v = vid.current;
    if (!v) return;
    setStarted(true);
    v.play().catch(() => {});
  }, []);

  // Le bouton « Voir le film » du hero : on amène le film à l'écran et on le lance.
  useEffect(() => {
    if (!playSignal) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    wrap.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    start();
  }, [playSignal, start]);

  // Pause automatique quand le film sort de l'écran.
  useEffect(() => {
    const el = wrap.current;
    const v = vid.current;
    if (!el || !v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio < 0.25 && !v.paused) v.pause();
      },
      { threshold: [0, 0.25] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} id="film" className="relative scroll-mt-24">
      {/* halo */}
      <div aria-hidden="true" className="absolute -inset-x-6 -inset-y-8 -z-10 rounded-[3rem] bg-[radial-gradient(60%_60%_at_50%_45%,rgba(45,140,255,0.28),transparent_70%)] blur-2xl" />
      <div className="overflow-hidden rounded-2xl bg-[#03060F] ring-1 ring-white/10 sm:rounded-3xl">
        <div className="relative aspect-video">
          <video
            ref={vid}
            className="absolute inset-0 h-full w-full"
            poster="/video/gboroly-presentation-poster.jpg"
            preload="none"
            playsInline
            controls={started}
            onEnded={() => setStarted(false)}
          >
            <source src="/video/gboroly-presentation.mp4" type="video/mp4" />
            <track kind="captions" src="/video/gboroly-presentation.fr.vtt" srcLang="fr" label="Français" default />
          </video>

          {!started && (
            <button
              type="button"
              onClick={start}
              aria-label={`Lire le film de présentation de Gboroly (${FILM_SECONDS} secondes, sous-titré)`}
              className={`group absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-gradient-to-t from-[#03060F]/80 via-transparent to-transparent sm:justify-end sm:pb-10 ${ringDark}`}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-navy transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none sm:mb-5 sm:h-20 sm:w-20">
                <Ic d="play" className="ml-1 h-7 w-7 fill-current sm:h-8 sm:w-8" />
              </span>
              <span className="hidden text-base font-semibold text-white sm:block">Regarder le film</span>
              <span className="mt-0.5 hidden text-xs text-white/70 sm:block">{FILM_SECONDS} secondes · sous-titré</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────── Cadres d'aperçu ─────────── */
function Browser({ src, alt, url, priority = false }: { src: string; alt: string; url: string; priority?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(7,27,69,0.45)]">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="ml-3 truncate rounded-md bg-white px-2.5 py-0.5 text-[11px] text-muted ring-1 ring-slate-200">{url}</span>
      </div>
      <img src={src} alt={alt} width={1600} height={1000} loading={priority ? 'eager' : 'lazy'} decoding="async" className="block h-auto w-full" />
    </div>
  );
}

function Phone({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`relative w-[200px] rounded-[2.4rem] bg-[#0B0E15] p-2 ring-1 ring-white/15 sm:w-[240px] ${className}`}>
      <div className="overflow-hidden rounded-[2rem]">
        <img src={src} alt={alt} width={585} height={1266} loading="lazy" decoding="async" className="block h-auto w-full" />
      </div>
    </div>
  );
}

function Eyebrow({ children, tone = 'brand' }: { children: React.ReactNode; tone?: 'brand' | 'energy' | 'field' | 'dark' }) {
  const c = {
    brand: 'bg-brand/10 text-brand',
    energy: 'bg-energy/10 text-[#C2410C]',
    field: 'bg-field/10 text-[#0F7A3D]',
    dark: 'bg-white/10 text-[#8CC1FF]',
  }[tone];
  return <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${c}`}>{children}</span>;
}

function Check({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${dark ? 'bg-brand-light/20 text-[#8CC1FF]' : 'bg-field/15 text-field'}`}>
        <Ic d="check" className="h-3.5 w-3.5" />
      </span>
      <span className={`leading-relaxed ${dark ? 'text-white/80' : 'text-ink/80'}`}>{children}</span>
    </li>
  );
}

/* ─────────── Données ─────────── */
const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'trophy', title: 'Créez le tournoi', text: 'Nom, dates, lieu et format : poules puis phases finales.' },
  { icon: 'users', title: 'Inscrivez les équipes', text: 'En ligne ou par vous. Validez-les en un geste.' },
  { icon: 'calendar', title: 'Générez le calendrier', text: 'Sur un jour ou plusieurs semaines, terrain par terrain.' },
  { icon: 'live', title: 'Faites vivre le tournoi', text: 'Scores en direct, classements et bracket à jour.' },
];

const BEFORE = [
  'Les listes d’équipes sur papier',
  'Les scores notés… puis perdus',
  'Le calendrier refait à la main au moindre retard',
  '« On joue où ? » toute la journée sur WhatsApp',
];
const AFTER = [
  'Inscriptions en ligne, équipes validées en un geste',
  'Un score saisi : classement et bracket à jour',
  'Un calendrier généré automatiquement',
  'Un seul lien : tout le monde suit en direct',
];

/* Mini-aperçus des cartes hautes (à côté de Paiements) */
const TEAMS_PREVIEW = (
  <ul className="space-y-2" aria-hidden="true">
    {['FC Abobo', 'Espoir de Marcory', 'AS Cocody'].map((t) => (
      <li key={t} className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2 text-sm font-medium text-ink">
        {t}
        <span className="rounded-full bg-field/15 px-2 py-0.5 text-[11px] font-semibold text-[#0F7A3D]">Validée</span>
      </li>
    ))}
  </ul>
);
const VENUES_PREVIEW = (
  <ul className="space-y-2" aria-hidden="true">
    {[
      ['09:00', 'Terrain A', 'FC Adjamé – Racing'],
      ['09:00', 'Terrain B', 'AS Cocody – Koumassi'],
      ['11:00', 'Terrain A', 'FC Abobo – Plateau'],
    ].map(([h, v, m]) => (
      <li key={v + h} className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-2 text-sm">
        <span className="font-semibold tabular-nums text-brand">{h}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-ink">{m}</span>
          <span className="block text-xs text-muted">{v}</span>
        </span>
      </li>
    ))}
  </ul>
);

const TOOLS: { icon: IconName; title: string; text: string; tone: string; preview?: React.ReactNode }[] = [
  { icon: 'users', title: 'Équipes & joueurs', text: 'Inscriptions, validation et effectifs complets, au même endroit.', tone: 'bg-brand/10 text-brand', preview: TEAMS_PREVIEW },
  { icon: 'pin', title: 'Terrains', text: 'Plusieurs terrains, créneaux et temps de repos par équipe.', tone: 'bg-field/10 text-field', preview: VENUES_PREVIEW },
  { icon: 'star', title: 'Sponsors', text: 'Vos partenaires mis en avant sur la page publique.', tone: 'bg-victory/15 text-[#B45309]' },
  { icon: 'megaphone', title: 'Communications', text: 'Annonces et notifications envoyées aux équipes.', tone: 'bg-energy/10 text-[#C2410C]' },
  { icon: 'chart', title: 'Statistiques', text: 'Meilleurs buteurs, résultats et progression du tournoi.', tone: 'bg-navy/10 text-navy' },
];

/* ─────────── Page ─────────── */
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [playSignal, setPlaySignal] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-ink">
      <a href="#contenu" className={`sr-only z-[60] rounded-lg bg-white px-4 py-2 font-semibold text-navy focus:not-sr-only focus:fixed focus:left-4 focus:top-4 ${ring}`}>
        Aller au contenu
      </a>

      {/* ─────────── NAV ─────────── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 motion-reduce:transition-none ${
          scrolled ? 'border-b border-slate-200/80 bg-white/90 backdrop-blur' : 'border-b border-transparent bg-transparent'
        }`}
      >
        <nav aria-label="Navigation principale" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-[72px] sm:px-6">
          <Link href="/" className={`rounded-lg ${ring}`} aria-label="Gboroly, accueil">
            <img src={scrolled ? '/logo-gboroly-horizontal.png' : '/logo-gboroly-horizontal-blanc.png'} alt="Gboroly" width={160} height={48} className="h-8 w-auto sm:h-10" />
          </Link>
          <div className={`hidden items-center gap-1 text-sm font-medium lg:flex ${scrolled ? 'text-ink/70' : 'text-white/75'}`}>
            {[
              ['Le film', '#film'],
              ['Comment ça marche', '#etapes'],
              ['Fonctionnalités', '#fonctionnalites'],
            ].map(([l, h]) => (
              <a key={h} href={h} className={`rounded-lg px-3 py-2 transition-colors ${scrolled ? 'hover:text-ink' : 'hover:text-white'} ${ring}`}>{l}</a>
            ))}
            <Link href="/discover" className={`rounded-lg px-3 py-2 transition-colors ${scrolled ? 'hover:text-ink' : 'hover:text-white'} ${ring}`}>Découvrir les tournois</Link>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/login"
              className={`inline-flex min-h-[44px] items-center whitespace-nowrap rounded-xl px-2.5 text-sm font-semibold transition-colors sm:px-4 ${scrolled ? 'text-ink/80 hover:bg-slate-100' : 'text-white/85 hover:bg-white/10'} ${ring}`}
            >
              Se connecter
            </Link>
            <Link href="/login" className={`inline-flex min-h-[44px] items-center whitespace-nowrap rounded-xl bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-dark ${ring}`}>
              Commencer
            </Link>
          </div>
        </nav>
      </header>

      <main id="contenu">
        {/* ─────────── HERO + FILM ─────────── */}
        <section className="relative overflow-hidden bg-[#03060F] text-white">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-[-20%] h-[640px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(18,105,211,0.35),transparent)]" />
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]" />
          </div>

          <div className="relative mx-auto max-w-4xl px-4 pb-14 pt-32 text-center sm:px-6 sm:pt-40">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-energy" aria-hidden="true" /> The African Sports Tournament OS
            </span>
            <h1 className="mt-6 text-[2.5rem] font-extrabold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
              Vos tournois de Maracana,{' '}
              <span className="font-script whitespace-nowrap pr-1 text-[1.06em] font-semibold text-brand-light">enfin simples.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
              Inscriptions, calendrier, scores en direct, classements et paiements&nbsp;: Gboroly digitalise votre tournoi
              de l’inscription à la finale.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className={`inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-brand px-7 font-semibold text-white transition-colors hover:bg-brand-dark sm:w-auto ${ringDark}`}
              >
                Créer mon tournoi gratuitement <Ic d="arrow" className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setPlaySignal((n) => n + 1)}
                className={`inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-xl border border-white/20 px-6 font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto ${ringDark}`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-navy">
                  <Ic d="play" className="ml-0.5 h-3 w-3 fill-current" />
                </span>
                Voir le film · {FILM_SECONDS} s
              </button>
            </div>
            <p className="mt-5 text-xs text-white/55">Gratuit pour démarrer · FCFA &amp; Mobile Money · Conçu en Côte d’Ivoire</p>
          </div>

          <div className="relative mx-auto max-w-5xl px-4 pb-20 sm:px-6 sm:pb-28">
            <Film playSignal={playSignal} />
          </div>
        </section>

        {/* ─────────── AVANT / APRÈS ─────────── */}
        <section aria-labelledby="fini-titre" className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="reveal mx-auto max-w-2xl text-center">
              <Eyebrow tone="energy">Le jour J</Eyebrow>
              <h2 id="fini-titre" className="mt-4 text-3xl font-extrabold tracking-tight text-navy sm:text-5xl">
                Fini le «&nbsp;on joue où&nbsp;?&nbsp;»
              </h2>
              <p className="mt-4 text-lg text-muted">Un tournoi, c’est une fête. Pas une course contre la montre pour l’organisateur.</p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2">
              <div className="reveal rounded-3xl border border-slate-200 bg-canvas p-6 sm:p-8">
                <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted">Avant</h3>
                <ul className="mt-5 space-y-4">
                  {BEFORE.map((t) => (
                    <li key={t} className="flex items-start gap-3 text-ink/70">
                      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                        <Ic d="x" className="h-3.5 w-3.5" />
                      </span>
                      <span className="leading-relaxed line-through decoration-slate-300">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="reveal rounded-3xl bg-navy p-6 text-white sm:p-8">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-[#8CC1FF]">
                  <span className="h-1.5 w-1.5 rounded-full bg-energy" aria-hidden="true" /> Avec Gboroly
                </h3>
                <ul className="mt-5 space-y-4">
                  {AFTER.map((t) => (
                    <Check key={t} dark>{t}</Check>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────── 4 ÉTAPES ─────────── */}
        <section id="etapes" aria-labelledby="etapes-titre" className="scroll-mt-20 border-y border-slate-100 bg-canvas py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="reveal mx-auto max-w-2xl text-center">
              <Eyebrow>Comment ça marche</Eyebrow>
              <h2 id="etapes-titre" className="mt-4 text-3xl font-extrabold tracking-tight text-navy sm:text-5xl">
                De l’inscription à la{' '}
                <span className="font-script pr-1 text-[1.06em] text-brand">finale.</span>
              </h2>
              <p className="mt-4 text-lg text-muted">Quatre étapes. Votre premier tournoi est prêt en quelques minutes.</p>
            </div>

            <ol className="relative mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <span aria-hidden="true" className="absolute left-[12.5%] right-[12.5%] top-7 hidden h-px bg-gradient-to-r from-brand/0 via-brand/30 to-brand/0 lg:block" />
              {STEPS.map((s, i) => (
                <li key={s.title} className="reveal relative rounded-2xl border border-slate-200 bg-white p-6 text-center">
                  <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-white">
                    <Ic d={s.icon} className="h-6 w-6" />
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-energy text-xs font-bold text-white ring-4 ring-white">
                      {i + 1}
                    </span>
                  </span>
                  <h3 className="mt-5 font-bold text-ink">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ─────────── FONCTIONNALITÉS (vrais écrans) ─────────── */}
        <section id="fonctionnalites" aria-label="Fonctionnalités" className="scroll-mt-20 bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-6xl space-y-24 px-4 sm:space-y-32 sm:px-6">
            {/* Calendrier */}
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
              <div className="reveal">
                <Eyebrow>Calendrier</Eyebrow>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">
                  Le calendrier se génère{' '}
                  <span className="font-script pr-1 text-[1.06em] text-brand">tout seul.</span>
                </h2>
                <p className="mt-4 text-lg text-muted">Les jours, les heures, les terrains. Vous ajustez à la main si besoin.</p>
                <ul className="mt-7 space-y-4">
                  <Check>Sur une journée ou sur plusieurs semaines — week-ends seulement si vous voulez</Check>
                  <Check>Plusieurs terrains en parallèle, créneaux calculés automatiquement</Check>
                  <Check>Temps de repos par équipe en minutes, en heures ou en jours</Check>
                </ul>
              </div>
              <div className="reveal">
                <Browser src="/landing/dash-calendrier.webp" alt="Écran Calendrier de Gboroly : les matchs du samedi répartis par heure et par terrain" url="gboroly · Calendrier" />
              </div>
            </div>

            {/* Score live */}
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
              <div className="reveal lg:order-2">
                <Eyebrow tone="energy">Score en direct</Eyebrow>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">
                  Saisissez un score. Tout se met à jour,{' '}
                  <span className="font-script pr-1 text-[1.06em] text-brand">instantanément.</span>
                </h2>
                <p className="mt-4 text-lg text-muted">Plus de tableau à recopier : Gboroly applique vos règles de départage.</p>
                <ul className="mt-7 space-y-4">
                  <Check>Classements des poules recalculés à chaque résultat</Check>
                  <Check>Phases finales et bracket remplis automatiquement</Check>
                  <Check>Passez d’un tour à l’autre en un clic</Check>
                </ul>
              </div>
              <div className="reveal relative lg:order-1">
                <Browser src="/landing/dash-classements.webp" alt="Écran Classements de Gboroly : tableaux des groupes A et B avec points et différence de buts" url="gboroly · Classements" />
                <div className="absolute -bottom-6 right-4 hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_20px_50px_-20px_rgba(7,27,69,0.45)] sm:flex">
                  <span className="text-sm font-semibold text-ink">FC Abobo</span>
                  <span className="rounded-lg bg-navy px-2.5 py-1 text-sm font-extrabold tabular-nums text-white">2 – 0</span>
                  <span className="text-sm font-semibold text-ink">Espoir de Marcory</span>
                  <span className="rounded-full bg-field/15 px-2 py-0.5 text-[11px] font-semibold text-[#0F7A3D]">Terminé</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────── SUPPORTERS (mobile) ─────────── */}
        <section aria-labelledby="supporters-titre" className="relative overflow-hidden bg-[#03060F] py-20 text-white sm:py-28">
          <div aria-hidden="true" className="pointer-events-none absolute right-[-10%] top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(18,105,211,0.3),transparent)]" />
          <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
            <div className="reveal">
              <Eyebrow tone="dark">Supporters</Eyebrow>
              <h2 id="supporters-titre" className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
                Sur chaque{' '}
                <span className="font-script pr-1 text-[1.06em] text-brand-light">téléphone.</span>
              </h2>
              <p className="mt-4 text-lg text-white/70">
                Chaque tournoi a sa page publique. Joueurs, familles et supporters suivent tout en direct — sans compte, sans application à installer.
              </p>
              <ul className="mt-7 space-y-4">
                <Check dark>Scores, classements et phases finales mis à jour en temps réel</Check>
                <Check dark>Calendrier des matchs, terrain par terrain</Check>
                <Check dark>Inscription des équipes directement depuis la page</Check>
              </ul>
              <Link
                href={DEMO_SLUG}
                className={`mt-9 inline-flex min-h-[48px] max-w-full items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-5 text-sm font-medium text-white transition-colors hover:bg-white/10 ${ringDark}`}
              >
                <Ic d="link" className="h-4 w-4 flex-shrink-0 text-brand-light" />
                <span className="truncate">Un seul lien suffit — voir un tournoi en direct</span>
                <Ic d="arrow" className="h-4 w-4 flex-shrink-0" />
              </Link>
            </div>
            <div className="reveal relative flex justify-center gap-4 sm:gap-6">
              <Phone src="/landing/mobile-public.webp" alt="Page publique d’un tournoi sur mobile : statistiques, prochains matchs et derniers résultats" className="mt-10" />
              <Phone src="/landing/mobile-standings.webp" alt="Classement des groupes affiché sur mobile" className="hidden min-[420px]:block" />
            </div>
          </div>
        </section>

        {/* ─────────── BOÎTE À OUTILS (bento) ─────────── */}
        <section aria-labelledby="outils-titre" className="bg-canvas py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="reveal mx-auto max-w-2xl text-center">
              <Eyebrow tone="field">Tout-en-un</Eyebrow>
              <h2 id="outils-titre" className="mt-4 text-3xl font-extrabold tracking-tight text-navy sm:text-5xl">
                Tout votre tournoi, au même endroit.
              </h2>
              <p className="mt-4 text-lg text-muted">Fini les cahiers, les fichiers et les dix groupes WhatsApp.</p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {/* Paiements — carte large */}
              <div className="reveal flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 md:col-span-2 md:row-span-2">
                <div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-energy/10 text-[#C2410C]"><Ic d="wallet" /></span>
                  <h3 className="mt-4 text-2xl font-bold text-ink">Paiements des inscriptions</h3>
                  <p className="mt-2 max-w-md text-muted">Suivez chaque inscription payée, en francs CFA, quel que soit le moyen de paiement.</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {[
                      ['Espèces', 'bg-field'],
                      ['Wave', 'bg-[#1DC3FF]'],
                      ['Orange Money', 'bg-energy'],
                    ].map(([l, c]) => (
                      <span key={l} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-ink">
                        <span className={`h-2.5 w-2.5 rounded-full ${c}`} aria-hidden="true" /> {l}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200" aria-hidden="true">
                  <img src="/landing/dash-paiements.webp" alt="" width={1600} height={1000} loading="lazy" decoding="async" className="block h-auto w-full" />
                </div>
              </div>

              {TOOLS.map((t) => (
                <div key={t.title} className="reveal flex flex-col rounded-3xl border border-slate-200 bg-white p-6">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${t.tone}`}><Ic d={t.icon} /></span>
                  <h3 className="mt-4 font-bold text-ink">{t.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{t.text}</p>
                  {t.preview && <div className="mt-auto pt-5">{t.preview}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────── CTA FINAL ─────────── */}
        <section aria-labelledby="cta-titre" className="relative overflow-hidden bg-[#03060F] text-white">
          <img src="/hero.png" alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-30" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#03060F] via-[#03060F]/70 to-[#03060F]" />
          <div className="reveal relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 sm:py-32">
            <img src="/logo-gboroly-horizontal-blanc.png" alt="" width={200} height={59} className="mx-auto h-12 w-auto" />
            <h2 id="cta-titre" className="mt-8 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Votre prochain tournoi{' '}
              <span className="font-script pr-1 text-[1.06em] text-brand-light">commence ici.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">Créez votre premier tournoi en quelques minutes. Gratuit pour démarrer.</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className={`inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-brand px-7 font-semibold text-white transition-colors hover:bg-brand-dark sm:w-auto ${ringDark}`}
              >
                Créer mon tournoi gratuitement <Ic d="arrow" className="h-4 w-4" />
              </Link>
              <Link
                href={DEMO_SLUG}
                className={`inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-6 font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto ${ringDark}`}
              >
                Voir un tournoi en direct
              </Link>
            </div>
            <p className="mt-8 text-sm font-semibold tracking-[0.2em] text-victory">ORGANISEZ • GÉREZ • FAITES VIVRE</p>
          </div>
        </section>
      </main>

      {/* ─────────── FOOTER ─────────── */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div>
            <img src="/logo-gboroly-horizontal.png" alt="Gboroly" width={160} height={49} className="h-10 w-auto" />
            <p className="mt-3 max-w-xs text-sm text-muted">Le système d’exploitation des tournois sportifs africains. De l’inscription à la finale.</p>
          </div>
          <nav aria-label="Pied de page">
            <ul className="grid grid-cols-2 gap-x-10 gap-y-1 text-sm text-muted">
              {[
                ['Le film', '#film'],
                ['Comment ça marche', '#etapes'],
                ['Fonctionnalités', '#fonctionnalites'],
                ['Découvrir les tournois', '/discover'],
                ['Se connecter', '/login'],
                ['Créer un compte', '/login'],
              ].map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className={`inline-flex min-h-[40px] items-center rounded hover:text-ink ${ring}`}>{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="border-t border-slate-100">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted sm:flex-row sm:px-6">
            <span>© {new Date().getFullYear()} Gboroly. Tous droits réservés.</span>
            <span>Fièrement conçu en Côte d’Ivoire</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
