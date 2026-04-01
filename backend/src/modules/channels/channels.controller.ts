import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreateChannelDto } from './dto/create-channel.dto';
import { ChannelsService } from './channels.service';

@ApiTags('channels')
@ApiBearerAuth()
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @ApiOperation({ summary: 'Create a channel in workspace' })
  @ApiBody({ type: CreateChannelDto })
  @ResponseMessage('Channel created successfully')
  @Post('workspace/:workspaceId')
  create(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateChannelDto,
  ) {
    return this.channelsService.create(workspaceId, user.id, dto.name, dto.type);
  }

  @ApiOperation({ summary: 'List channels in workspace' })
  @ResponseMessage('Fetched channels successfully')
  @Get('workspace/:workspaceId')
  list(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.channelsService.list(workspaceId, user.id);
  }

  @ApiOperation({ summary: 'List recent messages in channel' })
  @ResponseMessage('Fetched messages successfully')
  @Get(':channelId/messages')
  listMessages(
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.channelsService.listMessages(channelId, user.id);
  }
}
