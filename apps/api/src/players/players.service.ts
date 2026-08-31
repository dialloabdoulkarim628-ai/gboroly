import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreatePlayerInput, UpdatePlayerInput } from '@gboroly/validation';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  create(orgId: string, input: CreatePlayerInput) {
    return this.prisma.player.create({ data: { organizationId: orgId, ...input } });
  }

  list(orgId: string) {
    return this.prisma.player.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(orgId: string, id: string) {
    return this.getScoped(orgId, id);
  }

  async update(orgId: string, id: string, input: UpdatePlayerInput) {
    await this.getScoped(orgId, id);
    return this.prisma.player.update({ where: { id }, data: input });
  }

  async remove(orgId: string, id: string) {
    await this.getScoped(orgId, id);
    await this.prisma.player.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  private async getScoped(orgId: string, id: string) {
    const player = await this.prisma.player.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!player) throw new NotFoundException({ error: { code: 'PLAYER_NOT_FOUND', message: 'Joueur introuvable' } });
    return player;
  }
}
