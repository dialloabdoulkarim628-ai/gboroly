import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CreateSponsorSchema,
  UpdateSponsorSchema,
  type CreateSponsorInput,
  type UpdateSponsorInput,
} from '@gboroly/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ActiveMembership, RequireMembership, RequirePermissions } from '../common/decorators';
import type { Membership } from '../rbac/rbac.service';
import { SponsorsService } from './sponsors.service';

@Controller()
export class SponsorsController {
  constructor(private readonly sponsors: SponsorsService) {}

  @RequirePermissions('sponsor.manage')
  @Post('tournaments/:id/sponsors')
  create(
    @ActiveMembership() m: Membership,
    @Param('id') tournamentId: string,
    @Body(new ZodValidationPipe(CreateSponsorSchema)) body: CreateSponsorInput,
  ) {
    return this.sponsors.create(m.organizationId, tournamentId, body);
  }

  @RequireMembership()
  @Get('tournaments/:id/sponsors')
  list(@ActiveMembership() m: Membership, @Param('id') tournamentId: string) {
    return this.sponsors.list(m.organizationId, tournamentId);
  }

  @RequirePermissions('sponsor.manage')
  @Patch('sponsors/:sponsorId')
  update(
    @ActiveMembership() m: Membership,
    @Param('sponsorId') sponsorId: string,
    @Body(new ZodValidationPipe(UpdateSponsorSchema)) body: UpdateSponsorInput,
  ) {
    return this.sponsors.update(m.organizationId, sponsorId, body);
  }

  @RequirePermissions('sponsor.manage')
  @Delete('sponsors/:sponsorId')
  remove(@ActiveMembership() m: Membership, @Param('sponsorId') sponsorId: string) {
    return this.sponsors.remove(m.organizationId, sponsorId);
  }
}
