import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CreateCategorySchema,
  CreateTournamentSchema,
  SetVisibilitySchema,
  UpdateCategorySchema,
  UpdateTournamentSchema,
  type CreateCategoryInput,
  type CreateTournamentInput,
  type SetVisibilityInput,
  type UpdateCategoryInput,
  type UpdateTournamentInput,
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
import { TournamentsService } from './tournaments.service';

@Controller()
export class TournamentsController {
  constructor(private readonly tournaments: TournamentsService) {}

  // ─────────────── Tournois (org active via X-Organization-Id) ───────────────

  @RequirePermissions('tournament.create')
  @Post('tournaments')
  create(
    @ActiveMembership() m: Membership,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateTournamentSchema)) body: CreateTournamentInput,
  ) {
    return this.tournaments.create(m.organizationId, user.id, body);
  }

  @RequireMembership()
  @Get('tournaments')
  list(@ActiveMembership() m: Membership) {
    return this.tournaments.list(m.organizationId);
  }

  @RequireMembership()
  @Get('tournaments/:id')
  get(@ActiveMembership() m: Membership, @Param('id') id: string) {
    return this.tournaments.getById(m.organizationId, id);
  }

  @RequirePermissions('tournament.update')
  @Patch('tournaments/:id')
  update(
    @ActiveMembership() m: Membership,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTournamentSchema)) body: UpdateTournamentInput,
  ) {
    return this.tournaments.update(m.organizationId, id, body);
  }

  @RequirePermissions('tournament.update')
  @Patch('tournaments/:id/visibility')
  setVisibility(
    @ActiveMembership() m: Membership,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SetVisibilitySchema)) body: SetVisibilityInput,
  ) {
    return this.tournaments.setVisibility(m.organizationId, id, body.visibility);
  }

  @RequireMembership()
  @Get('tournaments/:id/checklist')
  checklist(@ActiveMembership() m: Membership, @Param('id') id: string) {
    return this.tournaments.getChecklist(m.organizationId, id);
  }

  @RequirePermissions('tournament.publish')
  @Post('tournaments/:id/publish')
  publish(@ActiveMembership() m: Membership, @Param('id') id: string) {
    return this.tournaments.publish(m.organizationId, id);
  }

  @RequirePermissions('tournament.update')
  @Post('tournaments/:id/cancel')
  cancel(@ActiveMembership() m: Membership, @Param('id') id: string) {
    return this.tournaments.cancel(m.organizationId, id);
  }

  @RequirePermissions('tournament.duplicate')
  @Post('tournaments/:id/duplicate')
  duplicate(
    @ActiveMembership() m: Membership,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.tournaments.duplicate(m.organizationId, user.id, id);
  }

  @RequirePermissions('tournament.delete')
  @Delete('tournaments/:id')
  remove(@ActiveMembership() m: Membership, @Param('id') id: string) {
    return this.tournaments.remove(m.organizationId, id);
  }

  // ─────────────── Catégories ───────────────

  @RequirePermissions('category.manage')
  @Post('tournaments/:id/categories')
  createCategory(
    @ActiveMembership() m: Membership,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateCategorySchema)) body: CreateCategoryInput,
  ) {
    return this.tournaments.createCategory(m.organizationId, id, body);
  }

  @RequireMembership()
  @Get('tournaments/:id/categories')
  listCategories(@ActiveMembership() m: Membership, @Param('id') id: string) {
    return this.tournaments.listCategories(m.organizationId, id);
  }

  @RequirePermissions('category.manage')
  @Patch('categories/:categoryId')
  updateCategory(
    @ActiveMembership() m: Membership,
    @Param('categoryId') categoryId: string,
    @Body(new ZodValidationPipe(UpdateCategorySchema)) body: UpdateCategoryInput,
  ) {
    return this.tournaments.updateCategory(m.organizationId, categoryId, body);
  }

  @RequirePermissions('category.manage')
  @Delete('categories/:categoryId')
  removeCategory(
    @ActiveMembership() m: Membership,
    @Param('categoryId') categoryId: string,
  ) {
    return this.tournaments.removeCategory(m.organizationId, categoryId);
  }
}
