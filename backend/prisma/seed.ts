import {
  ChannelType,
  PrismaClient,
  TaskStatus,
  WorkspaceRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 10;

async function main() {
  const passwordHash = await bcrypt.hash('demo12345', BCRYPT_ROUNDS);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@teamflow.dev' },
    update: {
      fullName: 'Owner Demo',
      displayName: 'owner',
      timezone: 'Asia/Ho_Chi_Minh',
      passwordHash,
    },
    create: {
      email: 'owner@teamflow.dev',
      fullName: 'Owner Demo',
      displayName: 'owner',
      timezone: 'Asia/Ho_Chi_Minh',
      passwordHash,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: 'member@teamflow.dev' },
    update: {
      fullName: 'Member Demo',
      displayName: 'member',
      timezone: 'Asia/Ho_Chi_Minh',
      passwordHash,
    },
    create: {
      email: 'member@teamflow.dev',
      fullName: 'Member Demo',
      displayName: 'member',
      timezone: 'Asia/Ho_Chi_Minh',
      passwordHash,
    },
  });

  const existingWorkspace = await prisma.workspace.findFirst({
    where: { name: 'Demo Workspace', ownerId: owner.id },
    select: { id: true },
  });

  if (existingWorkspace) {
    await prisma.workspace.delete({ where: { id: existingWorkspace.id } });
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Demo Workspace',
      ownerId: owner.id,
      memberships: {
        create: [
          { userId: owner.id, role: WorkspaceRole.OWNER },
          { userId: member.id, role: WorkspaceRole.MEMBER },
        ],
      },
      channels: {
        create: [
          { name: 'general', type: ChannelType.GENERAL },
          { name: 'dev-chat', type: ChannelType.PRIVATE },
        ],
      },
    },
    include: {
      channels: true,
    },
  });

  const generalChannel = workspace.channels.find((c) => c.name === 'general');
  const devChannel = workspace.channels.find((c) => c.name === 'dev-chat');
  if (!generalChannel || !devChannel) {
    throw new Error('Failed to create seed channels');
  }

  const firstMessage = await prisma.message.create({
    data: {
      workspaceId: workspace.id,
      channelId: generalChannel.id,
      senderId: owner.id,
      content: 'Welcome to TeamFlow demo workspace!',
    },
  });

  await prisma.message.create({
    data: {
      workspaceId: workspace.id,
      channelId: devChannel.id,
      senderId: member.id,
      content: 'Task API and realtime chat are up for testing.',
    },
  });

  await prisma.messageReceipt.create({
    data: {
      messageId: firstMessage.id,
      userId: member.id,
      deliveredAt: new Date(),
      seenAt: new Date(),
    },
  });

  const task = await prisma.task.create({
    data: {
      workspaceId: workspace.id,
      title: 'Prepare sprint demo',
      description: 'Demo chat, task flow, and optimistic locking document update.',
      status: TaskStatus.IN_PROGRESS,
      reporterId: owner.id,
      assigneeId: member.id,
    },
  });

  const document = await prisma.document.create({
    data: {
      workspaceId: workspace.id,
      title: 'Sprint Notes',
      content: 'Version 1: Initial sprint notes.',
      updatedBy: owner.id,
      versions: {
        create: [
          {
            version: 1,
            content: 'Version 1: Initial sprint notes.',
            updatedBy: owner.id,
          },
        ],
      },
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        workspaceId: workspace.id,
        userId: member.id,
        type: 'TASK_ASSIGNED',
        payload: { taskId: task.id, title: task.title },
      },
      {
        workspaceId: workspace.id,
        userId: owner.id,
        type: 'DOCUMENT_UPDATED',
        payload: { documentId: document.id, version: document.version },
      },
    ],
  });

  await prisma.activityLog.createMany({
    data: [
      {
        workspaceId: workspace.id,
        actorId: owner.id,
        action: 'seed.workspace.created',
        targetType: 'workspace',
        targetId: workspace.id,
        payload: { name: workspace.name },
      },
      {
        workspaceId: workspace.id,
        actorId: member.id,
        action: 'seed.task.created',
        targetType: 'task',
        targetId: task.id,
        payload: { title: task.title },
      },
    ],
  });

  console.log('Seed completed.');
  console.log('Owner:', owner.email, 'password: demo12345');
  console.log('Member:', member.email, 'password: demo12345');
  console.log('Workspace:', workspace.name, workspace.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
