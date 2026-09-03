import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@gboroly/database';
import type {
  CompetitionPlan,
  EngineMatch,
  PlannedGroup,
  PlannedRound,
  RankingRules,
  TeamRef,
} from '@gboroly/types';
import { RoundType } from '@gboroly/types';
import type { GenerateCompetitionInput } from '@gboroly/validation';
import {
  MARACANA_RULES,
  buildPlayoffsFromQualifiers,
  computeGroupResults,
  determineQualifiedTeams,
  generateDoubleElimination,
  generateRoundRobinFixtures,
  generateSingleElimination,
  planGroupStage,
} from '@gboroly/competition-engine';
import { PrismaService } from '../prisma/prisma.service';

interface EnginePlan {
  rounds: PlannedRound[];
  groups: PlannedGroup[];
  matches: EngineMatch[];
}

@Injectable()
export class CompetitionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Génère la structure d'une compétition (moteur → DB) depuis les inscriptions validées. */
  async generate(orgId: string, categoryId: string, input: GenerateCompetitionInput) {
    const category = await this.scopedCategory(orgId, categoryId);

    const registrations = await this.prisma.registration.findMany({
      where: { categoryId, status: 'APPROVED' },
      include: { team: { select: { name: true } } },
      orderBy: { seed: 'asc' },
    });
    if (registrations.length < 2) {
      throw new BadRequestException(err('NOT_ENOUGH_TEAMS', 'Au moins 2 équipes validées requises'));
    }
    const teams: TeamRef[] = registrations.map((r, i) => ({
      id: r.id,
      name: r.team.name,
      seed: r.seed ?? i + 1,
    }));

    // Ne régénère que si aucun match n'a démarré.
    const existing = await this.prisma.competition.findFirst({ where: { categoryId } });
    if (existing) {
      const progressed = await this.prisma.match.count({
        where: { competitionId: existing.id, status: { notIn: ['SCHEDULED'] } },
      });
      if (progressed > 0) {
        throw new ConflictException(err('COMPETITION_LOCKED', 'Des matchs ont déjà démarré'));
      }
    }

    const plan = this.buildPlan(input, teams);

    return this.prisma.$transaction(async (tx) => {
      if (existing) await this.deleteCascade(tx, existing.id);
      return this.persistPlan(tx, {
        tournamentId: category.tournamentId,
        categoryId,
        formatType: input.type,
        formatConfig: input as unknown as Prisma.InputJsonValue,
        plan,
      });
    });
  }

  /** Génère les phases finales d'une compétition GROUP_TO_PLAYOFFS après la phase de groupes. */
  async generatePlayoffs(orgId: string, competitionId: string) {
    const competition = await this.scopedCompetition(orgId, competitionId);
    if (competition.formatType !== 'GROUP_TO_PLAYOFFS') {
      throw new BadRequestException(err('WRONG_FORMAT', 'Format ≠ GROUP_TO_PLAYOFFS'));
    }
    const rounds = await this.prisma.round.findMany({ where: { competitionId } });
    if (rounds.some((r) => r.roundType !== RoundType.GROUP_STAGE)) {
      throw new ConflictException(err('PLAYOFFS_EXIST', 'Phases finales déjà générées'));
    }

    const groupMatches = await this.prisma.match.findMany({ where: { competitionId } });
    if (groupMatches.some((m) => m.status !== 'FINISHED' && m.status !== 'FORFEIT')) {
      throw new ConflictException(err('GROUPS_NOT_COMPLETE', 'Tous les matchs de poule ne sont pas terminés'));
    }

    const { plan } = await this.reconstructGroupPlan(competitionId);
    const rules = this.rulesFor(competition.formatConfig);
    const results = computeGroupResults(plan, this.enginify(groupMatches), rules);
    const cfg = competition.formatConfig as { qualifyPerGroup?: number };
    const qualifiers = determineQualifiedTeams(results, {
      qualifyPerGroup: cfg.qualifyPerGroup ?? 2,
    });
    const names = await this.registrationNames(qualifiers.map((q) => q.teamId));
    const playoffs = buildPlayoffsFromQualifiers(qualifiers, names);

    return this.prisma.$transaction((tx) =>
      this.persistRoundsAndMatches(tx, {
        competitionId,
        tournamentId: competition.tournamentId,
        categoryId: competition.categoryId,
        rounds: playoffs.rounds,
        groups: [],
        matches: playoffs.matches,
        roundOrderOffset: 1,
      }),
    );
  }

  /** Compétitions d'un tournoi (pour piloter la génération de calendrier). */
  async listByTournament(orgId: string, tournamentId: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { id: tournamentId, organizationId: orgId, deletedAt: null },
    });
    if (!tournament) return [];
    const comps = await this.prisma.competition.findMany({
      where: { tournamentId },
      include: { category: { select: { name: true } } },
    });
    return Promise.all(
      comps.map(async (c) => {
        const [matchesTotal, unscheduled] = await Promise.all([
          this.prisma.match.count({ where: { categoryId: c.categoryId, tournamentId, deletedAt: null } }),
          this.prisma.match.count({
            where: { categoryId: c.categoryId, tournamentId, deletedAt: null, scheduledAt: null, status: 'SCHEDULED' },
          }),
        ]);
        return {
          id: c.id,
          category: c.category?.name ?? 'Compétition',
          formatType: c.formatType,
          status: c.status,
          matchesTotal,
          matchesUnscheduled: unscheduled,
        };
      }),
    );
  }

  async getStandings(orgId: string, competitionId: string) {
    await this.scopedCompetition(orgId, competitionId);
    return this.prisma.standing.findMany({
      where: { competitionId },
      orderBy: [{ groupId: 'asc' }, { position: 'asc' }],
      include: { registration: { include: { team: { select: { name: true, logoUrl: true } } } } },
    });
  }

  async getMatches(orgId: string, competitionId: string) {
    await this.scopedCompetition(orgId, competitionId);
    return this.prisma.match.findMany({
      where: { competitionId, deletedAt: null },
      orderBy: [{ roundId: 'asc' }, { order: 'asc' }],
    });
  }

  // ───────────────────────── Plan builder (moteur) ─────────────────────────

  private buildPlan(input: GenerateCompetitionInput, teams: TeamRef[]): EnginePlan {
    switch (input.type) {
      case 'ROUND_ROBIN': {
        const roundId = 'RR-R1';
        return {
          rounds: [{ id: roundId, type: RoundType.ROUND_ROBIN, name: 'Championnat', order: 1 }],
          groups: [],
          matches: generateRoundRobinFixtures(teams, roundId, { doubleRound: input.doubleRound }),
        };
      }
      case 'GROUP_STAGE':
      case 'GROUP_TO_PLAYOFFS': {
        const groups = input.groups ?? 1;
        if (teams.length < groups * 2) {
          throw new BadRequestException(err('TOO_MANY_GROUPS', 'Au moins 2 équipes par groupe requises'));
        }
        const plan: CompetitionPlan = planGroupStage(teams, groups, { doubleRound: input.doubleRound });
        return plan;
      }
      case 'SINGLE_ELIMINATION': {
        const ko = generateSingleElimination(teams);
        return { rounds: ko.rounds, groups: [], matches: ko.matches };
      }
      case 'DOUBLE_ELIMINATION': {
        try {
          const de = generateDoubleElimination(teams);
          return { rounds: de.rounds, groups: [], matches: de.matches };
        } catch {
          throw new BadRequestException(
            err('UNSUPPORTED_SIZE', 'Double élimination : 4 ou 8 équipes uniquement'),
          );
        }
      }
      default:
        throw new BadRequestException(err('UNSUPPORTED_FORMAT', 'Format non supporté'));
    }
  }

  // ───────────────────────── Persistance ─────────────────────────

  private async persistPlan(
    tx: Prisma.TransactionClient,
    args: {
      tournamentId: string;
      categoryId: string;
      formatType: GenerateCompetitionInput['type'];
      formatConfig: Prisma.InputJsonValue;
      plan: EnginePlan;
    },
  ) {
    const competition = await tx.competition.create({
      data: {
        categoryId: args.categoryId,
        tournamentId: args.tournamentId,
        formatType: args.formatType,
        formatConfig: args.formatConfig,
      },
    });
    await this.persistRoundsAndMatches(tx, {
      competitionId: competition.id,
      tournamentId: args.tournamentId,
      categoryId: args.categoryId,
      rounds: args.plan.rounds,
      groups: args.plan.groups,
      matches: args.plan.matches,
      roundOrderOffset: 0,
    });
    return competition;
  }

  private async persistRoundsAndMatches(
    tx: Prisma.TransactionClient,
    args: {
      competitionId: string;
      tournamentId: string;
      categoryId: string;
      rounds: PlannedRound[];
      groups: PlannedGroup[];
      matches: EngineMatch[];
      roundOrderOffset: number;
    },
  ) {
    const roundIdMap = new Map<string, string>();
    for (const r of args.rounds) {
      const created = await tx.round.create({
        data: {
          competitionId: args.competitionId,
          roundType: r.type,
          name: r.name,
          order: r.order + args.roundOrderOffset,
        },
      });
      roundIdMap.set(r.id, created.id);
    }

    // Les groupes appartiennent au round GROUP_STAGE.
    const groupRoundId = args.rounds.find((r) => r.type === RoundType.GROUP_STAGE)?.id;
    const groupIdMap = new Map<string, string>();
    if (groupRoundId) {
      for (const [i, g] of args.groups.entries()) {
        const created = await tx.group.create({
          data: { roundId: roundIdMap.get(groupRoundId)!, name: g.name, order: i },
        });
        groupIdMap.set(g.id, created.id);
        await tx.groupTeam.createMany({
          data: g.teamIds.map((registrationId, idx) => ({
            groupId: created.id,
            registrationId,
            seed: idx + 1,
          })),
        });
      }
    }

    const matchIdMap = new Map<string, string>();
    for (const m of args.matches) {
      const created = await tx.match.create({
        data: {
          tournamentId: args.tournamentId,
          categoryId: args.categoryId,
          competitionId: args.competitionId,
          roundId: roundIdMap.get(m.roundId)!,
          groupId: m.groupId ? groupIdMap.get(m.groupId) : null,
          homeTeamId: m.homeTeamId ?? null,
          awayTeamId: m.awayTeamId ?? null,
          homeSourceRef: m.homeSourceRef ?? Prisma.JsonNull,
          awaySourceRef: m.awaySourceRef ?? Prisma.JsonNull,
          status: m.status,
          winnerRegistrationId: m.winnerRef ?? null,
          resultType: m.resultType ?? null,
          feedsIntoSlot: m.feedsIntoSlot ?? null,
          loserFeedsIntoSlot: m.loserFeedsIntoSlot ?? null,
          order: m.order ?? 0,
        },
      });
      matchIdMap.set(m.id, created.id);
    }
    // 2e passe : chaînage feedsInto / loserFeedsInto (ids DB).
    for (const m of args.matches) {
      if (m.feedsIntoMatchId || m.loserFeedsIntoMatchId) {
        await tx.match.update({
          where: { id: matchIdMap.get(m.id)! },
          data: {
            feedsIntoMatchId: m.feedsIntoMatchId ? (matchIdMap.get(m.feedsIntoMatchId) ?? null) : null,
            loserFeedsIntoMatchId: m.loserFeedsIntoMatchId
              ? (matchIdMap.get(m.loserFeedsIntoMatchId) ?? null)
              : null,
          },
        });
      }
    }
    return { competitionId: args.competitionId, matches: matchIdMap.size };
  }

  private async deleteCascade(tx: Prisma.TransactionClient, competitionId: string) {
    const matchIds = (
      await tx.match.findMany({ where: { competitionId }, select: { id: true } })
    ).map((m) => m.id);
    await tx.matchEvent.deleteMany({ where: { matchId: { in: matchIds } } });
    await tx.matchOfficial.deleteMany({ where: { matchId: { in: matchIds } } });
    await tx.standing.deleteMany({ where: { competitionId } });
    await tx.match.deleteMany({ where: { competitionId } });
    await tx.groupTeam.deleteMany({ where: { group: { round: { competitionId } } } });
    await tx.group.deleteMany({ where: { round: { competitionId } } });
    await tx.round.deleteMany({ where: { competitionId } });
    await tx.competition.delete({ where: { id: competitionId } });
  }

  // ───────────────────────── Helpers ─────────────────────────

  private enginify(matches: Awaited<ReturnType<PrismaService['match']['findMany']>>): EngineMatch[] {
    return matches.map((m) => ({
      id: m.id,
      roundId: m.roundId,
      groupId: m.groupId ?? undefined,
      homeTeamId: m.homeTeamId ?? undefined,
      awayTeamId: m.awayTeamId ?? undefined,
      status: m.status as EngineMatch['status'],
      result:
        m.homeScore != null && m.awayScore != null
          ? {
              homeScore: m.homeScore,
              awayScore: m.awayScore,
              homePenalties: m.homePenalties ?? undefined,
              awayPenalties: m.awayPenalties ?? undefined,
            }
          : undefined,
      winnerRef: m.winnerRegistrationId ?? undefined,
    }));
  }

  private async reconstructGroupPlan(competitionId: string) {
    const groups = await this.prisma.group.findMany({
      where: { round: { competitionId } },
      include: { groupTeams: true },
      orderBy: { order: 'asc' },
    });
    const plannedGroups: PlannedGroup[] = groups.map((g) => ({
      id: g.id,
      name: g.name,
      teamIds: g.groupTeams.map((gt) => gt.registrationId),
    }));
    const plan: CompetitionPlan = { rounds: [], groups: plannedGroups, matches: [] };
    return { groups: plannedGroups, plan };
  }

  private async registrationNames(ids: string[]): Promise<Record<string, string>> {
    const regs = await this.prisma.registration.findMany({
      where: { id: { in: ids } },
      include: { team: { select: { name: true } } },
    });
    return Object.fromEntries(regs.map((r) => [r.id, r.team.name]));
  }

  private rulesFor(formatConfig: unknown): RankingRules {
    void formatConfig;
    return MARACANA_RULES;
  }

  private async scopedCategory(orgId: string, categoryId: string) {
    const category = await this.prisma.tournamentCategory.findFirst({
      where: { id: categoryId, tournament: { organizationId: orgId, deletedAt: null } },
    });
    if (!category) throw new NotFoundException(err('CATEGORY_NOT_FOUND', 'Catégorie introuvable'));
    return category;
  }

  private async scopedCompetition(orgId: string, competitionId: string) {
    const competition = await this.prisma.competition.findFirst({
      where: { id: competitionId, tournament: { organizationId: orgId, deletedAt: null } },
    });
    if (!competition) throw new NotFoundException(err('COMPETITION_NOT_FOUND', 'Compétition introuvable'));
    return competition;
  }
}

function err(code: string, message: string) {
  return { error: { code, message } };
}
