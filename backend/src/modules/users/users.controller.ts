import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Current user (JWT). */
  @ApiOperation({ summary: 'Get current user profile' })
  @ResponseMessage('Fetched current user profile successfully')
  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.getPublicProfile(user.id);
  }
}
