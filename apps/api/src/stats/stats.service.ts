import { Injectable, NotFoundException } from '@nestjs/common';
import { buildBracketView } from '@gboroly/competition-engine';
import { toEngineMatch } from '../matches/engine-mapper';
import { PrismaService } from '../prisma/prisma.service';

export interface ScorerRow {
  playerId: string;
  name: string;
  team: string | null;
  goals: number;
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Meilleurs buteurs d'un tournoi (agrégation des événements GOAL). Non scopé. */
  async computeTopScorers(tournamentId: string, limit = 20): Promise<ScorerRow[]> {
    const events = await this.prisma.matchEvent.findMany({
      where: { type: 'GOAL', voidedAt: null, playerId: { not: null }, match: { tournamentId } },
      select: { playerId: true, registrationId: true },
    });
    if (events.length === 0) return [];

    const goalsByPlayer = new Map<string, number>();
    const regByPlayer = new Map<string, string>();
    for (const e of events) {
      const pid = e.playerId!;
      goalsByPlayer.set(pid, (goalsByPlayer.get(pid) ?? 0) + 1);
      if (!regByPlayer.has(pid)) regByPlayer.set(pid, e.registrationId);
    }

    const [players, regs] = await Promise.all([
      this.prisma.player.findMany({
        where: { id: { in: [...goalsByPlayer.keys()] } },
        select: { id: true, firstName: true, lastName: true },
      }),
      this.prisma.registration.findMany({
        where: { id: { in: [...new Set(regByPlayer.values())] } },
        select: { id: true, team: { select: { name: true } } },
      }),
    ]);
    const nameById = new Map(players.map((p) => [p.id, `${p.firstName} ${p.lastName}`.trim()]));
    const teamByReg = new Map(regs.map((r) => [r.id, r.team.name]));

    return [...goalsByPlayer.entries()]
      .map(([playerId, goals]): ScorerRow => ({
        playerId,
        name: nameById.get(playerId) ?? 'Joueur',
        team: teamByReg.get(regByPlayer.get(playerId) ?? '') ?? null,
        goals,
      }))
      .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))
      .slice(0, limit);
  }

  async topScorers(orgId: string, tournamentId: string) {
    await this.assertTournament(orgId, tournamentId);
    return this.computeTopScorers(tournamentId);
  }

  async summary(orgId: string, tournamentId: string) {
    await this.assertTournament(orgId, tournamentId);
    const [teams, matchesPlayed, goals] = await Promise.all([
      this.prisma.registration.count({ where: { tournamentId, status: 'APPROVED' } }),
      this.prisma.match.count({ where: { tournamentId, status: 'FINISHED' } }),
      this.prisma.matchEvent.count({ where: { type: 'GOAL', voidedAt: null, match: { tournamentId } } }),
    ]);
    return { teams, matchesPlayed, goals };
  }

  /** Classements par poule/compétition (org-scoped). */
  async getStandings(orgId: string, tournamentId: string) {
    await this.assertTournament(orgId, tournamentId);
    const standings = await this.prisma.standing.findMany({
      where: { competition: { tournamentId } },
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
      team: s.registration.team,
    }));
  }

  /** Arbre des phases finales (org-scoped). */
  async getBracket(orgId: string, tournamentId: string) {
    await this.assertTournament(orgId, tournamentId);
    const rounds = await this.prisma.round.findMany({
      where: { competition: { tournamentId }, roundType: { in: ['KNOCKOUT', 'FINAL'] } },
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

  private async assertTournament(orgId: string, tournamentId: string) {
    const t = await this.prisma.tournament.findFirst({
      where: { id: tournamentId, organizationId: orgId, deletedAt: null },
    });
    if (!t) throw new NotFoundException({ error: { code: 'TOURNAMENT_NOT_FOUND', message: 'Tournoi introuvable' } });
    return t;
  }
}
