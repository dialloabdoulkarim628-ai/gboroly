import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { CommunicationsController } from './communications.controller';
import { NotificationsService } from './notifications.service';
import { CommunicationsService } from './communications.service';

@Module({
  controllers: [NotificationsController, CommunicationsController],
  providers: [NotificationsService, CommunicationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
