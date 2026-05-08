import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('Password123!', 12);

  // Demo user
  const alice = await prisma.user.upsert({
    where: { email: 'alice@demo.flowboard.app' },
    update: {},
    create: {
      name: 'Alice Chen',
      email: 'alice@demo.flowboard.app',
      passwordHash,
      status: 'ACTIVE',
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@demo.flowboard.app' },
    update: {},
    create: {
      name: 'Bob Martinez',
      email: 'bob@demo.flowboard.app',
      passwordHash,
      status: 'ACTIVE',
    },
  });

  // Workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'acme-engineering' },
    update: {},
    create: {
      name: 'Acme Engineering',
      slug: 'acme-engineering',
      accentColor: '#6b5efa',
      ownerId: alice.id,
      members: {
        create: [
          { userId: alice.id, role: 'OWNER' },
          { userId: bob.id, role: 'MEMBER' },
        ],
      },
    },
  });

  // Project
  const project = await prisma.project.upsert({
    where: { id: 'seed-project-001' },
    update: {},
    create: {
      id: 'seed-project-001',
      name: 'FlowBoard MVP',
      description: 'Build and launch the FlowBoard MVP.',
      color: '#6b5efa',
      icon: '🚀',
      status: 'ACTIVE',
      workspaceId: workspace.id,
      ownerId: alice.id,
      healthScore: 78,
      members: {
        create: [
          { userId: alice.id, role: 'OWNER' },
          { userId: bob.id, role: 'MEMBER' },
        ],
      },
    },
  });

  // Labels
  const labels = await Promise.all([
    prisma.label.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name: 'bug' } },
      update: {},
      create: { workspaceId: workspace.id, name: 'bug', color: '#ef4444' },
    }),
    prisma.label.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name: 'feature' } },
      update: {},
      create: { workspaceId: workspace.id, name: 'feature', color: '#6b5efa' },
    }),
    prisma.label.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name: 'urgent' } },
      update: {},
      create: { workspaceId: workspace.id, name: 'urgent', color: '#f97316' },
    }),
  ]);

  // Tasks
  const taskData = [
    { title: 'Set up monorepo structure', status: 'DONE' as const, priority: 'P1' as const, position: 0 },
    { title: 'Implement JWT auth system', status: 'DONE' as const, priority: 'P0' as const, position: 1 },
    { title: 'Build Kanban board UI', status: 'IN_PROGRESS' as const, priority: 'P1' as const, position: 0 },
    { title: 'Integrate Socket.IO for real-time', status: 'TODO' as const, priority: 'P1' as const, position: 0 },
    { title: 'Add AI task breakdown', status: 'TODO' as const, priority: 'P2' as const, position: 1 },
    { title: 'Write test coverage to 70%', status: 'BACKLOG' as const, priority: 'P2' as const, position: 0 },
  ];

  for (const t of taskData) {
    await prisma.task.upsert({
      where: { id: `seed-task-${t.title.replace(/\s+/g, '-').toLowerCase()}` },
      update: {},
      create: {
        id: `seed-task-${t.title.replace(/\s+/g, '-').toLowerCase()}`,
        ...t,
        projectId: project.id,
        createdById: alice.id,
      },
    });
  }

  console.log('✅ Seed complete');
  console.log('📧 Demo login: alice@demo.flowboard.app / Password123!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
