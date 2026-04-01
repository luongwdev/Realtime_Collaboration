import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @ApiOperation({ summary: 'Register a new account' })
  @ApiBody({ type: RegisterDto })
  @ResponseMessage('Register successfully')
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @ApiOperation({ summary: 'Sign in and issue token pair' })
  @ApiBody({ type: LoginDto })
  @ResponseMessage('Login successfully')
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Public()
  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiBody({ type: RefreshTokenDto })
  @ResponseMessage('Refresh token successfully')
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sign out and invalidate refresh token' })
  @ResponseMessage('Logout successfully')
  @Post('logout')
  logout(@CurrentUser() user: AuthUser) {
    return this.authService.logout(user.id);
  }

  @Public()
  @ApiOperation({ summary: 'Login with Google OAuth2' })
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin() {
    return { ok: true };
  }

  @Public()
  @ApiOperation({ summary: 'Google OAuth callback' })
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(
    @Req()
    req: Request & {
      user: {
        googleId: string;
        email: string;
        fullName: string;
        avatarUrl?: string;
      };
    },
    @Res() res: Response,
  ) {
    const auth = await this.authService.loginWithGoogle(req.user);
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3456',
    );
    const redirect = `${frontendUrl}/auth/google/callback?access_token=${encodeURIComponent(
      auth.access_token,
    )}&refresh_token=${encodeURIComponent(auth.refresh_token)}`;
    return res.redirect(302, redirect);
  }
}
