import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, TaskStatus, WorkspaceRole } from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async create(workspaceId: string, actorId: string, dto: CreateTaskDto) {
    const actorRole = await this.getWorkspaceRole(workspaceId, actorId);
    if (dto.assigneeId) {
      await this.getWorkspaceRole(workspaceId, dto.assigneeId);
      if (
        actorRole === WorkspaceRole.MEMBER &&
        dto.assigneeId !== actorId
      ) {
        throw new ForbiddenException('Members can only assign tasks to themselves');
      }
    }

    const task = await this.prisma.task.create({
      data: {
        workspaceId,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assigneeId: dto.assigneeId,
        reporterId: actorId,
        status: TaskStatus.TODO,
      },
      select: this.taskSelect(),
    });

    if (task.assigneeId && task.assigneeId !== actorId) {
      await this.notificationsService.create({
        workspaceId,
        userId: task.assigneeId,
        type: NotificationType.TASK_ASSIGNED,
        payload: { taskId: task.id, title: task.title },
      });
    }

    await this.activityLogsService.create({
      workspaceId,
      actorId,
      action: 'task.create',
      targetType: 'task',
      targetId: task.id,
      payload: { title: task.title },
    });

    return task;
  }

  async listByWorkspace(workspaceId: string, actorId: string) {
    await this.getWorkspaceRole(workspaceId, actorId);
    return this.prisma.task.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: this.taskSelect(),
    });
  }

  async update(taskId: string, actorId: string, dto: UpdateTaskDto) {
    const existing = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        workspaceId: true,
        assigneeId: true,
        reporterId: true,
        title: true,
        description: true,
        dueDate: true,
      },
    });
    if (!existing) {
      throw new NotFoundException('Task not found');
    }
    const actorRole = await this.getWorkspaceRole(existing.workspaceId, actorId);
    const isOwnerOrAdmin =
      actorRole === WorkspaceRole.OWNER || actorRole === WorkspaceRole.ADMIN;
    const isReporter = existing.reporterId === actorId;
    const isAssignee = existing.assigneeId === actorId;

    if (dto.assigneeId) {
      await this.getWorkspaceRole(existing.workspaceId, dto.assigneeId);
    }

    if (!isOwnerOrAdmin) {
      const changingAssignee =
        dto.assigneeId !== undefined && dto.assigneeId !== existing.assigneeId;
      const changingTaskMeta =
        dto.title !== undefined ||
        dto.description !== undefined ||
        dto.dueDate !== undefined;

      if (changingAssignee && !isReporter) {
        throw new ForbiddenException(
          'Only task reporter or workspace admin can change assignee',
        );
      }

      if (changingTaskMeta && !isReporter) {
        throw new ForbiddenException(
          'Only task reporter or workspace admin can edit task details',
        );
      }

      if (dto.status !== undefined && !isReporter && !isAssignee) {
        throw new ForbiddenException(
          'Only task assignee/reporter or workspace admin can change task status',
        );
      }

      if (changingAssignee && dto.assigneeId && dto.assigneeId !== actorId) {
        throw new ForbiddenException(
          'Members can only assign tasks to themselves',
        );
      }
    }

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        assigneeId: dto.assigneeId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      select: this.taskSelect(),
    });

    if (dto.assigneeId && dto.assigneeId !== actorId) {
      await this.notificationsService.create({
        workspaceId: existing.workspaceId,
        userId: dto.assigneeId,
        type: NotificationType.TASK_ASSIGNED,
        payload: { taskId: task.id, title: task.title },
      });
    }

    await this.activityLogsService.create({
      workspaceId: existing.workspaceId,
      actorId,
      action: 'task.update',
      targetType: 'task',
      targetId: task.id,
      payload: { status: task.status, assigneeId: task.assigneeId },
    });
    return task;
  }

  private async getWorkspaceRole(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });
    if (!member) {
      throw new ForbiddenException('Access denied to workspace');
    }
    return member.role;
  }

  private taskSelect() {
    return {
      id: true,
      workspaceId: true,
      title: true,
      description: true,
      status: true,
      assigneeId: true,
      reporterId: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
    };
  }
}
