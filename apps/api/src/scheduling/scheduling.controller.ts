import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CreateFieldSchema,
  CreateVenueSchema,
  GenerateScheduleSchema,
  UpdateFieldSchema,
  type CreateFieldInput,
  type CreateVenueInput,
  type GenerateScheduleInput,
  type UpdateFieldInput,
} from '@gboroly/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ActiveMembership, RequireMembership, RequirePermissions } from '../common/decorators';
import type { Membership } from '../rbac/rbac.service';
import { VenuesService } from './venues.service';
import { SchedulingService } from './scheduling.service';

@Controller()
export class SchedulingController {
  constructor(
    private readonly venues: VenuesService,
    private readonly scheduling: SchedulingService,
  ) {}

  // ─────────────── Venues / Fields ───────────────

  @RequirePermissions('venue.manage')
  @Post('tournaments/:id/venues')
  createVenue(
    @ActiveMembership() m: Membership,
    @Param('id') tournamentId: string,
    @Body(new ZodValidationPipe(CreateVenueSchema)) body: CreateVenueInput,
  ) {
    return this.venues.createVenue(m.organizationId, tournamentId, body);
  }

  @RequireMembership()
  @Get('tournaments/:id/venues')
  listVenues(@ActiveMembership() m: Membership, @Param('id') tournamentId: string) {
    return this.venues.listVenues(m.organizationId, tournamentId);
  }

  @RequireMembership()
  @Get('tournaments/:id/fields')
  listFields(@ActiveMembership() m: Membership, @Param('id') tournamentId: string) {
    return this.venues.listFields(m.organizationId, tournamentId);
  }

  @RequirePermissions('venue.manage')
  @Post('venues/:venueId/fields')
  createField(
    @ActiveMembership() m: Membership,
    @Param('venueId') venueId: string,
    @Body(new ZodValidationPipe(CreateFieldSchema)) body: CreateFieldInput,
  ) {
    return this.venues.createField(m.organizationId, venueId, body);
  }

  @RequirePermissions('venue.manage')
  @Patch('fields/:fieldId')
  updateField(
    @ActiveMembership() m: Membership,
    @Param('fieldId') fieldId: string,
    @Body(new ZodValidationPipe(UpdateFieldSchema)) body: UpdateFieldInput,
  ) {
    return this.venues.updateField(m.organizationId, fieldId, body);
  }

  @RequirePermissions('venue.manage')
  @Delete('fields/:fieldId')
  removeField(@ActiveMembership() m: Membership, @Param('fieldId') fieldId: string) {
    return this.venues.removeField(m.organizationId, fieldId);
  }

  // ─────────────── Génération de calendrier ───────────────

  @RequirePermissions('schedule.generate')
  @Post('competitions/:competitionId/schedule')
  generate(
    @ActiveMembership() m: Membership,
    @Param('competitionId') competitionId: string,
    @Body(new ZodValidationPipe(GenerateScheduleSchema)) body: GenerateScheduleInput,
  ) {
    return this.scheduling.generateForCompetition(m.organizationId, competitionId, body);
  }
}
