import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { StringValue } from 'ms';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);
    return this.buildAuthResponse(user.id, user.email);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.validateCredentials(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.buildAuthResponse(user.id, user.email);
  }

  async loginWithGoogle(input: {
    googleId: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  }) {
    const user = await this.usersService.findOrCreateGoogleUser(input);
    return this.buildAuthResponse(user.id, user.email);
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isValid = await this.usersService.isValidRefreshToken(
      payload.sub,
      refreshToken,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.buildAuthResponse(payload.sub, payload.email);
  }

  async logout(userId: string) {
    await this.usersService.clearRefreshToken(userId);
    return { success: true };
  }

  private async buildAuthResponse(userId: string, email: string) {
    const payload: JwtPayload = { sub: userId, email };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<StringValue>(
        'JWT_ACCESS_EXPIRES_IN',
        '15m',
      ),
      jwtid: randomUUID(),
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<StringValue>(
        'JWT_REFRESH_EXPIRES_IN',
        '7d',
      ),
      jwtid: randomUUID(),
    });
    await this.usersService.setRefreshToken(userId, refreshToken);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: { id: userId, email },
    };
  }
}
