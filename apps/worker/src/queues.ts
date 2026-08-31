// Déclaration des queues BullMQ. Voir docs/DEPLOYMENT.md §Jobs.
export const QUEUES = [
  'email',
  'sms',
  'whatsapp',
  'notifications',
  'exports',
  'imports',
  'pdf',
  'analytics',
  'media',
  'payments',
  'schedule',
  'outbox',
] as const;

export type QueueName = (typeof QUEUES)[number];
