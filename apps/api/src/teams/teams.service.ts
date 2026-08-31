import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TeamPlayerStatus, TeamStatus } from '@gboroly/database';
import type {
  AddRosterPlayerInput,
  CreateTeamInput,
  SetTeamStatusInput,
  UpdateRosterPlayerInput,
  UpdateTeamInput,
} from '@gboroly/validation';
import { slugWithSuffix } from '@gboroly/utils';
import { PrismaService } from '../prisma/prisma.service';
import { canAddPlayer } from './roster';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────── Équipes ───────────────────────────

  create(orgId: string, input: CreateTeamInput) {
    return this.prisma.team.create({
      data: {
        organizationId: orgId,
        name: input.name,
        shortName: input.shortName,
        slug: slugWithSuffix(input.name),
        logoUrl: input.logoUrl,
        phone: input.phone,
      },
    });
  }

  list(orgId: string) {
    return this.prisma.team.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  getById(orgId: string, id: string) {
    return this.getScoped(orgId, id);
  }

  async update(orgId: string, id: string, input: UpdateTeamInput) {
    await this.getScoped(orgId, id);
    return this.prisma.team.update({ where: { id }, data: input });
  }

  async setStatus(orgId: string, id: string, input: SetTeamStatusInput) {
    await this.getScoped(orgId, id);
    return this.prisma.team.update({
      where: { id },
      data: { status: input.status as TeamStatus },
    });
  }

  async remove(orgId: string, id: string) {
    await this.getScoped(orgId, id);
    await this.prisma.team.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  // ─────────────────────────── Roster (TeamPlayer) ───────────────────────────

  async addPlayer(orgId: string, teamId: string, input: AddRosterPlayerInput) {
    await this.getScoped(orgId, teamId);

    const player = await this.prisma.player.findFirst({
      where: { id: input.playerId, organizationId: orgId, deletedAt: null },
    });
    if (!player) throw new NotFoundException(err('PLAYER_NOT_FOUND', 'Joueur introuvable'));

    // Cohérence : un joueur ne peut être ACTIF que dans UNE équipe par tournoi.
    if (input.tournamentId) {
      const clash = await this.prisma.teamPlayer.findFirst({
        where: {
          playerId: input.playerId,
          tournamentId: input.tournamentId,
          status: TeamPlayerStatus.ACTIVE,
          teamId: { not: teamId },
        },
      });
      if (clash) {
        throw new ConflictException(
          err('PLAYER_ALREADY_REGISTERED', 'Joueur déjà inscrit dans une autre équipe de ce tournoi'),
        );
      }
    }

    // Borne d'effectif (max de la catégorie).
    if (input.categoryId) {
      const category = await this.prisma.tournamentCategory.findUnique({
        where: { id: input.categoryId },
      });
      const currentCount = await this.prisma.teamPlayer.count({
        where: {
          teamId,
          tournamentId: input.tournamentId ?? null,
          categoryId: input.categoryId,
          status: TeamPlayerStatus.ACTIVE,
        },
      });
      const check = canAddPlayer(currentCount, { max: category?.maxSquad ?? null });
      if (!check.ok) throw new BadRequestException(err(check.code!, check.message!));
    }

    return this.prisma.teamPlayer.create({
      data: {
        teamId,
        playerId: input.playerId,
        tournamentId: input.tournamentId,
        categoryId: input.categoryId,
        jerseyNumber: input.jerseyNumber,
        position: input.position,
      },
    });
  }

  async listRoster(orgId: string, teamId: string) {
    await this.getScoped(orgId, teamId);
    return this.prisma.teamPlayer.findMany({
      where: { teamId, status: { not: TeamPlayerStatus.REMOVED } },
      include: {
        player: {
          select: { id: true, firstName: true, lastName: true, position: true, photoUrl: true },
        },
      },
    });
  }

  async updateRosterPlayer(orgId: string, teamPlayerId: string, input: UpdateRosterPlayerInput) {
    await this.getScopedTeamPlayer(orgId, teamPlayerId);
    return this.prisma.teamPlayer.update({
      where: { id: teamPlayerId },
      data: {
        jerseyNumber: input.jerseyNumber,
        position: input.position,
        status: input.status as TeamPlayerStatus | undefined,
      },
    });
  }

  async removeRosterPlayer(orgId: string, teamPlayerId: string) {
    await this.getScopedTeamPlayer(orgId, teamPlayerId);
    await this.prisma.teamPlayer.update({
      where: { id: teamPlayerId },
      data: { status: TeamPlayerStatus.REMOVED, leftAt: new Date() },
    });
    return { success: true };
  }

  // ─────────────────────────── Helpers ───────────────────────────

  private async getScoped(orgId: string, id: string) {
    const team = await this.prisma.team.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!team) throw new NotFoundException(err('TEAM_NOT_FOUND', 'Équipe introuvable'));
    return team;
  }

  private async getScopedTeamPlayer(orgId: string, teamPlayerId: string) {
    const tp = await this.prisma.teamPlayer.findFirst({
      where: { id: teamPlayerId, team: { organizationId: orgId, deletedAt: null } },
    });
    if (!tp) throw new NotFoundException(err('ROSTER_ENTRY_NOT_FOUND', 'Entrée d’effectif introuvable'));
    return tp;
  }
}

function err(code: string, message: string) {
  return { error: { code, message } };
}
