import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  GenerateCompetitionSchema,
  type GenerateCompetitionInput,
} from '@gboroly/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  ActiveMembership,
  RequireMembership,
  RequirePermissions,
} from '../common/decorators';
import type { Membership } from '../rbac/rbac.service';
import { CompetitionsService } from './competitions.service';

@Controller()
export class CompetitionsController {
  constructor(private readonly competitions: CompetitionsService) {}

  @RequireMembership()
  @Get('tournaments/:tournamentId/competitions')
  listByTournament(@ActiveMembership() m: Membership, @Param('tournamentId') tournamentId: string) {
    return this.competitions.listByTournament(m.organizationId, tournamentId);
  }

  @RequirePermissions('competition.configure')
  @Post('categories/:categoryId/competition')
  generate(
    @ActiveMembership() m: Membership,
    @Param('categoryId') categoryId: string,
    @Body(new ZodValidationPipe(GenerateCompetitionSchema)) body: GenerateCompetitionInput,
  ) {
    return this.competitions.generate(m.organizationId, categoryId, body);
  }

  @RequirePermissions('competition.configure')
  @Post('competitions/:competitionId/playoffs')
  generatePlayoffs(@ActiveMembership() m: Membership, @Param('competitionId') competitionId: string) {
    return this.competitions.generatePlayoffs(m.organizationId, competitionId);
  }

  @RequirePermissions('standing.view')
  @Get('competitions/:competitionId/standings')
  standings(@ActiveMembership() m: Membership, @Param('competitionId') competitionId: string) {
    return this.competitions.getStandings(m.organizationId, competitionId);
  }

  @RequireMembership()
  @Get('competitions/:competitionId/matches')
  matches(@ActiveMembership() m: Membership, @Param('competitionId') competitionId: string) {
    return this.competitions.getMatches(m.organizationId, competitionId);
  }
}
