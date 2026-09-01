import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@gboroly/database';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { buildWhatsAppLink, matchReminderText } from './templates';

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async createAnnouncement(
    orgId: string,
    tournamentId: string,
    userId: string,
    input: { title: string; body: string },
  ) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { id: tournamentId, organizationId: orgId, deletedAt: null },
    });
    if (!tournament) throw new NotFoundException(err('TOURNAMENT_NOT_FOUND', 'Tournoi introuvable'));

    const announcement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.announcement.create({
        data: {
          tournamentId,
          title: input.title,
          body: input.body,
          publishedAt: new Date(),
          createdByUserId: userId,
        },
      });
      // Diffusion temps réel : relais outbox → announcement.created (pages publiques).
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'Announcement',
          aggregateId: created.id,
          eventType: 'AnnouncementCreated',
          payload: {
            tournamentId,
            announcementId: created.id,
            title: input.title,
          } as Prisma.InputJsonValue,
        },
      });
      return created;
    });
    // Notification interne des membres (hors transaction).
    await this.notifications.notifyOrgMembers(orgId, 'ANNOUNCEMENT', {
      title: input.title,
      body: input.body,
    });
    return announcement;
  }

  async listAnnouncements(orgId: string, tournamentId: string) {
    await this.assertTournament(orgId, tournamentId);
    return this.prisma.announcement.findMany({
      where: { tournamentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Lien wa.me prêt à partager pour rappeler un match (cahier §23). */
  async matchReminderLink(orgId: string, matchId: string) {
    const match = await this.prisma.match.findFirst({
      where: { id: matchId, tournament: { organizationId: orgId, deletedAt: null } },
      include: {
        tournament: { select: { slug: true } },
        field: { select: { name: true } },
        homeTeam: { include: { team: { select: { name: true, phone: true } } } },
        awayTeam: { include: { team: { select: { name: true } } } },
      },
    });
    if (!match) throw new NotFoundException(err('MATCH_NOT_FOUND', 'Match introuvable'));

    const webBase = process.env.PUBLIC_WEB_URL ?? 'https://gboroly.com';
    const text = matchReminderText({
      home: match.homeTeam?.team.name ?? '?',
      away: match.awayTeam?.team.name ?? '?',
      date: match.scheduledAt
        ? new Intl.DateTimeFormat('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Africa/Abidjan',
          }).format(match.scheduledAt)
        : 'à programmer',
      field: match.field?.name,
      url: `${webBase}/t/${match.tournament.slug}`,
    });
    return {
      text,
      link: buildWhatsAppLink(match.homeTeam?.team.phone ?? undefined, text),
    };
  }

  private async assertTournament(orgId: string, tournamentId: string) {
    const t = await this.prisma.tournament.findFirst({
      where: { id: tournamentId, organizationId: orgId, deletedAt: null },
    });
    if (!t) throw new NotFoundException(err('TOURNAMENT_NOT_FOUND', 'Tournoi introuvable'));
    return t;
  }
}

function err(code: string, message: string) {
  return { error: { code, message } };
}
