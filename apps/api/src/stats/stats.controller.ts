import { Controller, Get, Param } from '@nestjs/common';
import { ActiveMembership, RequirePermissions } from '../common/decorators';
import type { Membership } from '../rbac/rbac.service';
import { StatsService } from './stats.service';

@Controller('tournaments')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @RequirePermissions('standing.view')
  @Get(':id/standings')
  standings(@ActiveMembership() m: Membership, @Param('id') tournamentId: string) {
    return this.stats.getStandings(m.organizationId, tournamentId);
  }

  @RequirePermissions('standing.view')
  @Get(':id/bracket')
  bracket(@ActiveMembership() m: Membership, @Param('id') tournamentId: string) {
    return this.stats.getBracket(m.organizationId, tournamentId);
  }

  @RequirePermissions('standing.view')
  @Get(':id/scorers')
  scorers(@ActiveMembership() m: Membership, @Param('id') tournamentId: string) {
    return this.stats.topScorers(m.organizationId, tournamentId);
  }

  @RequirePermissions('standing.view')
  @Get(':id/stats')
  summary(@ActiveMembership() m: Membership, @Param('id') tournamentId: string) {
    return this.stats.summary(m.organizationId, tournamentId);
  }
}
