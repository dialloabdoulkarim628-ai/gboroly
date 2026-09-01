import { Injectable, NotFoundException } from '@nestjs/common';
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

  private async assertTournament(orgId: string, tournamentId: string) {
    const t = await this.prisma.tournament.findFirst({
      where: { id: tournamentId, organizationId: orgId, deletedAt: null },
    });
    if (!t) throw new NotFoundException({ error: { code: 'TOURNAMENT_NOT_FOUND', message: 'Tournoi introuvable' } });
    return t;
  }
}
