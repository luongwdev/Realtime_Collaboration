import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { TasksService } from '../tasks/tasks.service';
import { AiService } from './ai.service';
import { GenerateTaskFromChatDto } from './dto/generate-task-from-chat.dto';
import { SuggestReplyDto } from './dto/suggest-reply.dto';
import { SummarizeChatDto } from './dto/summarize-chat.dto';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
  ) {}

  @ApiOperation({ summary: 'Summarize recent chat messages' })
  @ApiBody({ type: SummarizeChatDto })
  @ResponseMessage('Chat summarized successfully')
  @Post('summarize-chat')
  async summarizeChat(@Body() dto: SummarizeChatDto, @CurrentUser() user: AuthUser) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: dto.channelId },
      select: { id: true, workspaceId: true },
    });
    if (!channel) {
      return this.aiService.summarize([]);
    }
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: channel.workspaceId,
          userId: user.id,
        },
      },
      select: { userId: true },
    });
    if (!membership) {
      return this.aiService.summarize([]);
    }
    const messages = await this.prisma.message.findMany({
      where: { channelId: channel.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { content: true },
    });
    return this.aiService.summarize(messages.map((m) => m.content));
  }

  @ApiOperation({ summary: 'Suggest a reply from message content' })
  @ApiBody({ type: SuggestReplyDto })
  @ResponseMessage('Reply suggestion generated successfully')
  @Post('suggest-reply')
  async suggestReply(@Body() dto: SuggestReplyDto) {
    return this.aiService.suggestReply(dto.message);
  }

  @ApiOperation({ summary: 'Generate a task from chat content' })
  @ApiBody({ type: GenerateTaskFromChatDto })
  @ResponseMessage('Task generated from chat successfully')
  @Post('generate-task-from-chat')
  async generateTaskFromChat(
    @Body() dto: GenerateTaskFromChatDto,
    @CurrentUser() user: AuthUser,
  ) {
    const generated = await this.aiService.generateTaskFromChat(dto.content);
    return this.tasksService.create(dto.workspaceId, user.id, generated);
  }
}
