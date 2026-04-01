import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActivityLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    workspaceId: string;
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    payload?: Prisma.InputJsonValue;
  }) {
    return this.prisma.activityLog.create({
      data: {
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        payload: input.payload,
      },
    });
  }

  async listByWorkspace(workspaceId: string) {
    return this.prisma.activityLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        actorId: true,
        action: true,
        targetType: true,
        targetId: true,
        payload: true,
        createdAt: true,
      },
    });
  }
}
