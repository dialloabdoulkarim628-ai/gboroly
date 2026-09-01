import { Logger } from '@nestjs/common';
import type { RenderedMessage } from './templates';

export type Channel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';

export interface OutboundMessage extends RenderedMessage {
  to?: string;
}

export interface SendResult {
  ok: boolean;
  meta?: Record<string, unknown>;
}

/**
 * Abstraction fournisseur — le domaine métier ne dépend JAMAIS d'un fournisseur concret.
 * Providers futurs : SMTP/Resend (email), Twilio (SMS), WhatsApp Cloud API, Web Push.
 */
export interface NotificationProvider {
  readonly channel: Channel;
  send(message: OutboundMessage): Promise<SendResult>;
}

/** Email de développement : journalise au lieu d'envoyer (aucune clé requise). */
export class ConsoleEmailProvider implements NotificationProvider {
  readonly channel: Channel = 'EMAIL';
  private readonly logger = new Logger('EmailProvider');

  send(message: OutboundMessage): Promise<SendResult> {
    this.logger.log(`[DEV] Email → ${message.to ?? '?'} : ${message.subject}`);
    return Promise.resolve({ ok: true, meta: { dev: true } });
  }
}
