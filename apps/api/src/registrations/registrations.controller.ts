import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  CreateRegistrationSchema,
  RejectRegistrationSchema,
  type CreateRegistrationInput,
  type RejectRegistrationInput,
} from '@gboroly/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ActiveMembership, RequireMembership, RequirePermissions } from '../common/decorators';
import type { Membership } from '../rbac/rbac.service';
import { RegistrationsService } from './registrations.service';

@Controller()
export class RegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  @RequirePermissions('team.manage')
  @Post('tournaments/:id/registrations')
  create(
    @ActiveMembership() m: Membership,
    @Param('id') tournamentId: string,
    @Body(new ZodValidationPipe(CreateRegistrationSchema)) body: CreateRegistrationInput,
  ) {
    return this.registrations.create(m.organizationId, tournamentId, body);
  }

  @RequireMembership()
  @Get('tournaments/:id/registrations')
  list(@ActiveMembership() m: Membership, @Param('id') tournamentId: string) {
    return this.registrations.list(m.organizationId, tournamentId);
  }

  @RequirePermissions('registration.review')
  @Post('registrations/:id/approve')
  approve(@ActiveMembership() m: Membership, @Param('id') id: string) {
    return this.registrations.approve(m.organizationId, id);
  }

  @RequirePermissions('registration.review')
  @Post('registrations/:id/reject')
  reject(
    @ActiveMembership() m: Membership,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RejectRegistrationSchema)) body: RejectRegistrationInput,
  ) {
    return this.registrations.reject(m.organizationId, id, body);
  }

  @RequirePermissions('registration.review')
  @Post('registrations/:id/withdraw')
  withdraw(@ActiveMembership() m: Membership, @Param('id') id: string) {
    return this.registrations.withdraw(m.organizationId, id);
  }
}
