import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { WorkspaceRole } from '@prisma/client';

export class JoinWorkspaceDto {
  @ApiPropertyOptional({ enum: WorkspaceRole, default: WorkspaceRole.MEMBER })
  @IsOptional()
  @IsEnum(WorkspaceRole)
  role?: WorkspaceRole;
}
