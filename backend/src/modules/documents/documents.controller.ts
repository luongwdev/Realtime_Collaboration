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
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @ApiOperation({ summary: 'Create document in workspace' })
  @ApiBody({ type: CreateDocumentDto })
  @ResponseMessage('Document created successfully')
  @Post('workspace/:workspaceId')
  create(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documentsService.create(workspaceId, user.id, dto);
  }

  @ApiOperation({ summary: 'List documents by workspace' })
  @ResponseMessage('Fetched documents successfully')
  @Get('workspace/:workspaceId')
  listByWorkspace(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.listByWorkspace(workspaceId, user.id);
  }

  @ApiOperation({ summary: 'Update document with optimistic locking' })
  @ApiBody({ type: UpdateDocumentDto })
  @ResponseMessage('Document updated successfully')
  @Patch(':documentId')
  update(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(documentId, user.id, dto);
  }

  @ApiOperation({ summary: 'List document versions' })
  @ResponseMessage('Fetched document versions successfully')
  @Get(':documentId/versions')
  listVersions(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.listVersions(documentId, user.id);
  }
}
