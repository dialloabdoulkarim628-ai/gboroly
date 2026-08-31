import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  AddRosterPlayerSchema,
  CreateTeamSchema,
  SetTeamStatusSchema,
  UpdateRosterPlayerSchema,
  UpdateTeamSchema,
  type AddRosterPlayerInput,
  type CreateTeamInput,
  type SetTeamStatusInput,
  type UpdateRosterPlayerInput,
  type UpdateTeamInput,
} from '@gboroly/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ActiveMembership, RequireMembership, RequirePermissions } from '../common/decorators';
import type { Membership } from '../rbac/rbac.service';
import { TeamsService } from './teams.service';

@Controller()
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @RequirePermissions('team.manage')
  @Post('teams')
  create(
    @ActiveMembership() m: Membership,
    @Body(new ZodValidationPipe(CreateTeamSchema)) body: CreateTeamInput,
  ) {
    return this.teams.create(m.organizationId, body);
  }

  @RequireMembership()
  @Get('teams')
  list(@ActiveMembership() m: Membership) {
    return this.teams.list(m.organizationId);
  }

  @RequireMembership()
  @Get('teams/:id')
  get(@ActiveMembership() m: Membership, @Param('id') id: string) {
    return this.teams.getById(m.organizationId, id);
  }

  @RequirePermissions('team.manage')
  @Patch('teams/:id')
  update(
    @ActiveMembership() m: Membership,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTeamSchema)) body: UpdateTeamInput,
  ) {
    return this.teams.update(m.organizationId, id, body);
  }

  @RequirePermissions('team.manage')
  @Patch('teams/:id/status')
  setStatus(
    @ActiveMembership() m: Membership,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SetTeamStatusSchema)) body: SetTeamStatusInput,
  ) {
    return this.teams.setStatus(m.organizationId, id, body);
  }

  @RequirePermissions('team.manage')
  @Delete('teams/:id')
  remove(@ActiveMembership() m: Membership, @Param('id') id: string) {
    return this.teams.remove(m.organizationId, id);
  }

  // ─────────────── Roster ───────────────

  @RequirePermissions('team.manage')
  @Post('teams/:id/players')
  addPlayer(
    @ActiveMembership() m: Membership,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AddRosterPlayerSchema)) body: AddRosterPlayerInput,
  ) {
    return this.teams.addPlayer(m.organizationId, id, body);
  }

  @RequireMembership()
  @Get('teams/:id/players')
  roster(@ActiveMembership() m: Membership, @Param('id') id: string) {
    return this.teams.listRoster(m.organizationId, id);
  }

  @RequirePermissions('team.manage')
  @Patch('team-players/:tpId')
  updateRoster(
    @ActiveMembership() m: Membership,
    @Param('tpId') tpId: string,
    @Body(new ZodValidationPipe(UpdateRosterPlayerSchema)) body: UpdateRosterPlayerInput,
  ) {
    return this.teams.updateRosterPlayer(m.organizationId, tpId, body);
  }

  @RequirePermissions('team.manage')
  @Delete('team-players/:tpId')
  removeRoster(@ActiveMembership() m: Membership, @Param('tpId') tpId: string) {
    return this.teams.removeRosterPlayer(m.organizationId, tpId);
  }
}
