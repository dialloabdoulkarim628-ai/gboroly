import { Module } from '@nestjs/common';
import { SchedulingController } from './scheduling.controller';
import { VenuesService } from './venues.service';
import { SchedulingService } from './scheduling.service';

@Module({
  controllers: [SchedulingController],
  providers: [VenuesService, SchedulingService],
  exports: [VenuesService, SchedulingService],
})
export class SchedulingModule {}
