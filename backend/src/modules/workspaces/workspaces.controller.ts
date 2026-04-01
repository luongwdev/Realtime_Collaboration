import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { WorkspaceRoles } from '../../common/decorators/workspace-roles.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { JoinWorkspaceDto } from './dto/join-workspace.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspaceRoleGuard } from './guards/workspace-role.guard';
import { WorkspacesService } from './workspaces.service';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';

@ApiTags('workspaces')
@ApiBearerAuth()
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiBody({ type: CreateWorkspaceDto })
  @ResponseMessage('Workspace created successfully')
  @Post()
  create(@Body() dto: CreateWorkspaceDto, @CurrentUser() user: AuthUser) {
    return this.workspacesService.create(dto.name, user.id);
  }

  @ApiOperation({ summary: 'Get workspaces of current user' })
  @ResponseMessage('Fetched workspaces successfully')
  @Get()
  listMine(@CurrentUser() user: AuthUser) {
    return this.workspacesService.listMine(user.id);
  }

  @ApiOperation({ summary: 'Join a workspace' })
  @ApiBody({ type: JoinWorkspaceDto })
  @ResponseMessage('Joined workspace successfully')
  @Post(':id/join')
  join(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: JoinWorkspaceDto,
  ) {
    return this.workspacesService.join(id, user.id, dto.role);
  }

  @ApiOperation({ summary: 'Get workspace members' })
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER)
  @ResponseMessage('Fetched workspace members successfully')
  @Get(':id/members')
  listMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.workspacesService.listMembers(id);
  }

  @ApiOperation({ summary: 'Update workspace member role' })
  @ApiBody({ type: UpdateMemberRoleDto })
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ResponseMessage('Updated member role successfully')
  @Patch(':id/members/:memberId/role')
  updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.workspacesService.updateMemberRole(id, user.id, memberId, dto.role);
  }

  @ApiOperation({ summary: 'Transfer workspace ownership' })
  @ApiBody({ type: TransferOwnershipDto })
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  @ResponseMessage('Transferred workspace ownership successfully')
  @Post(':id/transfer-ownership')
  transferOwnership(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: TransferOwnershipDto,
  ) {
    return this.workspacesService.transferOwnership(id, user.id, dto.targetUserId);
  }
}
