import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [JwtModule, NotificationsModule, ActivityLogsModule],
  providers: [ChatGateway],
})
export class ChatModule {}
