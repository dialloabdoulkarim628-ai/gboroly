import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ForfeitMatchSchema,
  PostponeMatchSchema,
  RecordEventSchema,
  ScheduleMatchSchema,
  SetScoreSchema,
  type ForfeitMatchInput,
  type PostponeMatchInput,
  type RecordEventInput,
  type ScheduleMatchInput,
  type SetScoreInput,
} from '@gboroly/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  ActiveMembership,
  CurrentUser,
  RequireMembership,
  RequirePermissions,
  type AuthUser,
} from '../common/decorators';
import type { Membership } from '../rbac/rbac.service';
import { MatchesService } from './matches.service';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @RequireMembership()
  @Get()
  list(
    @ActiveMembership() m: Membership,
    @Query('tournamentId') tournamentId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
  ) {
    return this.matches.listView(m.organizationId, { tournamentId, categoryId, status });
  }

  @RequireMembership()
  @Get(':id')
  get(@ActiveMembership() m: Membership, @Param('id') id: string) {
    return this.matches.get(m.organizationId, id);
  }

  @RequirePermissions('match.reschedule')
  @Patch(':id/schedule')
  schedule(
    @ActiveMembership() m: Membership,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ScheduleMatchSchema)) body: ScheduleMatchInput,
  ) {
    return this.matches.schedule(m.organizationId, id, body);
  }

  @RequirePermissions('match.operate')
  @Post(':id/start')
  start(@ActiveMembership() m: Membership, @Param('id') id: string) {
    return this.matches.start(m.organizationId, id);
  }

  @RequirePermissions('match.operate')
  @Post(':id/events')
  recordEvent(
    @ActiveMembership() m: Membership,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RecordEventSchema)) body: RecordEventInput,
  ) {
    return this.matches.recordEvent(m.organizationId, id, user.id, body);
  }

  @RequirePermissions('match.operate')
  @Patch(':id/score')
  setScore(
    @ActiveMembership() m: Membership,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SetScoreSchema)) body: SetScoreInput,
  ) {
    return this.matches.setScore(m.organizationId, id, body);
  }

  @RequirePermissions('match.operate')
  @Post(':id/finish')
  finish(
    @ActiveMembership() m: Membership,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SetScoreSchema)) body: SetScoreInput,
  ) {
    return this.matches.finish(m.organizationId, id, body);
  }

  @RequirePermissions('match.operate')
  @Post(':id/forfeit')
  forfeit(
    @ActiveMembership() m: Membership,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ForfeitMatchSchema)) body: ForfeitMatchInput,
  ) {
    return this.matches.forfeit(m.organizationId, id, body);
  }

  @RequirePermissions('match.reschedule')
  @Post(':id/postpone')
  postpone(
    @ActiveMembership() m: Membership,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(PostponeMatchSchema)) body: PostponeMatchInput,
  ) {
    return this.matches.postpone(m.organizationId, id, body);
  }

  @RequirePermissions('match.cancel')
  @Post(':id/cancel')
  cancel(@ActiveMembership() m: Membership, @Param('id') id: string) {
    return this.matches.cancel(m.organizationId, id);
  }
}
