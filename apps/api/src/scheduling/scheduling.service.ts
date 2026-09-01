import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { GenerateScheduleInput } from '@gboroly/validation';
import { PrismaService } from '../prisma/prisma.service';
import { generateSchedule, type SchedulableMatch } from './schedule-generator';

@Injectable()
export class SchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Génère (et applique, sauf dryRun) le calendrier des matchs planifiables d'une compétition. */
  async generateForCompetition(orgId: string, competitionId: string, input: GenerateScheduleInput) {
    const competition = await this.prisma.competition.findFirst({
      where: { id: competitionId, tournament: { organizationId: orgId, deletedAt: null } },
    });
    if (!competition) throw new NotFoundException(err('COMPETITION_NOT_FOUND', 'Compétition introuvable'));

    const fields = await this.prisma.field.findMany({
      where: { tournamentId: competition.tournamentId },
      select: { id: true, venueId: true },
    });
    if (fields.length === 0) {
      throw new BadRequestException(err('NO_FIELD', 'Aucun terrain configuré'));
    }

    // Matchs planifiables : programmés, avec deux équipes connues.
    const dbMatches = await this.prisma.match.findMany({
      where: {
        competitionId,
        status: 'SCHEDULED',
        homeTeamId: { not: null },
        awayTeamId: { not: null },
        deletedAt: null,
      },
      include: { round: { select: { order: true } } },
    });

    const schedulable: SchedulableMatch[] = dbMatches.map((m) => ({
      id: m.id,
      teamAId: m.homeTeamId!,
      teamBId: m.awayTeamId!,
      priority: m.round.order * 1000 + m.order,
    }));

    const result = generateSchedule(schedulable, fields.map((f) => f.id), {
      days: input.days,
      startTime: input.startTime,
      endTime: input.endTime,
      matchDurationMin: input.matchDurationMin,
      breakMin: input.breakMin,
      restMinutesPerTeam: input.restMinutesPerTeam,
    });

    if (!input.dryRun && result.assignments.length > 0) {
      const venueByField = new Map(fields.map((f) => [f.id, f.venueId]));
      await this.prisma.$transaction(
        result.assignments.map((a) =>
          this.prisma.match.update({
            where: { id: a.matchId },
            data: {
              scheduledAt: new Date(a.start),
              fieldId: a.fieldId,
              venueId: venueByField.get(a.fieldId) ?? null,
            },
          }),
        ),
      );
    }

    return {
      applied: !input.dryRun,
      scheduled: result.assignments.length,
      unscheduledCount: result.unscheduled.length,
      ...result,
    };
  }
}

function err(code: string, message: string) {
  return { error: { code, message } };
}
