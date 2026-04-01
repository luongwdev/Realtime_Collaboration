import { Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'Get notifications of current user' })
  @ResponseMessage('Fetched notifications successfully')
  @Get()
  listMine(@CurrentUser() user: AuthUser) {
    return this.notificationsService.listMine(user.id);
  }

  @ApiOperation({ summary: 'Mark notification as read' })
  @ResponseMessage('Notification marked as read')
  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.markRead(user.id, id);
  }
}
