import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateFieldInput,
  CreateVenueInput,
  UpdateFieldInput,
} from '@gboroly/validation';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async createVenue(orgId: string, tournamentId: string, input: CreateVenueInput) {
    await this.assertTournament(orgId, tournamentId);
    return this.prisma.venue.create({ data: { tournamentId, ...input } });
  }

  async listVenues(orgId: string, tournamentId: string) {
    await this.assertTournament(orgId, tournamentId);
    return this.prisma.venue.findMany({ where: { tournamentId }, include: { fields: true } });
  }

  async createField(orgId: string, venueId: string, input: CreateFieldInput) {
    const venue = await this.prisma.venue.findFirst({
      where: { id: venueId, tournament: { organizationId: orgId, deletedAt: null } },
    });
    if (!venue) throw new NotFoundException(err('VENUE_NOT_FOUND', 'Terrain (site) introuvable'));
    return this.prisma.field.create({
      data: { venueId, tournamentId: venue.tournamentId, name: input.name, capacity: input.capacity },
    });
  }

  async listFields(orgId: string, tournamentId: string) {
    await this.assertTournament(orgId, tournamentId);
    return this.prisma.field.findMany({ where: { tournamentId }, orderBy: { name: 'asc' } });
  }

  async updateField(orgId: string, fieldId: string, input: UpdateFieldInput) {
    await this.scopedField(orgId, fieldId);
    return this.prisma.field.update({ where: { id: fieldId }, data: input });
  }

  async removeField(orgId: string, fieldId: string) {
    await this.scopedField(orgId, fieldId);
    const used = await this.prisma.match.count({ where: { fieldId } });
    if (used > 0) throw new ConflictException(err('FIELD_IN_USE', 'Terrain utilisé par des matchs'));
    await this.prisma.field.delete({ where: { id: fieldId } });
    return { success: true };
  }

  private async assertTournament(orgId: string, tournamentId: string) {
    const t = await this.prisma.tournament.findFirst({
      where: { id: tournamentId, organizationId: orgId, deletedAt: null },
    });
    if (!t) throw new NotFoundException(err('TOURNAMENT_NOT_FOUND', 'Tournoi introuvable'));
    return t;
  }

  private async scopedField(orgId: string, fieldId: string) {
    const f = await this.prisma.field.findFirst({
      where: { id: fieldId, venue: { tournament: { organizationId: orgId, deletedAt: null } } },
    });
    if (!f) throw new NotFoundException(err('FIELD_NOT_FOUND', 'Terrain introuvable'));
    return f;
  }
}

function err(code: string, message: string) {
  return { error: { code, message } };
}
