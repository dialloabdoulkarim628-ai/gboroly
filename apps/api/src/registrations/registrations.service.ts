import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { RegistrationStatus } from '@gboroly/database';
import type { CreateRegistrationInput, RejectRegistrationInput } from '@gboroly/validation';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RegistrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, tournamentId: string, input: CreateRegistrationInput) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { id: tournamentId, organizationId: orgId, deletedAt: null },
    });
    if (!tournament) throw new NotFoundException(err('TOURNAMENT_NOT_FOUND', 'Tournoi introuvable'));

    const category = await this.prisma.tournamentCategory.findFirst({
      where: { id: input.categoryId, tournamentId },
    });
    if (!category) throw new NotFoundException(err('CATEGORY_NOT_FOUND', 'Catégorie introuvable'));

    const team = await this.prisma.team.findFirst({
      where: { id: input.teamId, organizationId: orgId, deletedAt: null },
    });
    if (!team) throw new NotFoundException(err('TEAM_NOT_FOUND', 'Équipe introuvable'));

    const existing = await this.prisma.registration.findFirst({
      where: { categoryId: input.categoryId, teamId: input.teamId, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(
        err('TEAM_ALREADY_REGISTERED', 'Équipe déjà inscrite dans cette catégorie'),
      );
    }

    return this.prisma.registration.create({
      data: {
        tournamentId,
        categoryId: input.categoryId,
        teamId: input.teamId,
        seed: input.seed,
        status: RegistrationStatus.PENDING,
        submittedAt: new Date(),
      },
    });
  }

  async list(orgId: string, tournamentId: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { id: tournamentId, organizationId: orgId, deletedAt: null },
    });
    if (!tournament) throw new NotFoundException(err('TOURNAMENT_NOT_FOUND', 'Tournoi introuvable'));
    return this.prisma.registration.findMany({
      where: { tournamentId, deletedAt: null },
      include: { team: { select: { id: true, name: true, logoUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(orgId: string, id: string) {
    await this.getScoped(orgId, id);
    return this.prisma.registration.update({
      where: { id },
      data: { status: RegistrationStatus.APPROVED, approvedAt: new Date() },
    });
  }

  async reject(orgId: string, id: string, input: RejectRegistrationInput) {
    await this.getScoped(orgId, id);
    return this.prisma.registration.update({
      where: { id },
      data: {
        status: RegistrationStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: input.reason,
      },
    });
  }

  async withdraw(orgId: string, id: string) {
    await this.getScoped(orgId, id);
    return this.prisma.registration.update({
      where: { id },
      data: { status: RegistrationStatus.WITHDRAWN },
    });
  }

  private async getScoped(orgId: string, id: string) {
    const reg = await this.prisma.registration.findFirst({
      where: { id, tournament: { organizationId: orgId, deletedAt: null }, deletedAt: null },
    });
    if (!reg) throw new NotFoundException(err('REGISTRATION_NOT_FOUND', 'Inscription introuvable'));
    return reg;
  }
}

function err(code: string, message: string) {
  return { error: { code, message } };
}
