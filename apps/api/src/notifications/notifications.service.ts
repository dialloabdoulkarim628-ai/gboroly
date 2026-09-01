import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel, NotificationStatus, Prisma } from '@gboroly/database';
import { PrismaService } from '../prisma/prisma.service';
import { ConsoleEmailProvider, type NotificationProvider } from './providers';
import { renderNotification, type NotificationType } from './templates';

type Data = Record<string, string | number | undefined>;

@Injectable()
export class NotificationsService {
  // MVP : email en console ; remplaçable par un vrai provider via env plus tard.
  private readonly email: NotificationProvider = new ConsoleEmailProvider();

  constructor(private readonly prisma: PrismaService) {}

  /** Notifie un utilisateur sur un ou plusieurs canaux (in-app par défaut). */
  async notifyUser(
    userId: string,
    type: NotificationType,
    data: Data,
    channels: NotificationChannel[] = [NotificationChannel.IN_APP],
  ) {
    const rendered = renderNotification(type, data);
    const payload = { ...rendered, data } as unknown as Prisma.InputJsonValue;

    for (const channel of channels) {
      let status: NotificationStatus = NotificationStatus.SENT;
      if (channel === NotificationChannel.EMAIL) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });
        const res = await this.email.send({ to: user?.email ?? undefined, ...rendered });
        status = res.ok ? NotificationStatus.SENT : NotificationStatus.FAILED;
      }
      await this.prisma.notification.create({
        data: { userId, channel, type, payload, status, sentAt: new Date() },
      });
    }
  }

  /** Notifie tous les membres actifs d'une organisation (in-app). */
  async notifyOrgMembers(organizationId: string, type: NotificationType, data: Data) {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId, status: 'ACTIVE' },
      select: { userId: true },
    });
    for (const m of members) await this.notifyUser(m.userId, type, data);
    return { notified: members.length };
  }

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null, channel: NotificationChannel.IN_APP },
    });
  }

  async markRead(userId: string, id: string) {
    const notif = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notif) throw new NotFoundException({ error: { code: 'NOTIFICATION_NOT_FOUND', message: 'Introuvable' } });
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    });
  }

  async markAllRead(userId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    });
    return { updated: res.count };
  }
}
