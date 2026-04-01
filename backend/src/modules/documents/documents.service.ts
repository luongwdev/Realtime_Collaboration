import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, WorkspaceRole } from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async create(workspaceId: string, actorId: string, dto: CreateDocumentDto) {
    await this.getWorkspaceRole(workspaceId, actorId);
    const document = await this.prisma.document.create({
      data: {
        workspaceId,
        title: dto.title,
        content: dto.content ?? '',
        updatedBy: actorId,
        versions: {
          create: {
            version: 1,
            content: dto.content ?? '',
            updatedBy: actorId,
          },
        },
      },
      select: this.docSelect(),
    });
    await this.activityLogsService.create({
      workspaceId,
      actorId,
      action: 'document.create',
      targetType: 'document',
      targetId: document.id,
      payload: { title: document.title, version: document.version },
    });
    return document;
  }

  async listByWorkspace(workspaceId: string, actorId: string) {
    await this.getWorkspaceRole(workspaceId, actorId);
    return this.prisma.document.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
      select: this.docSelect(),
    });
  }

  async update(documentId: string, actorId: string, dto: UpdateDocumentDto) {
    const existing = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        workspaceId: true,
        version: true,
      },
    });
    if (!existing) {
      throw new NotFoundException('Document not found');
    }
    const role = await this.getWorkspaceRole(existing.workspaceId, actorId);
    if (
      role !== WorkspaceRole.OWNER &&
      role !== WorkspaceRole.ADMIN &&
      role !== WorkspaceRole.MEMBER
    ) {
      throw new ForbiddenException('Access denied to workspace');
    }

    if (dto.version !== existing.version) {
      throw new ConflictException(
        `Version conflict: current version is ${existing.version}`,
      );
    }

    const nextVersion = existing.version + 1;
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        content: dto.content,
        version: nextVersion,
        updatedBy: actorId,
        versions: {
          create: {
            version: nextVersion,
            content: dto.content,
            updatedBy: actorId,
          },
        },
      },
      select: this.docSelect(),
    });

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: existing.workspaceId, NOT: { userId: actorId } },
      select: { userId: true },
    });
    await Promise.all(
      members.map((m) =>
        this.notificationsService.create({
          workspaceId: existing.workspaceId,
          userId: m.userId,
          type: NotificationType.DOCUMENT_UPDATED,
          payload: { documentId, version: nextVersion },
        }),
      ),
    );

    await this.activityLogsService.create({
      workspaceId: existing.workspaceId,
      actorId,
      action: 'document.update',
      targetType: 'document',
      targetId: documentId,
      payload: { version: nextVersion },
    });
    return updated;
  }

  async listVersions(documentId: string, actorId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, workspaceId: true },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    await this.getWorkspaceRole(document.workspaceId, actorId);
    return this.prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        updatedBy: true,
        createdAt: true,
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

  private docSelect() {
    return {
      id: true,
      workspaceId: true,
      title: true,
      content: true,
      version: true,
      updatedBy: true,
      createdAt: true,
      updatedAt: true,
    };
  }
}
