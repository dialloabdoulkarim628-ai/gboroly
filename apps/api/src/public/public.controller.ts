import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../common/decorators';
import { PublicService } from './public.service';

/** API publique en lecture seule (tournois PUBLISHED + PUBLIC). Aucune authentification. */
@Public()
@Controller('public/tournaments')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get(':slug')
  tournament(@Param('slug') slug: string) {
    return this.publicService.getTournament(slug);
  }

  @Get(':slug/standings')
  standings(@Param('slug') slug: string) {
    return this.publicService.getStandings(slug);
  }

  @Get(':slug/matches')
  matches(
    @Param('slug') slug: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.publicService.getMatches(slug, { status, categoryId });
  }

  @Get(':slug/teams')
  teams(@Param('slug') slug: string) {
    return this.publicService.getTeams(slug);
  }

  @Get(':slug/bracket')
  bracket(@Param('slug') slug: string) {
    return this.publicService.getBracket(slug);
  }

  @Get(':slug/announcements')
  announcements(@Param('slug') slug: string) {
    return this.publicService.getAnnouncements(slug);
  }
}
