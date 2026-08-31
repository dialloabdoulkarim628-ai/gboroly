import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  AcceptInvitationSchema,
  CreateOrganizationSchema,
  InviteMemberSchema,
  UpdateMemberRoleSchema,
  UpdateOrganizationSchema,
  type AcceptInvitationInput,
  type CreateOrganizationInput,
  type InviteMemberInput,
  type UpdateMemberRoleInput,
  type UpdateOrganizationInput,
} from '@gboroly/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  CurrentUser,
  RequireMembership,
  RequirePermissions,
  type AuthUser,
} from '../common/decorators';
import { OrganizationsService } from './organizations.service';

@Controller()
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  // Toute personne authentifiée peut créer une organisation (elle en devient OWNER).
  @Post('organizations')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateOrganizationSchema)) body: CreateOrganizationInput,
  ) {
    return this.orgs.create(user.id, body);
  }

  @Get('organizations/mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.orgs.listMine(user.id);
  }

  @RequireMembership()
  @Get('organizations/:orgId')
  get(@Param('orgId') orgId: string) {
    return this.orgs.getById(orgId);
  }

  @RequirePermissions('organization.manage')
  @Patch('organizations/:orgId')
  update(
    @Param('orgId') orgId: string,
    @Body(new ZodValidationPipe(UpdateOrganizationSchema)) body: UpdateOrganizationInput,
  ) {
    return this.orgs.update(orgId, body);
  }

  // ─────────────── Membres ───────────────

  @RequireMembership()
  @Get('organizations/:orgId/members')
  members(@Param('orgId') orgId: string) {
    return this.orgs.listMembers(orgId);
  }

  @RequirePermissions('member.manage')
  @Patch('organizations/:orgId/members/:memberId')
  updateMemberRole(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(UpdateMemberRoleSchema)) body: UpdateMemberRoleInput,
  ) {
    return this.orgs.updateMemberRole(orgId, memberId, body);
  }

  @RequirePermissions('member.manage')
  @Delete('organizations/:orgId/members/:memberId')
  removeMember(@Param('orgId') orgId: string, @Param('memberId') memberId: string) {
    return this.orgs.removeMember(orgId, memberId);
  }

  // ─────────────── Invitations ───────────────

  @RequirePermissions('member.invite')
  @Post('organizations/:orgId/invitations')
  invite(
    @CurrentUser() user: AuthUser,
    @Param('orgId') orgId: string,
    @Body(new ZodValidationPipe(InviteMemberSchema)) body: InviteMemberInput,
  ) {
    return this.orgs.invite(orgId, body, user.id);
  }

  @RequirePermissions('member.manage')
  @Get('organizations/:orgId/invitations')
  invitations(@Param('orgId') orgId: string) {
    return this.orgs.listInvitations(orgId);
  }

  @RequirePermissions('member.manage')
  @Delete('organizations/:orgId/invitations/:invitationId')
  revokeInvitation(
    @Param('orgId') orgId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.orgs.revokeInvitation(orgId, invitationId);
  }

  // Accepter une invitation : tout utilisateur authentifié avec un token valide.
  @Post('invitations/accept')
  accept(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(AcceptInvitationSchema)) body: AcceptInvitationInput,
  ) {
    return this.orgs.acceptInvitation(user.id, body.token);
  }
}
