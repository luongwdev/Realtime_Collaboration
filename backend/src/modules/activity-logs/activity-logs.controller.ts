import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { ActivityLogsService } from './activity-logs.service';

@ApiTags('activity-logs')
@ApiBearerAuth()
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @ApiOperation({ summary: 'Get activity logs by workspace' })
  @ResponseMessage('Fetched activity logs successfully')
  @Get('workspace/:workspaceId')
  listByWorkspace(@Param('workspaceId', ParseUUIDPipe) workspaceId: string) {
    return this.activityLogsService.listByWorkspace(workspaceId);
  }
}
