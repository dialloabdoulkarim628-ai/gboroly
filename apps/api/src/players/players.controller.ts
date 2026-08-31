import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CreatePlayerSchema,
  UpdatePlayerSchema,
  type CreatePlayerInput,
  type UpdatePlayerInput,
} from '@gboroly/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ActiveMembership, RequireMembership, RequirePermissions } from '../common/decorators';
import type { Membership } from '../rbac/rbac.service';
import { PlayersService } from './players.service';

@Controller('players')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @RequirePermissions('player.manage')
  @Post()
  create(
    @ActiveMembership() m: Membership,
    @Body(new ZodValidationPipe(CreatePlayerSchema)) body: CreatePlayerInput,
  ) {
    return this.players.create(m.organizationId, body);
  }

  @RequireMembership()
  @Get()
  list(@ActiveMembership() m: Membership) {
    return this.players.list(m.organizationId);
  }

  @RequireMembership()
  @Get(':id')
  get(@ActiveMembership() m: Membership, @Param('id') id: string) {
    return this.players.getById(m.organizationId, id);
  }

  @RequirePermissions('player.manage')
  @Patch(':id')
  update(
    @ActiveMembership() m: Membership,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePlayerSchema)) body: UpdatePlayerInput,
  ) {
    return this.players.update(m.organizationId, id, body);
  }

  @RequirePermissions('player.manage')
  @Delete(':id')
  remove(@ActiveMembership() m: Membership, @Param('id') id: string) {
    return this.players.remove(m.organizationId, id);
  }
}
