import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '@prisma/client';
import { WORKSPACE_ROLES_KEY } from '../../../common/decorators/workspace-roles.decorator';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      WORKSPACE_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: { id: string };
      params: { id?: string; workspaceId?: string };
    }>();
    const userId = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const workspaceId = request.params.id ?? request.params.workspaceId;
    if (!workspaceId) {
      throw new ForbiddenException('Workspace id is required');
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });
    if (!member || !requiredRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient workspace permission');
    }
    return true;
  }
}
