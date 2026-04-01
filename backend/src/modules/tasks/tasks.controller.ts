import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @ApiOperation({ summary: 'Create task in workspace' })
  @ApiBody({ type: CreateTaskDto })
  @ResponseMessage('Task created successfully')
  @Post('workspace/:workspaceId')
  create(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(workspaceId, user.id, dto);
  }

  @ApiOperation({ summary: 'List tasks by workspace' })
  @ResponseMessage('Fetched tasks successfully')
  @Get('workspace/:workspaceId')
  listByWorkspace(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tasksService.listByWorkspace(workspaceId, user.id);
  }

  @ApiOperation({ summary: 'Update task' })
  @ApiBody({ type: UpdateTaskDto })
  @ResponseMessage('Task updated successfully')
  @Patch(':taskId')
  update(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(taskId, user.id, dto);
  }
}
