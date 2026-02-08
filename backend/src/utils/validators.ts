import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const authSchemas = {
  register: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).optional(),
  }),
  login: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
  refresh: z.object({
    refreshToken: z.string().min(10),
  }),
};

export const workflowSchemas = {
  create: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    nodes: z.array(z.any()).default([]),
    edges: z.array(z.any()).default([]),
    settings: z.record(z.any()).optional(),
    isActive: z.boolean().optional(),
  }),
  update: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    nodes: z.array(z.any()).optional(),
    edges: z.array(z.any()).optional(),
    settings: z.record(z.any()).optional(),
    isActive: z.boolean().optional(),
  }),
  run: z.object({
    input: z.record(z.any()).default({}),
    runOptions: z.record(z.any()).optional(),
    idempotencyKey: z.string().max(128).optional(),
  }),
};

export const commonSchemas = {
  pagination: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).default('100'),
    offset: z.string().regex(/^\d+$/).transform(Number).default('0'),
  }),
};

export function validateQuery(schema: z.ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
        timestamp: new Date().toISOString(),
      });
      return;
    }
    req.query = parsed.data;
    next();
  };
}

export function validateBody(schema: z.ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
        timestamp: new Date().toISOString(),
      });
      return;
    }
    req.body = parsed.data;
    next();
  };
}


