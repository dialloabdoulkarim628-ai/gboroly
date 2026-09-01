import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  CreateAnnouncementSchema,
  type CreateAnnouncementInput,
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
import { CommunicationsService } from './communications.service';

@Controller()
export class CommunicationsController {
  constructor(private readonly communications: CommunicationsService) {}

  @RequirePermissions('announcement.publish')
  @Post('tournaments/:id/announcements')
  create(
    @ActiveMembership() m: Membership,
    @CurrentUser() user: AuthUser,
    @Param('id') tournamentId: string,
    @Body(new ZodValidationPipe(CreateAnnouncementSchema)) body: CreateAnnouncementInput,
  ) {
    return this.communications.createAnnouncement(m.organizationId, tournamentId, user.id, body);
  }

  @RequireMembership()
  @Get('tournaments/:id/announcements')
  list(@ActiveMembership() m: Membership, @Param('id') tournamentId: string) {
    return this.communications.listAnnouncements(m.organizationId, tournamentId);
  }

  @RequirePermissions('notification.send')
  @Get('matches/:id/whatsapp-reminder')
  reminder(@ActiveMembership() m: Membership, @Param('id') matchId: string) {
    return this.communications.matchReminderLink(m.organizationId, matchId);
  }
}
