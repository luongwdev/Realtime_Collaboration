import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

type SocketUser = { id: string; email: string };

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  afterInit(): void {
    // no-op
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<SocketUser & { sub: string }>(
        token,
        {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        },
      );
      client.data.user = { id: payload.sub, email: payload.email };
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('workspace.join')
  async joinWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { workspaceId: string },
  ) {
    const user = client.data.user as SocketUser | undefined;
    if (!user?.id || !body?.workspaceId) {
      return { ok: false, message: 'Invalid join payload' };
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: body.workspaceId,
          userId: user.id,
        },
      },
      select: { workspaceId: true },
    });
    if (!membership) {
      return { ok: false, message: 'Access denied to workspace' };
    }

    await client.join(`workspace:${body.workspaceId}`);
    return { ok: true, message: 'Joined workspace room' };
  }

  @SubscribeMessage('channel.join')
  async joinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { channelId: string },
  ) {
    const user = client.data.user as SocketUser | undefined;
    if (!user?.id || !body?.channelId) {
      return { ok: false, message: 'Invalid join payload' };
    }

    const channel = await this.prisma.channel.findUnique({
      where: { id: body.channelId },
      select: { id: true, workspaceId: true },
    });
    if (!channel) {
      return { ok: false, message: 'Channel not found' };
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: channel.workspaceId,
          userId: user.id,
        },
      },
      select: { workspaceId: true },
    });
    if (!membership) {
      return { ok: false, message: 'Access denied to workspace' };
    }

    await client.join(`channel:${body.channelId}`);
    return { ok: true, message: 'Joined channel room' };
  }

  @SubscribeMessage('channel.message')
  async sendChannelMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { channelId: string; content: string },
  ) {
    const user = client.data.user as SocketUser | undefined;
    if (!user?.id || !body?.channelId || !body?.content?.trim()) {
      return { ok: false, message: 'Invalid message payload' };
    }

    const channel = await this.prisma.channel.findUnique({
      where: { id: body.channelId },
      select: { id: true, workspaceId: true },
    });
    if (!channel) {
      return { ok: false, message: 'Channel not found' };
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: channel.workspaceId,
          userId: user.id,
        },
      },
      select: { workspaceId: true },
    });
    if (!membership) {
      return { ok: false, message: 'Access denied to workspace' };
    }

    const message = await this.prisma.message.create({
      data: {
        workspaceId: channel.workspaceId,
        channelId: channel.id,
        senderId: user.id,
        content: body.content.trim(),
      },
      select: {
        id: true,
        workspaceId: true,
        channelId: true,
        senderId: true,
        content: true,
        createdAt: true,
      },
    });

    const event = {
      ...message,
      senderEmail: user.email,
      sentAt: message.createdAt.toISOString(),
    };
    this.server.to(`channel:${channel.id}`).emit('channel.message', event);

    const members = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId: channel.workspaceId,
        NOT: { userId: user.id },
      },
      select: { userId: true },
    });
    await Promise.all(
      members.map((m) =>
        this.notificationsService.create({
          workspaceId: channel.workspaceId,
          userId: m.userId,
          type: NotificationType.NEW_MESSAGE,
          payload: {
            channelId: channel.id,
            messageId: message.id,
            senderId: user.id,
          },
        }),
      ),
    );
    await this.activityLogsService.create({
      workspaceId: channel.workspaceId,
      actorId: user.id,
      action: 'message.send',
      targetType: 'message',
      targetId: message.id,
      payload: { channelId: channel.id },
    });
    return { ok: true, messageId: message.id };
  }

  @SubscribeMessage('channel.typing')
  async typing(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { channelId: string; isTyping: boolean },
  ) {
    const user = client.data.user as SocketUser | undefined;
    if (!user?.id || !body?.channelId) {
      return { ok: false, message: 'Invalid typing payload' };
    }
    this.server.to(`channel:${body.channelId}`).emit('channel.typing', {
      channelId: body.channelId,
      userId: user.id,
      isTyping: !!body.isTyping,
      at: new Date().toISOString(),
    });
    return { ok: true };
  }

  @SubscribeMessage('message.delivered')
  async markDelivered(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { messageId: string },
  ) {
    const user = client.data.user as SocketUser | undefined;
    if (!user?.id || !body?.messageId) {
      return { ok: false, message: 'Invalid delivered payload' };
    }

    await this.prisma.messageReceipt.upsert({
      where: {
        messageId_userId: {
          messageId: body.messageId,
          userId: user.id,
        },
      },
      create: {
        messageId: body.messageId,
        userId: user.id,
        deliveredAt: new Date(),
      },
      update: {
        deliveredAt: new Date(),
      },
    });
    return { ok: true };
  }

  @SubscribeMessage('message.seen')
  async markSeen(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { messageId: string },
  ) {
    const user = client.data.user as SocketUser | undefined;
    if (!user?.id || !body?.messageId) {
      return { ok: false, message: 'Invalid seen payload' };
    }

    await this.prisma.messageReceipt.upsert({
      where: {
        messageId_userId: {
          messageId: body.messageId,
          userId: user.id,
        },
      },
      create: {
        messageId: body.messageId,
        userId: user.id,
        deliveredAt: new Date(),
        seenAt: new Date(),
      },
      update: {
        deliveredAt: new Date(),
        seenAt: new Date(),
      },
    });
    return { ok: true };
  }

  private extractToken(client: Socket): string | undefined {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    const fromAuth = client.handshake.auth?.token;
    if (typeof fromAuth === 'string' && fromAuth.length > 0) {
      return fromAuth;
    }
    return undefined;
  }
}
