'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Icon } from './_icons';
import { MOBILE_NAV, NAV_ITEMS, type NavItem } from './_nav-items';

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? 'bg-brand text-white shadow-card' : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon name={item.icon} />
            <span className="flex-1">{item.label}</span>
            {item.soon && (
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                bientôt
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarInner({ orgName, onNavigate }: { orgName: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <img src="/logo-gboroly-blanc.png" alt="Gboroly" className="h-9 w-auto" />
      </div>
      <div className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Menu principal
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <NavList pathname={pathname} onNavigate={onNavigate} />
      </div>
      <div className="space-y-3 p-4">
        <div className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-4 text-white">
          <div className="flex items-center gap-2">
            <Icon name="crown" className="h-4 w-4 text-victory" />
            <span className="text-sm font-bold">Passer à Premium</span>
          </div>
          <p className="mt-1 text-xs text-white/80">Débloquez plus de fonctionnalités pour vos tournois.</p>
          <button className="mt-3 w-full rounded-lg bg-energy px-3 py-2 text-xs font-semibold text-white hover:bg-energy/90">
            Découvrir les offres
          </button>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
            {orgName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{orgName}</div>
            <div className="text-[11px] text-slate-400">Abidjan, Côte d’Ivoire</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { ready, session, user, activeOrg, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (ready && !session) router.replace('/login');
  }, [ready, session, router]);

  if (!ready || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-muted">
        <div className="animate-pulse text-sm">Chargement du tableau de bord…</div>
      </div>
    );
  }

  const orgName = activeOrg?.name ?? 'Mon organisation';

  return (
    <div className="min-h-screen bg-canvas">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-navy lg:block">
        <SidebarInner orgName={orgName} />
      </aside>

      {/* Drawer mobile */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-navy">
            <button
              onClick={() => setDrawer(false)}
              className="absolute right-3 top-4 text-slate-300 hover:text-white"
              aria-label="Fermer"
            >
              <Icon name="close" />
            </button>
            <SidebarInner orgName={orgName} onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-canvas/80 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              onClick={() => setDrawer(true)}
              className="rounded-lg p-2 text-ink hover:bg-slate-100 lg:hidden"
              aria-label="Menu"
            >
              <Icon name="menu" />
            </button>
            <div className="relative hidden max-w-md flex-1 sm:block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <Icon name="search" className="h-4 w-4" />
              </span>
              <input
                placeholder="Rechercher un tournoi, une équipe, un joueur…"
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-brand"
              />
            </div>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <span className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-ink md:flex">
                🇨🇮 Côte d’Ivoire
              </span>
              <button className="relative rounded-lg p-2 text-ink hover:bg-slate-100">
                <Icon name="bell" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-energy" />
              </button>
              <button className="relative rounded-lg p-2 text-ink hover:bg-slate-100">
                <Icon name="chat" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setMenu((v) => !v)}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2.5"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                    {(user?.firstName?.[0] ?? 'U') + (user?.lastName?.[0] ?? '')}
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block text-xs font-semibold leading-tight text-ink">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="block text-[11px] leading-tight text-muted">Organisateur</span>
                  </span>
                  <Icon name="chevron" className="h-4 w-4 text-muted" />
                </button>
                {menu && (
                  <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    <div className="px-4 py-2 text-xs text-muted">{user?.email}</div>
                    <button
                      onClick={() => {
                        logout();
                        router.replace('/login');
                      }}
                      className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm text-danger hover:bg-slate-50"
                    >
                      <Icon name="logout" className="h-4 w-4" /> Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 pb-24 pt-6 sm:px-6 lg:pb-10">{children}</main>
      </div>

      {/* Barre du bas (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white lg:hidden">
        {MOBILE_NAV.map((item: NavItem) => {
          const active = pathname === item.href;
          if (item.href === '#menu') {
            return (
              <button
                key="menu"
                onClick={() => setDrawer(true)}
                className="flex flex-1 flex-col items-center gap-0.5 py-2 text-muted"
              >
                <Icon name={item.icon} />
                <span className="text-[10px]">{item.label}</span>
              </button>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 ${active ? 'text-brand' : 'text-muted'}`}
            >
              <Icon name={item.icon} />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
