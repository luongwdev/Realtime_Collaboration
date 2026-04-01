import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChannelType, WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, userId: string, name: string, type?: ChannelType) {
    const role = await this.getWorkspaceRole(workspaceId, userId);
    if (role !== WorkspaceRole.OWNER && role !== WorkspaceRole.ADMIN) {
      throw new ForbiddenException('Only workspace owner/admin can create channels');
    }
    return this.prisma.channel.create({
      data: {
        workspaceId,
        name,
        type: type ?? ChannelType.GENERAL,
      },
      select: this.channelSelect(),
    });
  }

  async list(workspaceId: string, userId: string) {
    await this.getWorkspaceRole(workspaceId, userId);
    return this.prisma.channel.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
      select: this.channelSelect(),
    });
  }

  async listMessages(channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, workspaceId: true },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    await this.getWorkspaceRole(channel.workspaceId, userId);
    return this.prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        content: true,
        senderId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
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

  private channelSelect() {
    return {
      id: true,
      workspaceId: true,
      name: true,
      type: true,
      createdAt: true,
      updatedAt: true,
    };
  }
}
