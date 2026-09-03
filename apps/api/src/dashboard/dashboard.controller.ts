import { Controller, Get } from '@nestjs/common';
import { ActiveMembership, RequireMembership } from '../common/decorators';
import type { Membership } from '../rbac/rbac.service';
import { DashboardService } from './dashboard.service';

@Controller()
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /** Accueil du tableau de bord organisateur (org active via X-Organization-Id). */
  @RequireMembership()
  @Get('me/dashboard')
  overview(@ActiveMembership() m: Membership) {
    return this.dashboard.overview(m.organizationId);
  }
}
