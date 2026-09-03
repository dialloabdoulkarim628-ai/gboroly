import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MatchStatus, Prisma, TournamentStatus } from '@gboroly/database';
import type { EngineMatch, PlannedGroup, RankingRules } from '@gboroly/types';
import type {
  ForfeitMatchInput,
  PostponeMatchInput,
  RecordEventInput,
  ScheduleMatchInput,
  SetScoreInput,
} from '@gboroly/validation';
import {
  MARACANA_RULES,
  advanceDoubleElimination,
  advanceKnockout,
  applyForfeit,
  calculateStandings,
  applyTieBreakers,
  groupStandings,
} from '@gboroly/competition-engine';
import { PrismaService } from '../prisma/prisma.service';
import { toEngineMatch, winnerFromScore } from './engine-mapper';

interface ResultData {
  homeScore: number;
  awayScore: number;
  homePenalties?: number | null;
  awayPenalties?: number | null;
  resultType: 'NORMAL' | 'FORFEIT';
  forfeitTeamId?: string | null;
}

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string, filters: { tournamentId?: string; categoryId?: string; status?: string }) {
    return this.prisma.match.findMany({
      where: {
        tournament: { organizationId: orgId },
        tournamentId: filters.tournamentId,
        categoryId: filters.categoryId,
        status: filters.status as MatchStatus | undefined,
        deletedAt: null,
      },
      orderBy: [{ scheduledAt: 'asc' }, { order: 'asc' }],
    });
  }

  /** Liste enrichie pour l'UI organisateur : noms d'équipes + round + terrain. */
  async listView(orgId: string, filters: { tournamentId?: string; categoryId?: string; status?: string }) {
    const matches = await this.prisma.match.findMany({
      where: {
        tournament: { organizationId: orgId },
        tournamentId: filters.tournamentId,
        categoryId: filters.categoryId,
        status: filters.status as MatchStatus | undefined,
        deletedAt: null,
      },
      orderBy: [{ scheduledAt: 'asc' }, { order: 'asc' }],
      include: {
        round: { select: { name: true, roundType: true, order: true } },
        field: { select: { name: true } },
        homeTeam: { include: { team: { select: { name: true, logoUrl: true } } } },
        awayTeam: { include: { team: { select: { name: true, logoUrl: true } } } },
      },
    });
    return matches.map((m) => ({
      id: m.id,
      status: m.status,
      scheduledAt: m.scheduledAt,
      round: m.round?.name ?? null,
      roundOrder: m.round?.order ?? 0,
      field: m.field?.name ?? null,
      homeRegistrationId: m.homeTeamId,
      awayRegistrationId: m.awayTeamId,
      home: m.homeTeam?.team?.name ?? null,
      away: m.awayTeam?.team?.name ?? null,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      homePenalties: m.homePenalties,
      awayPenalties: m.awayPenalties,
    }));
  }

  get(orgId: string, matchId: string) {
    return this.scoped(orgId, matchId);
  }

  async schedule(orgId: string, matchId: string, input: ScheduleMatchInput) {
    await this.scoped(orgId, matchId);
    return this.prisma.match.update({
      where: { id: matchId },
      data: {
        scheduledAt: input.scheduledAt,
        venueId: input.venueId,
        fieldId: input.fieldId,
        refereeId: input.refereeId,
      },
    });
  }

  async start(orgId: string, matchId: string) {
    const match = await this.scoped(orgId, matchId);
    if (match.status !== MatchStatus.SCHEDULED) {
      throw new ConflictException(errCode('INVALID_STATUS', `Statut ${match.status}`));
    }
    if (!match.homeTeamId || !match.awayTeamId) {
      throw new ConflictException(errCode('TEAMS_NOT_SET', 'Les deux équipes ne sont pas déterminées'));
    }
    return this.prisma.$transaction(async (tx) => {
      await this.bumpVersion(tx, match, {
        status: MatchStatus.LIVE,
        startedAt: new Date(),
      });
      // Le tournoi passe EN COURS au coup d'envoi du 1er match.
      await tx.tournament.updateMany({
        where: { id: match.tournamentId, status: TournamentStatus.PUBLISHED },
        data: { status: TournamentStatus.ONGOING },
      });
      await this.emitOutbox(tx, match, 'MatchStarted', {});
      return tx.match.findUniqueOrThrow({ where: { id: matchId } });
    });
  }

  async recordEvent(orgId: string, matchId: string, userId: string, input: RecordEventInput) {
    const match = await this.scoped(orgId, matchId);
    if (match.status !== MatchStatus.LIVE && match.status !== MatchStatus.PAUSED) {
      throw new ConflictException(errCode('MATCH_NOT_LIVE', 'Le match n’est pas en cours'));
    }
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.matchEvent.create({
        data: {
          matchId,
          registrationId: input.teamRegistrationId,
          playerId: input.playerId,
          type: input.type,
          minute: input.minute,
          additionalTime: input.additionalTime,
          createdByUserId: userId,
        },
      });
      // Un but met à jour le score courant.
      if (input.type === 'GOAL' || input.type === 'OWN_GOAL') {
        const scoringHome =
          input.type === 'GOAL'
            ? input.teamRegistrationId === match.homeTeamId
            : input.teamRegistrationId === match.awayTeamId; // csc → adversaire
        await tx.match.update({
          where: { id: matchId },
          data: scoringHome
            ? { homeScore: { increment: 1 } }
            : { awayScore: { increment: 1 } },
        });
        await this.emitOutbox(tx, match, 'MatchScoreUpdated', {});
      }
      return event;
    });
  }

  async setScore(orgId: string, matchId: string, input: SetScoreInput) {
    const match = await this.scoped(orgId, matchId);
    if (match.status === MatchStatus.FINISHED || match.status === MatchStatus.CANCELLED) {
      throw new ConflictException(errCode('MATCH_CLOSED', 'Match terminé/annulé'));
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.match.update({
        where: { id: matchId },
        data: {
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          homePenalties: input.homePenalties,
          awayPenalties: input.awayPenalties,
        },
      });
      await this.emitOutbox(tx, match, 'MatchScoreUpdated', {
        homeScore: input.homeScore,
        awayScore: input.awayScore,
      });
      return updated;
    });
  }

  /** ⭐ Chaîne transactionnelle : termine le match → classement → bracket → outbox. */
  async finish(orgId: string, matchId: string, input: SetScoreInput) {
    const match = await this.scoped(orgId, matchId);
    this.assertFinishable(match);
    return this.prisma.$transaction((tx) =>
      this.finalize(tx, match, {
        homeScore: input.homeScore,
        awayScore: input.awayScore,
        homePenalties: input.homePenalties,
        awayPenalties: input.awayPenalties,
        resultType: 'NORMAL',
      }),
    );
  }

  async forfeit(orgId: string, matchId: string, input: ForfeitMatchInput) {
    const match = await this.scoped(orgId, matchId);
    this.assertFinishable(match);
    const engine = applyForfeit(toEngineMatch(match), input.forfeitTeamRegistrationId);
    return this.prisma.$transaction((tx) =>
      this.finalize(tx, match, {
        homeScore: engine.result!.homeScore,
        awayScore: engine.result!.awayScore,
        resultType: 'FORFEIT',
        forfeitTeamId: input.forfeitTeamRegistrationId,
      }),
    );
  }

  async postpone(orgId: string, matchId: string, input: PostponeMatchInput) {
    const match = await this.scoped(orgId, matchId);
    if (match.status === MatchStatus.FINISHED) {
      throw new ConflictException(errCode('MATCH_CLOSED', 'Match déjà terminé'));
    }
    return this.prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.POSTPONED,
        postponedFrom: match.scheduledAt,
        scheduledAt: input.scheduledAt,
        fieldId: input.fieldId ?? match.fieldId,
      },
    });
  }

  async cancel(orgId: string, matchId: string) {
    const match = await this.scoped(orgId, matchId);
    if (match.status === MatchStatus.FINISHED) {
      throw new ConflictException(errCode('MATCH_CLOSED', 'Match déjà terminé'));
    }
    return this.prisma.match.update({
      where: { id: matchId },
      data: { status: MatchStatus.CANCELLED },
    });
  }

  // ───────────────────────── Chaîne transactionnelle ─────────────────────────

  private async finalize(
    tx: Prisma.TransactionClient,
    match: MatchRow,
    data: ResultData,
  ) {
    const winnerId = winnerFromScore({
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      homePenalties: data.homePenalties,
      awayPenalties: data.awayPenalties,
    });

    await this.bumpVersion(tx, match, {
      status: MatchStatus.FINISHED,
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      homePenalties: data.homePenalties ?? null,
      awayPenalties: data.awayPenalties ?? null,
      winnerRegistrationId: winnerId,
      resultType: data.resultType,
      forfeitTeamId: data.forfeitTeamId ?? null,
      finishedAt: new Date(),
    });

    await this.recomputeStandings(tx, match.competitionId);
    await this.advanceBracket(tx, match.competitionId);

    await tx.outboxEvent.create({
      data: {
        aggregateType: 'Match',
        aggregateId: match.id,
        eventType: 'MatchFinished',
        payload: {
          matchId: match.id,
          tournamentId: match.tournamentId,
          competitionId: match.competitionId,
          winnerRegistrationId: winnerId,
        } as Prisma.InputJsonValue,
      },
    });

    return tx.match.findUniqueOrThrow({ where: { id: match.id } });
  }

  private async recomputeStandings(tx: Prisma.TransactionClient, competitionId: string) {
    const competition = await tx.competition.findUniqueOrThrow({ where: { id: competitionId } });
    // Pas de classement pour les formats purement à élimination.
    if (
      competition.formatType === 'SINGLE_ELIMINATION' ||
      competition.formatType === 'DOUBLE_ELIMINATION'
    ) {
      return;
    }
    const rules = this.rules(competition.formatConfig);
    const matches = await tx.match.findMany({ where: { competitionId } });
    const engineMatches: EngineMatch[] = matches.map(toEngineMatch);

    const rows: Prisma.StandingCreateManyInput[] = [];
    const groups = await tx.group.findMany({
      where: { round: { competitionId } },
      include: { groupTeams: true },
    });

    if (groups.length > 0) {
      for (const g of groups) {
        const planned: PlannedGroup = {
          id: g.id,
          name: g.name,
          teamIds: g.groupTeams.map((gt) => gt.registrationId),
        };
        for (const s of groupStandings(planned, engineMatches, rules)) {
          rows.push({ ...toStandingRow(s), competitionId, groupId: g.id });
        }
      }
    } else {
      // Round robin : un seul classement global.
      const teamIds = new Set<string>();
      for (const m of matches) {
        if (m.homeTeamId) teamIds.add(m.homeTeamId);
        if (m.awayTeamId) teamIds.add(m.awayTeamId);
      }
      const teamRefs = [...teamIds].map((id) => ({ id, name: id }));
      const table = applyTieBreakers(
        calculateStandings(teamRefs, engineMatches, rules),
        engineMatches,
        rules,
      );
      for (const s of table) rows.push({ ...toStandingRow(s), competitionId, groupId: null });
    }

    // Recompute idempotent : remplacement complet.
    await tx.standing.deleteMany({ where: { competitionId } });
    if (rows.length > 0) await tx.standing.createMany({ data: rows });
  }

  private async advanceBracket(tx: Prisma.TransactionClient, competitionId: string) {
    const competition = await tx.competition.findUniqueOrThrow({ where: { id: competitionId } });
    const matches = await tx.match.findMany({ where: { competitionId } });
    const engineMatches = matches.map(toEngineMatch);

    if (competition.formatType === 'DOUBLE_ELIMINATION') {
      advanceDoubleElimination(engineMatches);
    } else {
      advanceKnockout(engineMatches);
    }

    // Persiste uniquement les slots aval qui viennent d'être résolus (matchs non démarrés).
    const dbById = new Map(matches.map((m) => [m.id, m]));
    for (const e of engineMatches) {
      const db = dbById.get(e.id)!;
      if (db.status !== MatchStatus.SCHEDULED) continue;
      const data: Prisma.MatchUpdateInput = {};
      if (e.homeTeamId && e.homeTeamId !== db.homeTeamId) data.homeTeam = { connect: { id: e.homeTeamId } };
      if (e.awayTeamId && e.awayTeamId !== db.awayTeamId) data.awayTeam = { connect: { id: e.awayTeamId } };
      if (Object.keys(data).length > 0) {
        await tx.match.update({ where: { id: e.id }, data });
      }
    }
  }

  // ───────────────────────── Helpers ─────────────────────────

  private assertFinishable(match: MatchRow) {
    if (match.status === MatchStatus.FINISHED) {
      throw new ConflictException(errCode('MATCH_ALREADY_FINISHED', 'Match déjà terminé'));
    }
    if (match.status === MatchStatus.CANCELLED) {
      throw new ConflictException(errCode('MATCH_CLOSED', 'Match annulé'));
    }
    if (!match.homeTeamId || !match.awayTeamId) {
      throw new ConflictException(errCode('TEAMS_NOT_SET', 'Équipes non déterminées'));
    }
  }

  /** Écriture optimiste : échoue si la version a changé (concurrence). */
  private async bumpVersion(
    tx: Prisma.TransactionClient,
    match: { id: string; version: number },
    data: Prisma.MatchUpdateManyMutationInput,
  ) {
    const res = await tx.match.updateMany({
      where: { id: match.id, version: match.version },
      data: { ...data, version: { increment: 1 } },
    });
    if (res.count === 0) {
      throw new ConflictException(errCode('CONCURRENT_UPDATE', 'Match modifié par une autre opération'));
    }
  }

  /** Écrit un événement d'outbox (relayé en temps réel par OutboxRelayService). */
  private emitOutbox(
    tx: Prisma.TransactionClient,
    match: { id: string; tournamentId: string; competitionId: string },
    eventType: string,
    extra: Record<string, unknown>,
  ) {
    return tx.outboxEvent.create({
      data: {
        aggregateType: 'Match',
        aggregateId: match.id,
        eventType,
        payload: {
          matchId: match.id,
          tournamentId: match.tournamentId,
          competitionId: match.competitionId,
          ...extra,
        } as Prisma.InputJsonValue,
      },
    });
  }

  private rules(_formatConfig: unknown): RankingRules {
    return MARACANA_RULES;
  }

  private async scoped(orgId: string, matchId: string): Promise<MatchRow> {
    const match = await this.prisma.match.findFirst({
      where: { id: matchId, tournament: { organizationId: orgId, deletedAt: null }, deletedAt: null },
    });
    if (!match) throw new NotFoundException(errCode('MATCH_NOT_FOUND', 'Match introuvable'));
    return match;
  }
}

type MatchRow = NonNullable<Awaited<ReturnType<PrismaService['match']['findFirst']>>>;

function toStandingRow(s: {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  fairPlayPoints: number;
  position: number;
}) {
  return {
    registrationId: s.teamId,
    played: s.played,
    wins: s.wins,
    draws: s.draws,
    losses: s.losses,
    goalsFor: s.goalsFor,
    goalsAgainst: s.goalsAgainst,
    goalDifference: s.goalDifference,
    points: s.points,
    fairPlayPoints: s.fairPlayPoints,
    position: s.position,
  };
}

function errCode(code: string, message: string) {
  return { error: { code, message } };
}
