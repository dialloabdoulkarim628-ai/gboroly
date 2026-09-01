import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  DiscoverQuerySchema,
  PublicRegisterSchema,
  type PublicRegisterInput,
} from '@gboroly/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Public } from '../common/decorators';
import { MarketplaceService } from './marketplace.service';

/** Marketplace publique : découverte de tournois + inscription d'équipes externes. */
@Public()
@Controller('public')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get('discover')
  discover(@Query() query: Record<string, string>) {
    return this.marketplace.discover(DiscoverQuerySchema.parse(query));
  }

  @Post('tournaments/:slug/register')
  register(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(PublicRegisterSchema)) body: PublicRegisterInput,
  ) {
    return this.marketplace.register(slug, body);
  }
}
