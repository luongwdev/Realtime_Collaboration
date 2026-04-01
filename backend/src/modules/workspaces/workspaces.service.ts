import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChannelType, WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(name: string, ownerId: string) {
    return this.prisma.workspace.create({
      data: {
        name,
        ownerId,
        channels: {
          create: {
            name: 'general',
            type: ChannelType.GENERAL,
          },
        },
        memberships: {
          create: {
            userId: ownerId,
            role: WorkspaceRole.OWNER,
          },
        },
      },
      select: this.workspaceSelect(),
    });
  }

  async listMine(userId: string) {
    return this.prisma.workspace.findMany({
      where: { memberships: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
      select: this.workspaceSelect(),
    });
  }

  async join(
    workspaceId: string,
    userId: string,
    role?: WorkspaceRole,
  ) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    await this.prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId } },
      create: { workspaceId, userId, role: role ?? WorkspaceRole.MEMBER },
      update: {},
    });
    return { workspaceId, joined: true };
  }

  async listMembers(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async updateMemberRole(
    workspaceId: string,
    actorId: string,
    targetUserId: string,
    nextRole: WorkspaceRole,
  ) {
    const actor = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: actorId } },
      select: { role: true },
    });
    if (!actor) {
      throw new ForbiddenException('Access denied to workspace');
    }

    const target = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      select: { role: true },
    });
    if (!target) {
      throw new NotFoundException('Target member not found in workspace');
    }

    if (actor.role === WorkspaceRole.ADMIN) {
      if (nextRole === WorkspaceRole.OWNER) {
        throw new ForbiddenException('Admin cannot promote member to owner');
      }
      if (target.role === WorkspaceRole.OWNER) {
        throw new ForbiddenException('Admin cannot change owner role');
      }
    }

    if (actor.role === WorkspaceRole.MEMBER) {
      throw new ForbiddenException('Member cannot update roles');
    }

    const updated = await this.prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      data: { role: nextRole },
      select: { role: true, joinedAt: true, userId: true },
    });
    return { workspaceId, userId: updated.userId, role: updated.role };
  }

  async transferOwnership(workspaceId: string, ownerId: string, targetUserId: string) {
    const ownerMembership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: ownerId } },
      select: { role: true },
    });
    if (!ownerMembership || ownerMembership.role !== WorkspaceRole.OWNER) {
      throw new ForbiddenException('Only workspace owner can transfer ownership');
    }

    const targetMembership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      select: { role: true },
    });
    if (!targetMembership) {
      throw new NotFoundException('Target member not found in workspace');
    }

    await this.prisma.$transaction([
      this.prisma.workspace.update({
        where: { id: workspaceId },
        data: { ownerId: targetUserId },
      }),
      this.prisma.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
        data: { role: WorkspaceRole.OWNER },
      }),
      this.prisma.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId: ownerId } },
        data: { role: WorkspaceRole.ADMIN },
      }),
    ]);

    return { workspaceId, ownerId: targetUserId };
  }

  private workspaceSelect() {
    return {
      id: true,
      name: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
    };
  }
}
