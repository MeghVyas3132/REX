import { Redis } from 'ioredis';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redis = new Redis(redisUrl, {
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

    const logger = require('../utils/logger');
    
    redis.on('error', (err) => {
      logger.error('[Redis] Connection error', err as Error);
    });

    redis.on('connect', () => {
      logger.info('[Redis] Connected successfully');
    });

    redis.on('ready', () => {
      logger.info('[Redis] Ready for operations');
    });

    redis.on('close', () => {
      logger.info('[Redis] Connection closed');
    });
  }

  return redis;
}

export async function testRedisConnection(): Promise<boolean> {
  try {
    const client = getRedis();
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('[Redis] Connection test failed:', error);
    return false;
  }
}

export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

// Redis operations for background jobs
export class RedisService {
  private redis: Redis;

  constructor() {
    this.redis = getRedis();
  }

  // Queue operations
  async addJob(queueName: string, jobData: any, options?: any) {
    const key = `queue:${queueName}`;
    const jobId = `job:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    
    const job = {
      id: jobId,
      data: jobData,
      timestamp: Date.now(),
      status: 'pending',
      ...options
    };

    await this.redis.lpush(key, JSON.stringify(job));
    return jobId;
  }

  async getJob(queueName: string, jobId: string) {
    const key = `queue:${queueName}`;
    const jobs = await this.redis.lrange(key, 0, -1);
    
    for (const jobStr of jobs) {
      const job = JSON.parse(jobStr);
      if (job.id === jobId) {
        return job;
      }
    }
    return null;
  }

  async getNextJob(queueName: string) {
    const key = `queue:${queueName}`;
    const jobStr = await this.redis.rpop(key);
    
    if (jobStr) {
      return JSON.parse(jobStr);
    }
    return null;
  }

  async updateJobStatus(queueName: string, jobId: string, status: string, result?: any) {
    const key = `queue:${queueName}`;
    const jobs = await this.redis.lrange(key, 0, -1);
    
    for (let i = 0; i < jobs.length; i++) {
      const job = JSON.parse(jobs[i]);
      if (job.id === jobId) {
        job.status = status;
        job.updatedAt = Date.now();
        if (result) {
          job.result = result;
        }
        await this.redis.lset(key, i, JSON.stringify(job));
        break;
      }
    }
  }

  async getQueueStats(queueName: string) {
    const key = `queue:${queueName}`;
    const length = await this.redis.llen(key);
    return { length, queueName };
  }

  async clearQueue(queueName: string) {
    const key = `queue:${queueName}`;
    await this.redis.del(key);
  }

  // Cache operations
  async setCache(key: string, value: any, ttl?: number) {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.redis.setex(key, ttl, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async getCache(key: string) {
    const value = await this.redis.get(key);
    if (value) {
      return JSON.parse(value);
    }
    return null;
  }

  async deleteCache(key: string) {
    await this.redis.del(key);
  }

  // Session operations
  async setSession(sessionId: string, data: any, ttl: number = 3600) {
    const key = `session:${sessionId}`;
    await this.setCache(key, data, ttl);
  }

  async getSession(sessionId: string) {
    const key = `session:${sessionId}`;
    return await this.getCache(key);
  }

  async deleteSession(sessionId: string) {
    const key = `session:${sessionId}`;
    await this.deleteCache(key);
  }

  // Rate limiting
  async checkRateLimit(key: string, limit: number, window: number): Promise<boolean> {
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, window);
    }
    
    return current <= limit;
  }

  // Pub/Sub operations
  async publish(channel: string, message: any) {
    await this.redis.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (message: any) => void) {
    const subscriber = this.redis.duplicate();
    await subscriber.subscribe(channel);
    
    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        callback(JSON.parse(message));
      }
    });
    
    return subscriber;
  }
}

export const redisService = new RedisService();
