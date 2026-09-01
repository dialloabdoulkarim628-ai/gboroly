import { Module } from '@nestjs/common';
import { CompetitionsController } from '../competitions/competitions.controller';
import { CompetitionsService } from '../competitions/competitions.service';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

@Module({
  controllers: [CompetitionsController, MatchesController],
  providers: [CompetitionsService, MatchesService],
  exports: [CompetitionsService, MatchesService],
})
export class MatchesModule {}
