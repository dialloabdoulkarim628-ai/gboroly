import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import {
  ImportConfirmSchema,
  ImportPreviewSchema,
  type ImportConfirmInput,
  type ImportPreviewInput,
} from '@gboroly/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ActiveMembership, RequirePermissions } from '../common/decorators';
import type { Membership } from '../rbac/rbac.service';
import { DataService } from './data.service';

@Controller()
export class DataController {
  constructor(private readonly data: DataService) {}

  @RequirePermissions('team.manage')
  @Post('tournaments/:id/import/teams/preview')
  preview(
    @ActiveMembership() m: Membership,
    @Param('id') tournamentId: string,
    @Body(new ZodValidationPipe(ImportPreviewSchema)) body: ImportPreviewInput,
  ) {
    return this.data.importTeamsPreview(m.organizationId, tournamentId, body.csv);
  }

  @RequirePermissions('team.manage')
  @Post('tournaments/:id/import/teams/confirm')
  confirm(
    @ActiveMembership() m: Membership,
    @Param('id') tournamentId: string,
    @Body(new ZodValidationPipe(ImportConfirmSchema)) body: ImportConfirmInput,
  ) {
    return this.data.importTeamsConfirm(m.organizationId, tournamentId, body);
  }

  @RequirePermissions('export.run')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="equipes.csv"')
  @Get('tournaments/:id/export/teams.csv')
  exportTeams(@ActiveMembership() m: Membership, @Param('id') tournamentId: string) {
    return this.data.exportTeams(m.organizationId, tournamentId);
  }

  @RequirePermissions('export.run')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="classement.csv"')
  @Get('competitions/:id/export/standings.csv')
  exportStandings(@ActiveMembership() m: Membership, @Param('id') competitionId: string) {
    return this.data.exportStandings(m.organizationId, competitionId);
  }
}
