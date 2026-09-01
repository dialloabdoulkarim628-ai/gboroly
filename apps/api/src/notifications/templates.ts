/**
 * Templates de notification — module PUR (testable). Découplé de tout fournisseur.
 * WhatsApp = liens `wa.me` (décision D5 : pas d'API payante au MVP).
 */
export type NotificationType =
  | 'REGISTRATION_APPROVED'
  | 'REGISTRATION_REJECTED'
  | 'PAYMENT_CONFIRMED'
  | 'MATCH_SCHEDULED'
  | 'MATCH_CHANGED'
  | 'RESULT_PUBLISHED'
  | 'ANNOUNCEMENT'
  | 'REMINDER';

export interface RenderedMessage {
  subject: string;
  body: string;
}

type Data = Record<string, string | number | undefined>;

const TEMPLATES: Record<NotificationType, (d: Data) => RenderedMessage> = {
  REGISTRATION_APPROVED: (d) => ({
    subject: 'Inscription validée ✅',
    body: `L'équipe ${d.team} est validée pour ${d.tournament}.`,
  }),
  REGISTRATION_REJECTED: (d) => ({
    subject: 'Inscription refusée',
    body: `L'inscription de ${d.team} à ${d.tournament} a été refusée.${d.reason ? ` Motif : ${d.reason}.` : ''}`,
  }),
  PAYMENT_CONFIRMED: (d) => ({
    subject: 'Paiement confirmé 💳',
    body: `Paiement de ${d.amount} ${d.currency ?? 'FCFA'} reçu pour ${d.team}.`,
  }),
  MATCH_SCHEDULED: (d) => ({
    subject: 'Match programmé 📅',
    body: `${d.home} vs ${d.away} — ${d.date}${d.field ? ` · ${d.field}` : ''}.`,
  }),
  MATCH_CHANGED: (d) => ({
    subject: 'Changement de match ⚠️',
    body: `${d.home} vs ${d.away} est modifié : ${d.date}${d.field ? ` · ${d.field}` : ''}.`,
  }),
  RESULT_PUBLISHED: (d) => ({
    subject: 'Résultat publié',
    body: `${d.home} ${d.homeScore} - ${d.awayScore} ${d.away}.`,
  }),
  ANNOUNCEMENT: (d) => ({
    subject: String(d.title ?? 'Annonce'),
    body: String(d.body ?? ''),
  }),
  REMINDER: (d) => ({
    subject: 'Rappel de match ⏰',
    body: matchReminderText(d),
  }),
};

export function renderNotification(type: NotificationType, data: Data): RenderedMessage {
  return (TEMPLATES[type] ?? TEMPLATES.ANNOUNCEMENT)(data);
}

/** Texte de rappel « prochain match » (cahier §23). */
export function matchReminderText(d: Data): string {
  const lines = [
    `⚽ Votre prochain match`,
    `${d.home} vs ${d.away}`,
    d.date ? String(d.date) : undefined,
    d.field ? `Terrain : ${d.field}` : undefined,
    d.url ? `Voir le match : ${d.url}` : undefined,
    `— Gboroly`,
  ];
  return lines.filter(Boolean).join('\n');
}

/**
 * Construit un lien wa.me. Numéro optionnel (sinon le partage ouvre le sélecteur de contact).
 * Le numéro est normalisé (chiffres uniquement, format international sans +).
 */
export function buildWhatsAppLink(phone: string | undefined, text: string): string {
  const digits = (phone ?? '').replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(text);
  return digits ? `https://wa.me/${digits}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}
