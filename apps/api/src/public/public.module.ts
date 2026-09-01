import { Module } from '@nestjs/common';
import { StatsModule } from '../stats/stats.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [StatsModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
