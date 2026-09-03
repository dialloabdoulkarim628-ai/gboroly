import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Gboroly — Vos tournois, simplement',
  description:
    'Plateforme SaaS de digitalisation et d’automatisation des tournois sportifs. De l’inscription à la finale.',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'Gboroly — The African Sports Tournament OS',
    description: 'Organisez • Gérez • Faites vivre vos tournois.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#071B45',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
