import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TournamentStatus } from '@gboroly/database';
import { slugWithSuffix } from '@gboroly/utils';
import type { DiscoverQueryInput, PublicRegisterInput } from '@gboroly/validation';
import { PrismaService } from '../prisma/prisma.service';
import { isRegistrationOpen } from './marketplace-rules';

const BROWSABLE: TournamentStatus[] = [
  TournamentStatus.PUBLISHED,
  TournamentStatus.ONGOING,
  TournamentStatus.COMPLETED,
];

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Découverte publique de tournois, avec filtres et pagination. */
  async discover(query: DiscoverQueryInput) {
    const now = new Date();
    const where: Prisma.TournamentWhereInput = {
      visibility: 'PUBLIC',
      deletedAt: null,
      status: { in: BROWSABLE },
      ...(query.country ? { country: { equals: query.country, mode: 'insensitive' } } : {}),
      ...(query.city ? { city: { contains: query.city, mode: 'insensitive' } } : {}),
      ...(query.sportKey ? { sport: { key: query.sportKey } } : {}),
      ...(query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}),
      ...(query.openOnly
        ? { status: 'PUBLISHED', OR: [{ registrationEnd: null }, { registrationEnd: { gte: now } }] }
        : {}),
    };

    const [total, tournaments] = await Promise.all([
      this.prisma.tournament.count({ where }),
      this.prisma.tournament.findMany({
        where,
        orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { sport: { select: { key: true, name: true } } },
      }),
    ]);

    const counts = await this.approvedCounts(tournaments.map((t) => t.id));

    const items = tournaments.map((t) => {
      const approved = counts.get(t.id) ?? 0;
      const window = isRegistrationOpen(
        { status: t.status, visibility: t.visibility, registrationStart: t.registrationStart, registrationEnd: t.registrationEnd, maxTeams: t.maxTeams },
        approved,
        now,
      );
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        sport: t.sport,
        country: t.country,
        city: t.city,
        startDate: t.startDate,
        endDate: t.endDate,
        registrationEnd: t.registrationEnd,
        registrationFee: t.registrationFee != null ? Number(t.registrationFee) : null,
        currency: t.currency,
        status: t.status,
        teams: { approved, max: t.maxTeams },
        registrationOpen: window.open,
      };
    });

    return { total, page: query.page, pageSize: query.pageSize, items };
  }

  /** Inscription publique d'une équipe externe (crée une inscription EN ATTENTE de validation). */
  async register(slug: string, input: PublicRegisterInput) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { slug, visibility: 'PUBLIC', deletedAt: null },
      include: { categories: { orderBy: { order: 'asc' } } },
    });
    if (!tournament) throw new NotFoundException(err('TOURNAMENT_NOT_FOUND', 'Tournoi introuvable'));

    const category =
      (input.categoryId && tournament.categories.find((c) => c.id === input.categoryId)) ||
      tournament.categories[0];
    if (!category) throw new BadRequestException(err('NO_CATEGORY', 'Aucune catégorie ouverte'));

    const approved = await this.prisma.registration.count({
      where: { categoryId: category.id, status: 'APPROVED' },
    });
    const window = isRegistrationOpen(
      {
        status: tournament.status,
        visibility: tournament.visibility,
        registrationStart: tournament.registrationStart,
        registrationEnd: tournament.registrationEnd,
        maxTeams: category.maxTeams ?? tournament.maxTeams,
      },
      approved,
    );
    if (!window.open) throw new ConflictException(err('REGISTRATION_CLOSED', `Inscriptions fermées (${window.reason})`));

    // Anti-doublon : même nom d'équipe déjà en attente/validé dans la catégorie.
    const dup = await this.prisma.registration.findFirst({
      where: {
        categoryId: category.id,
        status: { in: ['PENDING', 'APPROVED'] },
        team: { name: { equals: input.teamName, mode: 'insensitive' } },
      },
    });
    if (dup) throw new ConflictException(err('TEAM_ALREADY_REGISTERED', 'Cette équipe est déjà inscrite'));

    const registration = await this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          organizationId: tournament.organizationId,
          name: input.teamName,
          shortName: input.shortName,
          phone: input.phone,
          slug: slugWithSuffix(input.teamName),
        },
      });
      return tx.registration.create({
        data: {
          tournamentId: tournament.id,
          categoryId: category.id,
          teamId: team.id,
          status: 'PENDING',
          submittedAt: new Date(),
        },
      });
    });

    return {
      registrationId: registration.id,
      status: registration.status,
      category: category.name,
      message: 'Inscription reçue. En attente de validation par l’organisateur.',
    };
  }

  private async approvedCounts(tournamentIds: string[]): Promise<Map<string, number>> {
    if (tournamentIds.length === 0) return new Map();
    const grouped = await this.prisma.registration.groupBy({
      by: ['tournamentId'],
      where: { tournamentId: { in: tournamentIds }, status: 'APPROVED' },
      _count: { _all: true },
    });
    return new Map(grouped.map((g) => [g.tournamentId, g._count._all]));
  }
}

function err(code: string, message: string) {
  return { error: { code, message } };
}
