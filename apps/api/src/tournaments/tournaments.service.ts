import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TournamentStatus, Visibility } from '@gboroly/database';
import type {
  CreateCategoryInput,
  CreateTournamentInput,
  UpdateCategoryInput,
  UpdateTournamentInput,
} from '@gboroly/validation';
import { slugify, slugWithSuffix } from '@gboroly/utils';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildPublicationChecklist,
  unmetRequired,
  type ChecklistInput,
} from './checklist';

/** Statuts où les modifications structurelles sont bloquées. */
const LOCKED_STATUSES: TournamentStatus[] = [
  TournamentStatus.ONGOING,
  TournamentStatus.COMPLETED,
  TournamentStatus.ARCHIVED,
  TournamentStatus.CANCELLED,
];

@Injectable()
export class TournamentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────── Tournois ───────────────────────────

  async create(orgId: string, userId: string, input: CreateTournamentInput) {
    const sport = await this.prisma.sport.findUnique({ where: { key: input.sportKey } });
    if (!sport) throw new BadRequestException(err('SPORT_NOT_FOUND', `Sport ${input.sportKey} inconnu`));

    return this.prisma.tournament.create({
      data: {
        organizationId: orgId,
        sportId: sport.id,
        createdByUserId: userId,
        name: input.name,
        slug: slugWithSuffix(input.name),
        description: input.description,
        country: input.country,
        city: input.city,
        venueDescription: input.venueDescription,
        startDate: input.startDate,
        endDate: input.endDate,
        startTime: input.startTime,
        registrationStart: input.registrationStart,
        registrationEnd: input.registrationEnd,
        visibility: input.visibility,
        currency: input.currency,
        timezone: input.timezone,
        maxTeams: input.maxTeams,
        registrationFee: input.registrationFee !== undefined ? BigInt(input.registrationFee) : null,
      },
    });
  }

  list(orgId: string) {
    return this.prisma.tournament.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  getById(orgId: string, id: string) {
    return this.getScoped(orgId, id);
  }

  async update(orgId: string, id: string, input: UpdateTournamentInput) {
    const tournament = await this.getScoped(orgId, id);
    this.assertEditable(tournament);
    const data: Prisma.TournamentUpdateInput = { ...input };
    if (input.registrationFee !== undefined) {
      data.registrationFee = BigInt(input.registrationFee);
    }
    return this.prisma.tournament.update({ where: { id }, data });
  }

  async setVisibility(orgId: string, id: string, visibility: Visibility) {
    await this.getScoped(orgId, id);
    return this.prisma.tournament.update({ where: { id }, data: { visibility } });
  }

  async remove(orgId: string, id: string) {
    await this.getScoped(orgId, id);
    await this.prisma.tournament.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  // ─────────────────────────── Publication ───────────────────────────

  async getChecklist(orgId: string, id: string) {
    const tournament = await this.getScoped(orgId, id);
    const items = buildPublicationChecklist(await this.checklistInput(tournament));
    return { status: tournament.status, items };
  }

  async publish(orgId: string, id: string) {
    const tournament = await this.getScoped(orgId, id);
    if (
      tournament.status !== TournamentStatus.DRAFT &&
      tournament.status !== TournamentStatus.READY
    ) {
      throw new ConflictException(
        err('INVALID_STATUS', `Publication impossible depuis le statut ${tournament.status}`),
      );
    }
    const items = buildPublicationChecklist(await this.checklistInput(tournament));
    const missing = unmetRequired(items);
    if (missing.length > 0) {
      throw new BadRequestException({
        error: {
          code: 'CHECKLIST_INCOMPLETE',
          message: 'Critères de publication non remplis',
          details: { missing: missing.map((i) => i.key), items },
        },
      });
    }
    return this.prisma.tournament.update({
      where: { id },
      data: { status: TournamentStatus.PUBLISHED },
    });
  }

  async cancel(orgId: string, id: string) {
    const tournament = await this.getScoped(orgId, id);
    if (
      tournament.status === TournamentStatus.COMPLETED ||
      tournament.status === TournamentStatus.ARCHIVED
    ) {
      throw new ConflictException(err('INVALID_STATUS', 'Tournoi déjà terminé/archivé'));
    }
    return this.prisma.tournament.update({
      where: { id },
      data: { status: TournamentStatus.CANCELLED },
    });
  }

  // ─────────────────────────── Duplication ───────────────────────────

  async duplicate(orgId: string, userId: string, id: string) {
    const source = await this.prisma.tournament.findFirst({
      where: { id, organizationId: orgId },
      include: { categories: true },
    });
    if (!source) throw new NotFoundException(err('TOURNAMENT_NOT_FOUND', 'Tournoi introuvable'));

    // Réutilise config/catégories/branding ; ne copie JAMAIS résultats/matchs/paiements.
    return this.prisma.$transaction(async (tx) => {
      const clone = await tx.tournament.create({
        data: {
          organizationId: source.organizationId,
          sportId: source.sportId,
          createdByUserId: userId,
          name: `${source.name} (copie)`,
          slug: slugWithSuffix(source.name),
          description: source.description,
          logoUrl: source.logoUrl,
          bannerUrl: source.bannerUrl,
          country: source.country,
          city: source.city,
          venueDescription: source.venueDescription,
          visibility: Visibility.PRIVATE,
          currency: source.currency,
          timezone: source.timezone,
          maxTeams: source.maxTeams,
          registrationFee: source.registrationFee,
          status: TournamentStatus.DRAFT,
        },
      });
      for (const c of source.categories) {
        await tx.tournamentCategory.create({
          data: {
            tournamentId: clone.id,
            name: c.name,
            slug: c.slug,
            registrationFee: c.registrationFee,
            rulesConfig: c.rulesConfig ?? Prisma.JsonNull,
            maxTeams: c.maxTeams,
            minSquad: c.minSquad,
            maxSquad: c.maxSquad,
            order: c.order,
          },
        });
      }
      return clone;
    });
  }

  // ─────────────────────────── Catégories ───────────────────────────

  async createCategory(orgId: string, tournamentId: string, input: CreateCategoryInput) {
    const tournament = await this.getScoped(orgId, tournamentId);
    this.assertEditable(tournament);
    return this.prisma.tournamentCategory.create({
      data: {
        tournamentId,
        name: input.name,
        slug: slugify(input.name),
        minSquad: input.minSquad,
        maxSquad: input.maxSquad,
        maxTeams: input.maxTeams,
        registrationFee:
          input.registrationFee !== undefined ? BigInt(input.registrationFee) : null,
      },
    });
  }

  async listCategories(orgId: string, tournamentId: string) {
    await this.getScoped(orgId, tournamentId);
    return this.prisma.tournamentCategory.findMany({
      where: { tournamentId },
      orderBy: { order: 'asc' },
    });
  }

  async updateCategory(orgId: string, categoryId: string, input: UpdateCategoryInput) {
    await this.getScopedCategory(orgId, categoryId);
    const data: Prisma.TournamentCategoryUpdateInput = { ...input };
    if (input.registrationFee !== undefined) data.registrationFee = BigInt(input.registrationFee);
    return this.prisma.tournamentCategory.update({ where: { id: categoryId }, data });
  }

  async removeCategory(orgId: string, categoryId: string) {
    await this.getScopedCategory(orgId, categoryId);
    await this.prisma.tournamentCategory.delete({ where: { id: categoryId } });
    return { success: true };
  }

  // ─────────────────────────── Helpers ───────────────────────────

  private async getScoped(orgId: string, id: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!tournament) throw new NotFoundException(err('TOURNAMENT_NOT_FOUND', 'Tournoi introuvable'));
    return tournament;
  }

  private async getScopedCategory(orgId: string, categoryId: string) {
    const category = await this.prisma.tournamentCategory.findFirst({
      where: { id: categoryId, tournament: { organizationId: orgId, deletedAt: null } },
    });
    if (!category) throw new NotFoundException(err('CATEGORY_NOT_FOUND', 'Catégorie introuvable'));
    return category;
  }

  private assertEditable(tournament: { status: TournamentStatus }) {
    if (LOCKED_STATUSES.includes(tournament.status)) {
      throw new ConflictException(
        err('MODIFICATION_LOCKED', `Modifications bloquées (statut ${tournament.status})`),
      );
    }
  }

  private async checklistInput(tournament: {
    id: string;
    name: string;
    sportId: string;
    country: string;
  }): Promise<ChecklistInput> {
    const [categoriesCount, approvedTeamsCount, competitionsConfigured, fieldsCount, scheduledMatchesCount] =
      await Promise.all([
        this.prisma.tournamentCategory.count({ where: { tournamentId: tournament.id } }),
        this.prisma.registration.count({
          where: { tournamentId: tournament.id, status: 'APPROVED' },
        }),
        this.prisma.competition.count({ where: { tournamentId: tournament.id } }),
        this.prisma.field.count({ where: { tournamentId: tournament.id } }),
        this.prisma.match.count({ where: { tournamentId: tournament.id } }),
      ]);
    return {
      hasName: Boolean(tournament.name),
      hasSport: Boolean(tournament.sportId),
      hasCountry: Boolean(tournament.country),
      categoriesCount,
      approvedTeamsCount,
      competitionsConfigured,
      fieldsCount,
      scheduledMatchesCount,
    };
  }
}

function err(code: string, message: string) {
  return { error: { code, message } };
}
