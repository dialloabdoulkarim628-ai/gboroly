import { Module } from '@nestjs/common';
import { RealtimeController } from './realtime.controller';
import { RealtimeService } from './realtime.service';
import { OutboxRelayService } from './outbox-relay.service';

@Module({
  controllers: [RealtimeController],
  providers: [RealtimeService, OutboxRelayService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
