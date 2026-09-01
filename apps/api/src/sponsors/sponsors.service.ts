import { Injectable, NotFoundException } from '@nestjs/common';
import { SponsorLevel } from '@gboroly/database';
import type { CreateSponsorInput, UpdateSponsorInput } from '@gboroly/validation';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SponsorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, tournamentId: string, input: CreateSponsorInput) {
    await this.assertTournament(orgId, tournamentId);
    return this.prisma.sponsor.create({
      data: {
        tournamentId,
        name: input.name,
        logoUrl: input.logoUrl,
        websiteUrl: input.websiteUrl,
        level: input.level as SponsorLevel,
        order: input.order ?? 0,
      },
    });
  }

  async list(orgId: string, tournamentId: string) {
    await this.assertTournament(orgId, tournamentId);
    return this.prisma.sponsor.findMany({
      where: { tournamentId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async update(orgId: string, sponsorId: string, input: UpdateSponsorInput) {
    await this.scoped(orgId, sponsorId);
    return this.prisma.sponsor.update({
      where: { id: sponsorId },
      data: { ...input, level: input.level as SponsorLevel | undefined },
    });
  }

  async remove(orgId: string, sponsorId: string) {
    await this.scoped(orgId, sponsorId);
    await this.prisma.sponsor.delete({ where: { id: sponsorId } });
    return { success: true };
  }

  private async assertTournament(orgId: string, tournamentId: string) {
    const t = await this.prisma.tournament.findFirst({
      where: { id: tournamentId, organizationId: orgId, deletedAt: null },
    });
    if (!t) throw new NotFoundException(err('TOURNAMENT_NOT_FOUND', 'Tournoi introuvable'));
    return t;
  }

  private async scoped(orgId: string, sponsorId: string) {
    const s = await this.prisma.sponsor.findFirst({
      where: { id: sponsorId, tournament: { organizationId: orgId, deletedAt: null } },
    });
    if (!s) throw new NotFoundException(err('SPONSOR_NOT_FOUND', 'Sponsor introuvable'));
    return s;
  }
}

function err(code: string, message: string) {
  return { error: { code, message } };
}
