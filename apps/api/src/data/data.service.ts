import { Injectable, NotFoundException } from '@nestjs/common';
import { slugWithSuffix } from '@gboroly/utils';
import type { ImportConfirmInput } from '@gboroly/validation';
import { PrismaService } from '../prisma/prisma.service';
import { toCsv } from './csv';
import { validateTeamsCsv } from './import-teams';

@Injectable()
export class DataService {
  constructor(private readonly prisma: PrismaService) {}

  async importTeamsPreview(orgId: string, tournamentId: string, csv: string) {
    await this.assertTournament(orgId, tournamentId);
    return validateTeamsCsv(csv);
  }

  async importTeamsConfirm(orgId: string, tournamentId: string, input: ImportConfirmInput) {
    await this.assertTournament(orgId, tournamentId);
    let created = 0;
    for (const r of input.rows) {
      await this.prisma.team.create({
        data: {
          organizationId: orgId,
          name: r.name,
          shortName: r.shortName,
          phone: r.phone,
          slug: slugWithSuffix(r.name),
        },
      });
      created++;
    }
    return { created };
  }

  async exportTeams(orgId: string, tournamentId: string): Promise<string> {
    await this.assertTournament(orgId, tournamentId);
    const regs = await this.prisma.registration.findMany({
      where: { tournamentId },
      include: { team: { select: { name: true, shortName: true, phone: true } }, category: { select: { name: true } } },
      orderBy: { seed: 'asc' },
    });
    return toCsv(
      ['name', 'shortName', 'phone', 'category', 'status', 'paymentStatus'],
      regs.map((r) => ({
        name: r.team.name,
        shortName: r.team.shortName ?? '',
        phone: r.team.phone ?? '',
        category: r.category.name,
        status: r.status,
        paymentStatus: r.paymentStatus,
      })),
    );
  }

  async exportStandings(orgId: string, competitionId: string): Promise<string> {
    const comp = await this.prisma.competition.findFirst({
      where: { id: competitionId, tournament: { organizationId: orgId, deletedAt: null } },
    });
    if (!comp) throw new NotFoundException(err('COMPETITION_NOT_FOUND', 'Compétition introuvable'));
    const standings = await this.prisma.standing.findMany({
      where: { competitionId },
      include: { registration: { include: { team: { select: { name: true } } } }, group: { select: { name: true } } },
      orderBy: [{ groupId: 'asc' }, { position: 'asc' }],
    });
    return toCsv(
      ['group', 'position', 'team', 'played', 'wins', 'draws', 'losses', 'goalsFor', 'goalsAgainst', 'goalDifference', 'points'],
      standings.map((s) => ({
        group: s.group?.name ?? '',
        position: s.position,
        team: s.registration.team.name,
        played: s.played,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        goalsFor: s.goalsFor,
        goalsAgainst: s.goalsAgainst,
        goalDifference: s.goalDifference,
        points: s.points,
      })),
    );
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
