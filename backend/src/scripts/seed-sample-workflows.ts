/// <reference types="node" />
require('dotenv').config();
/*
  Seeds six sample workflows into the database so the frontend cards can Run against real backend workflows.
  - Creates a default user if missing
  - Upserts workflows by name for idempotency
*/

/* eslint-disable @typescript-eslint/no-var-requires */
import { PrismaClient } from '@prisma/client';

type WF = {
  name: string;
  description: string;
  nodes: any[];
  edges: any[];
  isActive?: boolean;
};

function trig(id: string, name: string, path = '/hook'): any {
  return {
    id,
    type: 'webhook-trigger',
    name,
    position: { x: 100, y: 100 },
    data: { config: { method: 'POST', path } }
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    // Align with src/db/database.ts defaults for local dev
    process.env.DATABASE_URL = process.env.PG_CONNECTION_STRING || 'postgresql://sahinbegum@localhost:5432/workflow_studio';
  }

  const prisma = new PrismaClient();
  const userEmail = process.env.SEED_USER_EMAIL || 'demo@workflow.studio';
  const userPassword = process.env.SEED_USER_PASSWORD || 'demo-password';

  // Ensure user exists
  let user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: userEmail,
        password: userPassword,
        name: 'Demo User',
        role: 'admin'
      }
    });
  }

  const samples: WF[] = [
    {
      name: 'Gmail Automation Workflow',
      description: 'Sequential Gmail operations: send, list, and read emails.',
      nodes: [
        { id: 'gmail-1', type: 'gmail', name: 'Gmail Operation 1', position: { x: 100, y: 100 }, data: { config: { operation: 'send' } } },
        { id: 'gmail-2', type: 'gmail', name: 'Gmail Operation 2', position: { x: 400, y: 100 }, data: { config: { operation: 'list' } } },
        { id: 'gmail-3', type: 'gmail', name: 'Gmail Operation 3', position: { x: 700, y: 100 }, data: { config: { operation: 'read' } } }
      ],
      edges: [
        { id: 'e1', source: 'gmail-1', target: 'gmail-2', type: 'default' },
        { id: 'e2', source: 'gmail-2', target: 'gmail-3', type: 'default' }
      ],
      isActive: true
    },
    {
      name: 'Mark as Read Mail',
      description: 'Schedule Gmail operations to send, list, and mark emails as read.',
      nodes: [
        { id: 'schedule-1', type: 'schedule', name: 'Schedule Trigger', position: { x: 100, y: 100 }, data: { config: { interval: 1, intervalUnit: 'minutes' } } },
        { id: 'gmail-1', type: 'gmail', name: 'Gmail Operation 1', position: { x: 400, y: 100 }, data: { config: { operation: 'send' } } },
        { id: 'gmail-2', type: 'gmail', name: 'Gmail Operation 2', position: { x: 700, y: 100 }, data: { config: { operation: 'list' } } },
        { id: 'gmail-3', type: 'gmail', name: 'Gmail Operation 3', position: { x: 1000, y: 100 }, data: { config: { operation: 'read' } } }
      ],
      edges: [
        { id: 'e1', source: 'schedule-1', target: 'gmail-1', type: 'default' },
        { id: 'e2', source: 'gmail-1', target: 'gmail-2', type: 'default' },
        { id: 'e3', source: 'gmail-2', target: 'gmail-3', type: 'default' }
      ],
      isActive: true
    },
    {
      name: 'File Processing Pipeline',
      description: 'Upload files, clean data, and upload to Google Drive.',
      nodes: [
        { id: 'file-upload-1', type: 'file-upload', name: 'File Upload', position: { x: 100, y: 100 }, data: { config: { source: 'local' } } },
        { id: 'data-cleaning-1', type: 'data-cleaning', name: 'Data Cleaning', position: { x: 400, y: 100 }, data: { config: {} } },
        { id: 'google-drive-1', type: 'google-drive', name: 'Google Drive', position: { x: 700, y: 100 }, data: { config: { operation: 'upload' } } }
      ],
      edges: [
        { id: 'e1', source: 'file-upload-1', target: 'data-cleaning-1', type: 'default' },
        { id: 'e2', source: 'data-cleaning-1', target: 'google-drive-1', type: 'default' }
      ],
      isActive: true
    }
  ];

  for (const wf of samples) {
    const existing = await prisma.workflow.findFirst({ where: { name: wf.name, userId: user.id } });
    if (existing) {
      await prisma.workflow.update({
        where: { id: existing.id },
        data: {
          description: wf.description,
          nodes: wf.nodes as any,
          edges: wf.edges as any,
          isActive: wf.isActive ?? true
        }
      });
    } else {
      await prisma.workflow.create({
        data: {
          name: wf.name,
          description: wf.description,
          nodes: wf.nodes as any,
          edges: wf.edges as any,
          settings: {},
          isActive: wf.isActive ?? true,
          userId: user.id
        }
      });
    }
  }

  const logger = require('../utils/logger');
  logger.info('Seeded sample workflows');
  await prisma.$disconnect();
}

main().catch((e) => {
  const logger = require('../utils/logger');
  logger.error('Failed to seed sample workflows', e as Error);
  process.exit(1);
});


