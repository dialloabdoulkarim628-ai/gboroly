'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';

/* ─────────────────────────── Icônes inline ─────────────────────────── */
const I = {
  mail: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>),
  lock: (<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
  eye: (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>),
  eyeOff: (<><path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-3 4M6.6 6.6A18 18 0 0 0 2 11s3.5 7 10 7a10.9 10.9 0 0 0 4.1-.8" /><path d="m3 3 18 18M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>),
  userPlus: (<><circle cx="9" cy="8" r="4" /><path d="M3 21a6 6 0 0 1 12 0M19 8v6M22 11h-6" /></>),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>),
  chevron: <path d="m6 9 6 6 6-6" />,
  shield: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />,
  headset: (<><path d="M4 13a8 8 0 0 1 16 0" /><rect x="3" y="13" width="4" height="6" rx="1.5" /><rect x="17" y="13" width="4" height="6" rx="1.5" /><path d="M20 19a4 4 0 0 1-4 3h-2" /></>),
  trophy: (<><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3M9 20h6M12 14v6" /></>),
  team: (<><circle cx="9" cy="8" r="3" /><path d="M15 8a3 3 0 1 0 0-.01M3 19a6 6 0 0 1 12 0M15 14a6 6 0 0 1 6 5" /></>),
  chart: (<><path d="M3 3v18h18" /><path d="M7 14l3-3 3 3 5-6" /></>),
};
function Ic({ d, className = 'h-5 w-5' }: { d: keyof typeof I; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {I[d]}
    </svg>
  );
}
const GoogleG = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
  </svg>
);
const AppleLogo = ({ light = false }: { light?: boolean }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill={light ? '#fff' : '#000'}>
    <path d="M16.4 12.8c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.8ZM14.2 5.9c.6-.8 1-1.9.9-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-.9 2.9 1 .1 2-.5 2.7-1.3Z" />
  </svg>
);
const MicrosoftLogo = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" /><rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" />
    <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" /><rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
  </svg>
);

/* ─────────────────────────── Carte formulaire (partagée) ─────────────────────────── */
function AuthCard({ dark = false }: { dark?: boolean }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [orgName, setOrgName] = useState('');

  async function onLogin(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try { await login(identifier, password); router.replace('/dashboard'); }
    catch (err) { setError((err as Error).message); setLoading(false); }
  }
  async function onSignup(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try { await register({ firstName, lastName, email, password, orgName }); router.replace('/dashboard'); }
    catch (err) { setError((err as Error).message); setLoading(false); }
  }

  const card = dark
    ? 'rounded-3xl border border-white/10 bg-white/[0.06] p-7 backdrop-blur-xl shadow-[0_10px_40px_-12px_rgba(0,0,0,0.5)]'
    : 'rounded-3xl bg-white p-8 shadow-[0_10px_40px_-12px_rgba(7,27,69,0.25)]';
  const title = dark ? 'text-white' : 'text-ink';
  const sub = dark ? 'text-white/70' : 'text-muted';
  const tabIdle = dark ? 'border-transparent text-white/60 hover:text-white' : 'border-transparent text-muted hover:text-ink';
  const tabActive = dark ? 'border-brand-light text-brand-light' : 'border-brand text-brand';
  const tabBorder = dark ? 'border-white/10' : 'border-slate-100';
  const iWrap = dark
    ? 'flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-4 focus-within:border-brand-light focus-within:bg-white/[0.08] transition-colors'
    : 'flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-brand focus-within:bg-white transition-colors';
  const iEl = dark
    ? 'w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-white/50'
    : 'w-full bg-transparent py-3 text-sm text-ink outline-none placeholder:text-muted';
  const iconMuted = dark ? 'text-white/50' : 'text-muted';
  const linkC = dark ? 'text-brand-light' : 'text-brand';
  const divider = dark ? 'bg-white/15' : 'bg-slate-200';
  const social = dark
    ? 'flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.1]'
    : 'flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-ink transition-colors hover:bg-slate-50';

  return (
    <div className={`relative overflow-hidden ${card}`}>
      {!dark && <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 bg-[radial-gradient(circle,rgba(244,182,58,0.25)_1.5px,transparent_1.5px)] [background-size:10px_10px] opacity-60" />}

      <div className="text-center">
        <h2 className={`text-2xl font-extrabold ${title}`}>Bienvenue <span className="align-middle">👋</span></h2>
        <p className={`mt-1 text-sm ${sub}`}>Connectez-vous à votre compte Gboroly</p>
      </div>

      <div className={`mt-6 grid grid-cols-2 border-b ${tabBorder}`}>
        {([['login', 'Connexion', 'user'], ['signup', 'Créer un compte', 'userPlus']] as const).map(([key, label, ic]) => (
          <button key={key} onClick={() => { setTab(key); setError(null); }}
            className={`flex items-center justify-center gap-2 border-b-2 pb-3 text-sm font-semibold transition-colors ${tab === key ? tabActive : tabIdle}`}>
            <Ic d={ic} className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'login' ? (
        <form onSubmit={onLogin} className="mt-6 space-y-4">
          <div className={iWrap}>
            <Ic d="mail" className={`h-5 w-5 ${iconMuted}`} />
            <input className={iEl} type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Email ou numéro de téléphone" required />
          </div>
          <div className={iWrap}>
            <Ic d="lock" className={`h-5 w-5 ${iconMuted}`} />
            <input className={iEl} type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" required />
            <button type="button" onClick={() => setShowPwd((v) => !v)} className={iconMuted} aria-label="Afficher le mot de passe"><Ic d={showPwd ? 'eyeOff' : 'eye'} className="h-5 w-5" /></button>
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className={`flex items-center gap-2 ${sub}`}>
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" /> Se souvenir de moi
            </label>
            <button type="button" onClick={() => setInfo('La récupération de mot de passe arrive bientôt.')} className={`font-semibold ${linkC} hover:underline`}>Mot de passe oublié ?</button>
          </div>
          {error && <div className="rounded-xl bg-danger/15 px-4 py-2.5 text-sm text-red-300">{error}</div>}
          {info && <div className={`rounded-xl px-4 py-2.5 text-sm ${dark ? 'bg-white/10 text-white/80' : 'bg-brand/5 text-brand'}`}>{info}</div>}
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1D63E0] to-brand py-3 font-semibold text-white shadow-lg shadow-brand/25 transition-opacity hover:opacity-95 disabled:opacity-60">
            {loading ? 'Connexion…' : (<><Ic d="arrow" className="h-4 w-4" /> Se connecter</>)}
          </button>
        </form>
      ) : (
        <form onSubmit={onSignup} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className={iWrap}><input className={iEl} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" required /></div>
            <div className={iWrap}><input className={iEl} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" required /></div>
          </div>
          <div className={iWrap}><Ic d="mail" className={`h-5 w-5 ${iconMuted}`} /><input className={iEl} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required /></div>
          <div className={iWrap}><Ic d="trophy" className={`h-5 w-5 ${iconMuted}`} /><input className={iEl} value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Nom de votre organisation" /></div>
          <div className={iWrap}>
            <Ic d="lock" className={`h-5 w-5 ${iconMuted}`} />
            <input className={iEl} type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe (8 caractères min.)" required minLength={8} />
            <button type="button" onClick={() => setShowPwd((v) => !v)} className={iconMuted} aria-label="Afficher le mot de passe"><Ic d={showPwd ? 'eyeOff' : 'eye'} className="h-5 w-5" /></button>
          </div>
          {error && <div className="rounded-xl bg-danger/15 px-4 py-2.5 text-sm text-red-300">{error}</div>}
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1D63E0] to-brand py-3 font-semibold text-white shadow-lg shadow-brand/25 transition-opacity hover:opacity-95 disabled:opacity-60">
            {loading ? 'Création…' : (<><Ic d="userPlus" className="h-4 w-4" /> Créer mon compte</>)}
          </button>
        </form>
      )}

      <div className={`my-6 flex items-center gap-3 text-xs ${sub}`}>
        <div className={`h-px flex-1 ${divider}`} /> ou continuer avec <div className={`h-px flex-1 ${divider}`} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <button type="button" onClick={() => setInfo('La connexion via Google arrive bientôt.')} className={social}><GoogleG /> <span className="hidden sm:inline">Google</span></button>
        <button type="button" onClick={() => setInfo('La connexion via Apple arrive bientôt.')} className={social}><AppleLogo light={dark} /> <span className="hidden sm:inline">Apple</span></button>
        <button type="button" onClick={() => setInfo('La connexion via Microsoft arrive bientôt.')} className={social}><MicrosoftLogo /> <span className="hidden sm:inline">Microsoft</span></button>
      </div>
    </div>
  );
}

/* Badges de confiance */
function Badges({ dark = false }: { dark?: boolean }) {
  const t = dark ? 'text-white/85' : 'text-muted';
  const items = [
    { d: 'shield' as const, c: 'text-field', label: 'Sécurisé' },
    { d: 'headset' as const, c: dark ? 'text-brand-light' : 'text-brand', label: 'Support 24/7' },
    { d: 'lock' as const, c: 'text-energy', label: 'Confidentialité garantie' },
  ];
  if (dark) {
    return (
      <div className="mt-6 grid grid-cols-3 gap-2 text-center">
        {items.map((i) => (
          <div key={i.label} className={`flex flex-col items-center gap-1 text-xs ${t}`}>
            <Ic d={i.d} className={`h-5 w-5 ${i.c}`} /> <span>{i.label}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted">
      <span className="flex items-center gap-1.5"><Ic d="shield" className="h-4 w-4 text-field" /> Sécurisé</span>
      <span className="text-slate-300">|</span>
      <span className="flex items-center gap-1.5"><Ic d="headset" className="h-4 w-4 text-brand" /> Support 24/7</span>
      <span className="text-slate-300">|</span>
      <span className="flex items-center gap-1.5"><Ic d="lock" className="h-4 w-4 text-energy" /> Confidentialité garantie</span>
    </div>
  );
}

function LogoBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <img src="/logo-gboroly-blanc.png" alt="Gboroly" className="h-32 w-auto object-contain sm:h-40" />
      <p className="mt-2 text-[11px] font-bold tracking-[0.25em] text-white/90">ORGANISEZ • GÉREZ • FAITES VIVRE</p>
      <p className="text-[11px] font-semibold tracking-[0.25em] text-white/70">VOS TOURNOIS, SIMPLEMENT.</p>
      <div className="mt-4 h-1 w-28 rounded-full bg-gradient-to-r from-field via-victory to-energy" />
    </div>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */
export default function LoginPage() {
  const { session, ready } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready && session) router.replace('/dashboard');
  }, [ready, session, router]);

  const langPill = (
    <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
      <Ic d="globe" className="h-4 w-4 text-white/70" /> Français <Ic d="chevron" className="h-3.5 w-3.5 text-white/70" />
    </div>
  );

  return (
    <>
      {/* ══════════ MOBILE ══════════ */}
      <div className="relative min-h-screen overflow-hidden bg-navy lg:hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/login-bg.png')" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/95 via-navy/85 to-navy/70" />
        <div className="relative z-10 flex min-h-screen flex-col px-5 pb-8 pt-6">
          <div className="flex justify-end">{langPill}</div>
          <LogoBlock className="mt-2" />
          <div className="mt-7">
            <AuthCard dark />
          </div>
          <Badges dark />
          <p className="mt-6 text-center text-[11px] text-white/45">© {new Date().getFullYear()} Gboroly. Tous droits réservés.</p>
        </div>
      </div>

      {/* ══════════ DESKTOP ══════════ */}
      <div className="hidden min-h-screen bg-[#EEF2F8] lg:flex">
        {/* Panneau gauche */}
        <div className="relative w-1/2 overflow-hidden bg-navy">
          <div className="absolute inset-0" style={{ backgroundImage: "url('/login-bg.png')", backgroundSize: 'auto 155%', backgroundPosition: 'right bottom', backgroundRepeat: 'no-repeat' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-navy/95 via-navy/70 to-navy/10" />
          <div className="relative z-10 flex h-full flex-col items-center px-14 py-12 text-center text-white">
            <LogoBlock />
            <div className="mt-10 flex flex-col items-center">
              <h1 className="text-3xl font-extrabold leading-tight">La plateforme tout-en-un<br />pour vos tournois sportifs</h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
                Gérez vos tournois, équipes, matchs, joueurs, paiements et bien plus encore depuis une seule et même plateforme.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {[
                  { d: 'trophy' as const, t: 'Organisation', b: 'simplifiée' },
                  { d: 'team' as const, t: "Gestion d'équipes", b: 'et joueurs' },
                  { d: 'chart' as const, t: 'Suivi en direct', b: 'des matchs' },
                ].map((f) => (
                  <div key={f.t} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 backdrop-blur-sm">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/30 text-white"><Ic d={f.d} className="h-4 w-4" /></span>
                    <span className="text-left text-xs font-semibold leading-tight">{f.t}<br />{f.b}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-auto text-xs text-white/50">© {new Date().getFullYear()} Gboroly. Tous droits réservés.</p>
          </div>
        </div>
        {/* Panneau droit */}
        <div className="relative flex w-1/2 flex-col items-center justify-center px-4 py-10">
          <div className="absolute right-6 top-6 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-ink shadow-sm">
            <Ic d="globe" className="h-4 w-4 text-muted" /> Français <Ic d="chevron" className="h-3.5 w-3.5 text-muted" />
          </div>
          <div className="w-full max-w-md">
            <AuthCard />
            <Badges />
          </div>
        </div>
      </div>
    </>
  );
}
