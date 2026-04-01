import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from '../auth/dto/register.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: RegisterDto) {
    const { email, password, fullName, displayName, timezone, avatarUrl } =
      input;
    const normalized = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    return this.prisma.user.create({
      data: {
        email: normalized,
        fullName: fullName.trim(),
        displayName: displayName.trim(),
        timezone: timezone?.trim(),
        avatarUrl: avatarUrl?.trim(),
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        displayName: true,
        timezone: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
      },
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  async findOrCreateGoogleUser(input: {
    googleId: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  }): Promise<{ id: string; email: string }> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const byGoogle = await this.prisma.user.findUnique({
      where: { googleId: input.googleId },
      select: { id: true, email: true },
    });
    if (byGoogle) {
      return byGoogle;
    }

    const byEmail = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });
    if (byEmail) {
      await this.prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: input.googleId,
          fullName: input.fullName,
          avatarUrl: input.avatarUrl,
        },
      });
      return byEmail;
    }

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        googleId: input.googleId,
        fullName: input.fullName,
        displayName: input.fullName.split(' ')[0] || 'google-user',
        avatarUrl: input.avatarUrl,
        passwordHash: '',
      },
      select: { id: true, email: true },
    });
    return user;
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<{ id: string; email: string } | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return null;
    }
    return { id: user.id, email: user.email };
  }

  async getByIdOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        displayName: true,
        timezone: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  getPublicProfile(id: string) {
    return this.getByIdOrThrow(id);
  }

  async setRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  async isValidRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { refreshTokenHash: true },
    });
    if (!user?.refreshTokenHash) {
      return false;
    }
    return bcrypt.compare(refreshToken, user.refreshTokenHash);
  }
}
