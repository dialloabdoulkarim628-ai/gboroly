import { Injectable, NotFoundException } from '@nestjs/common';
import { buildBracketView } from '@gboroly/competition-engine';
import { toEngineMatch } from '../matches/engine-mapper';
import { PrismaService } from '../prisma/prisma.service';

/** Statuts d'un tournoi visibles publiquement. */
const PUBLIC_STATUSES = ['PUBLISHED', 'ONGOING', 'COMPLETED', 'ARCHIVED'] as const;

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getTournament(slug: string) {
    const t = await this.resolve(slug);
    const [teams, matchesTotal, matchesPlayed] = await Promise.all([
      this.prisma.registration.count({ where: { tournamentId: t.id, status: 'APPROVED' } }),
      this.prisma.match.count({ where: { tournamentId: t.id, deletedAt: null } }),
      this.prisma.match.count({ where: { tournamentId: t.id, status: 'FINISHED' } }),
    ]);
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      logoUrl: t.logoUrl,
      bannerUrl: t.bannerUrl,
      country: t.country,
      city: t.city,
      startDate: t.startDate,
      endDate: t.endDate,
      status: t.status,
      sport: t.sport,
      organization: t.organization,
      categories: t.categories,
      stats: { teams, matchesPlayed, matchesTotal },
    };
  }

  async getStandings(slug: string) {
    const t = await this.resolve(slug);
    const standings = await this.prisma.standing.findMany({
      where: { competition: { tournamentId: t.id } },
      orderBy: [{ groupId: 'asc' }, { position: 'asc' }],
      include: {
        registration: { include: { team: { select: { name: true, logoUrl: true } } } },
        group: { select: { name: true } },
        competition: { select: { id: true, categoryId: true } },
      },
    });
    return standings.map((s) => ({
      position: s.position,
      played: s.played,
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalDifference: s.goalDifference,
      points: s.points,
      group: s.group?.name ?? null,
      categoryId: s.competition.categoryId,
      team: s.registration.team,
    }));
  }

  async getMatches(slug: string, filters: { status?: string; categoryId?: string }) {
    const t = await this.resolve(slug);
    const matches = await this.prisma.match.findMany({
      where: {
        tournamentId: t.id,
        deletedAt: null,
        status: filters.status as never,
        categoryId: filters.categoryId,
      },
      orderBy: [{ scheduledAt: 'asc' }, { order: 'asc' }],
      include: {
        round: { select: { name: true } },
        field: { select: { name: true } },
        homeTeam: { include: { team: { select: { name: true, logoUrl: true } } } },
        awayTeam: { include: { team: { select: { name: true, logoUrl: true } } } },
      },
    });
    return matches.map((m) => ({
      id: m.id,
      status: m.status,
      scheduledAt: m.scheduledAt,
      round: m.round.name,
      field: m.field?.name ?? null,
      home: m.homeTeam?.team ?? null,
      away: m.awayTeam?.team ?? null,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      homePenalties: m.homePenalties,
      awayPenalties: m.awayPenalties,
    }));
  }

  async getTeams(slug: string) {
    const t = await this.resolve(slug);
    const regs = await this.prisma.registration.findMany({
      where: { tournamentId: t.id, status: 'APPROVED' },
      include: {
        team: { select: { name: true, logoUrl: true, shortName: true } },
        category: { select: { name: true } },
      },
      orderBy: { seed: 'asc' },
    });
    return regs.map((r) => ({
      registrationId: r.id,
      team: r.team,
      category: r.category.name,
      seed: r.seed,
    }));
  }

  async getBracket(slug: string) {
    const t = await this.resolve(slug);
    const rounds = await this.prisma.round.findMany({
      where: { competition: { tournamentId: t.id }, roundType: { in: ['KNOCKOUT', 'FINAL'] } },
      orderBy: { order: 'asc' },
    });
    if (rounds.length === 0) return [];
    const matches = await this.prisma.match.findMany({
      where: { roundId: { in: rounds.map((r) => r.id) }, deletedAt: null },
      include: {
        homeTeam: { include: { team: { select: { name: true } } } },
        awayTeam: { include: { team: { select: { name: true } } } },
      },
    });
    const names = new Map<string, string>();
    for (const m of matches) {
      if (m.homeTeamId && m.homeTeam) names.set(m.homeTeamId, m.homeTeam.team.name);
      if (m.awayTeamId && m.awayTeam) names.set(m.awayTeamId, m.awayTeam.team.name);
    }
    return buildBracketView(
      rounds.map((r) => ({ id: r.id, type: r.roundType as never, name: r.name, order: r.order })),
      matches.map(toEngineMatch),
      (id) => names.get(id) ?? id,
    );
  }

  private async resolve(slug: string) {
    const t = await this.prisma.tournament.findFirst({
      where: { slug, visibility: 'PUBLIC', status: { in: [...PUBLIC_STATUSES] }, deletedAt: null },
      include: {
        sport: { select: { key: true, name: true } },
        organization: { select: { name: true, logoUrl: true, slug: true } },
        categories: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!t) throw new NotFoundException({ error: { code: 'TOURNAMENT_NOT_FOUND', message: 'Tournoi introuvable' } });
    return t;
  }
}
