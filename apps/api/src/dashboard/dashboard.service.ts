import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Agrégats de la page d'accueil du tableau de bord organisateur (org active).
 * Un seul endpoint pour éviter les allers-retours : cartes stats, tournoi phare,
 * prochains matchs, répartition des matchs, revenus.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(organizationId: string) {
    const now = new Date();
    const orgTournaments = { tournament: { organizationId, deletedAt: null } };

    const [
      activeTournaments,
      registeredTeams,
      upcomingMatchesCount,
      paid,
      matchesPlayed,
      matchesTotal,
      featured,
      upcoming,
    ] = await Promise.all([
      this.prisma.tournament.count({
        where: { organizationId, deletedAt: null, status: { in: ['PUBLISHED', 'ONGOING'] } },
      }),
      this.prisma.registration.count({ where: { ...orgTournaments, status: 'APPROVED' } }),
      this.prisma.match.count({
        where: { ...orgTournaments, deletedAt: null, status: 'SCHEDULED' },
      }),
      this.prisma.payment.aggregate({
        where: { organizationId, status: 'PAID' },
        _sum: { grossAmount: true },
      }),
      this.prisma.match.count({ where: { ...orgTournaments, status: 'FINISHED' } }),
      this.prisma.match.count({ where: { ...orgTournaments, deletedAt: null } }),
      this.pickFeatured(organizationId),
      this.prisma.match.findMany({
        where: { ...orgTournaments, deletedAt: null, status: 'SCHEDULED' },
        orderBy: [{ scheduledAt: 'asc' }, { order: 'asc' }],
        take: 4,
        include: {
          tournament: { select: { name: true, slug: true } },
          field: { select: { name: true } },
          homeTeam: { include: { team: { select: { name: true, logoUrl: true } } } },
          awayTeam: { include: { team: { select: { name: true, logoUrl: true } } } },
        },
      }),
    ]);

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, currency: true, city: true, country: true },
    });

    return {
      organization: org,
      stats: {
        activeTournaments,
        registeredTeams,
        upcomingMatches: upcomingMatchesCount,
        paymentsReceived: paid._sum.grossAmount ? Number(paid._sum.grossAmount) : 0,
        currency: org?.currency ?? 'XOF',
      },
      matches: {
        played: matchesPlayed,
        upcoming: upcomingMatchesCount,
        total: matchesTotal,
      },
      revenue: paid._sum.grossAmount ? Number(paid._sum.grossAmount) : 0,
      featuredTournament: featured,
      upcomingMatches: upcoming.map((m) => ({
        id: m.id,
        tournament: m.tournament.name,
        slug: m.tournament.slug,
        scheduledAt: m.scheduledAt,
        field: m.field?.name ?? null,
        home: m.homeTeam?.team?.name ?? 'À définir',
        homeLogo: m.homeTeam?.team?.logoUrl ?? null,
        away: m.awayTeam?.team?.name ?? 'À définir',
        awayLogo: m.awayTeam?.team?.logoUrl ?? null,
      })),
    };
  }

  /** Tournoi mis en avant : le 1er ONGOING, sinon le plus récent publié/brouillon. */
  private async pickFeatured(organizationId: string) {
    const t =
      (await this.prisma.tournament.findFirst({
        where: { organizationId, deletedAt: null, status: 'ONGOING' },
        orderBy: { updatedAt: 'desc' },
        include: { sport: { select: { name: true } }, _count: { select: { categories: true } } },
      })) ??
      (await this.prisma.tournament.findFirst({
        where: { organizationId, deletedAt: null, status: { notIn: ['CANCELLED', 'ARCHIVED'] } },
        orderBy: { createdAt: 'desc' },
        include: { sport: { select: { name: true } }, _count: { select: { categories: true } } },
      }));
    if (!t) return null;

    const [teams, competitions, knockoutMatches, finishedGroupMatches] = await Promise.all([
      this.prisma.registration.count({ where: { tournamentId: t.id, status: 'APPROVED' } }),
      this.prisma.competition.count({ where: { tournamentId: t.id } }),
      this.prisma.match.count({
        where: { tournamentId: t.id, deletedAt: null, round: { roundType: { in: ['KNOCKOUT', 'FINAL'] } } },
      }),
      this.prisma.match.count({
        where: { tournamentId: t.id, deletedAt: null, status: 'FINISHED' },
      }),
    ]);

    // Étapes : Inscriptions → Groupes → Phase de poules → Phases finales → Finale
    let progressIndex = 0;
    if (teams > 0) progressIndex = 1;
    if (competitions > 0) progressIndex = 2;
    if (finishedGroupMatches > 0) progressIndex = 3;
    if (knockoutMatches > 0) progressIndex = 3;
    if (t.status === 'COMPLETED') progressIndex = 4;

    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      city: t.city,
      status: t.status,
      sport: t.sport?.name ?? null,
      teams,
      categories: t._count.categories,
      progressIndex,
      steps: ['Inscriptions', 'Groupes', 'Phase de poules', 'Phases finales', 'Finale'],
    };
  }
}
