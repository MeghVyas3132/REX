// =============================================================================
// REX DB Package
// Database client and utilities
// =============================================================================

import { PrismaClient } from '@prisma/client';

// Singleton Prisma client
let prismaInstance: PrismaClient | null = null;

/**
 * Get the Prisma client instance (singleton)
 */
export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    });
  }
  return prismaInstance;
}

/**
 * Disconnect the Prisma client
 */
export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

// Export the client
export const prisma = getPrismaClient();

// Export types from Prisma
export type { PrismaClient } from '@prisma/client';

// Re-export all generated types
export * from '@prisma/client';
