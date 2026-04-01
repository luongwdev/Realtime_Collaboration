import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    userId: string;
    type: NotificationType;
    payload: Prisma.InputJsonValue;
    workspaceId?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        payload: input.payload,
        workspaceId: input.workspaceId,
      },
      select: {
        id: true,
        userId: true,
        type: true,
        payload: true,
        workspaceId: true,
        isRead: true,
        createdAt: true,
      },
    });
  }

  async listMine(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        type: true,
        payload: true,
        workspaceId: true,
        isRead: true,
        createdAt: true,
      },
    });
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    return { id, isRead: true };
  }
}
