import { Request, Response, NextFunction } from 'express';

type CacheEntry = { createdAt: number };

// In-memory idempotency cache. For multi-instance deployments, use Redis.
const idempotencyCache = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

function makeKey(req: Request, idempotencyKey: string): string {
  const workflowId = (req.params && req.params.id) || 'global';
  return `${workflowId}:${idempotencyKey}`;
}

function cleanupExpired(ttlMs: number): void {
  const now = Date.now();
  for (const [key, entry] of idempotencyCache.entries()) {
    if (now - entry.createdAt > ttlMs) {
      idempotencyCache.delete(key);
    }
  }
}

export function enforceIdempotency(ttlMs: number = DEFAULT_TTL_MS) {
  return (req: Request, res: Response, next: NextFunction) => {
    const idempotencyKey = (req.body && req.body.idempotencyKey) as string | undefined;
    if (!idempotencyKey) {
      return next();
    }

    // Periodic cleanup (cheap in small maps)
    cleanupExpired(ttlMs);

    const key = makeKey(req, idempotencyKey);
    const existing = idempotencyCache.get(key);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate request: idempotencyKey already used for this workflow',
        timestamp: new Date().toISOString(),
      });
    }

    // Reserve key; allow the request to proceed
    idempotencyCache.set(key, { createdAt: Date.now() });
    next();
  };
}


