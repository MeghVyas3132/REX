import { PrismaClient } from '@prisma/client';
import { logger } from "../utils/logger";

declare global {
  var __prisma: PrismaClient | undefined;
}

class PrismaService {
  private static instance: PrismaService;
  public prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });

    // Log database queries in development
    if (process.env.NODE_ENV === 'development') {
      // Note: Prisma event listeners are disabled due to type issues
      // They can be re-enabled when proper types are available
    }
  }

  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      try {
        logger.info('Database connected successfully');
      } catch (e) {
        logger.info('Database connected successfully');
      }
    } catch (error) {
      try {
        logger.error('Failed to connect to database', error as Error);
      } catch (e) {
        logger.error('Failed to connect to database', error as Error);
      }
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      try {
        logger.info('Database disconnected successfully');
      } catch (e) {
        logger.info('Database disconnected successfully');
      }
    } catch (error) {
      try {
        logger.error('Failed to disconnect from database', error as Error);
      } catch (e) {
        logger.error('Failed to disconnect from database', error as Error);
      }
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed', error as Error);
      return false;
    }
  }

  public async transaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    return await this.prisma.$transaction(fn);
  }

  public async executeRaw<T = any>(query: string, ...params: any[]): Promise<T> {
    return await this.prisma.$queryRawUnsafe(query, ...params);
  }
}

// Export singleton instance
export const prisma = PrismaService.getInstance().prisma;
export const prismaService = PrismaService.getInstance();

// Graceful shutdown
process.on('beforeExit', async () => {
  await prismaService.disconnect();
});

process.on('SIGINT', async () => {
  await prismaService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prismaService.disconnect();
  process.exit(0);
});

export default prismaService;
