'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Abonnement SSE au flux public du tournoi : rafraîchit les Server Components
 * (score, classement, bracket) dès qu'un événement arrive — sans rechargement manuel.
 */
export function LiveUpdater({ slug }: { slug: string }) {
  const router = useRouter();

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
    let es: EventSource;
    try {
      es = new EventSource(`${base}/public/tournaments/${slug}/live`);
    } catch {
      return;
    }
    es.onmessage = (e: MessageEvent) => {
      try {
        const { event } = JSON.parse(e.data as string) as { event?: string };
        if (event && event !== 'ping') router.refresh();
      } catch {
        /* ignore messages non-JSON */
      }
    };
    // EventSource se reconnecte automatiquement en cas de coupure réseau.
    return () => es.close();
  }, [slug, router]);

  return null;
}
