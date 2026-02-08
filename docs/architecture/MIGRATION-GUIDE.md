# REX Migration Guide

This guide helps developers migrate code from the old monolithic structure to the new modular architecture.

## Overview

The REX codebase is being restructured from a tightly-coupled monolith into a clean, modular monorepo.

### Key Changes

| Before | After |
|--------|-------|
| `backend/src/utils/types.ts` | `shared/types/` |
| `backend/src/nodes/*` | `nodes/*` |
| `backend/src/core/engine/*` | `engine/*` |
| `backend/prisma/*` | `db/prisma/*` |
| All Docker files scattered | `docker/` |

---

## Import Path Changes

### Shared Types

**Before:**
```typescript
import { NodeDefinition, Workflow } from '../utils/types';
```

**After:**
```typescript
import { NodeDefinition, Workflow } from '@rex/shared';
```

### Node Imports

**Before:**
```typescript
import { httpRequestNode } from '../nodes/core/http-request.node';
```

**After:**
```typescript
import { httpRequestNode } from '@rex/nodes/core/http-request';
```

### Engine Imports

**Before:**
```typescript
import { WorkflowEngine } from '../core/engine/workflow-engine';
```

**After:**
```typescript
import { WorkflowEngine } from '@rex/engine';
```

---

## Creating a New Node

### Old Structure

```
backend/src/nodes/category/my-node.node.ts  (single 500+ line file)
```

### New Structure

```
nodes/category/my-node/
├── my-node.node.ts           # Execution logic only (~100-200 lines)
├── my-node.definition.ts     # Metadata and config schema
├── my-node.ui.ts             # UI schema for frontend
├── my-node.types.ts          # Node-specific types (optional)
├── operations/               # For CRUD operations (optional)
│   ├── create.ts
│   ├── read.ts
│   └── update.ts
├── utils/                    # Helper functions (optional)
│   └── helpers.ts
└── index.ts                  # Re-exports everything
```

### Example: Converting http-request.node.ts

**Step 1: Create definition file**

```typescript
// nodes/core/http-request/http-request.definition.ts
import { NodeDefinition } from '@rex/shared';

export const httpRequestDefinition: NodeDefinition = {
  type: 'http-request',
  displayName: 'HTTP Request',
  description: 'Make HTTP requests to any URL',
  category: 'core',
  icon: 'globe',
  inputs: {
    url: { type: 'string', required: true },
    method: { type: 'string', default: 'GET' },
    headers: { type: 'object', default: {} },
    body: { type: 'any' },
  },
  outputs: {
    response: { type: 'object' },
    statusCode: { type: 'number' },
    headers: { type: 'object' },
  },
};
```

**Step 2: Create execution file**

```typescript
// nodes/core/http-request/http-request.node.ts
import { NodeExecutionContext, NodeResult } from '@rex/shared';

export async function execute(context: NodeExecutionContext): Promise<NodeResult> {
  const { url, method, headers, body } = context.inputs;
  
  try {
    const response = await fetch(url as string, {
      method: method as string,
      headers: headers as Record<string, string>,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await response.json();
    
    return {
      success: true,
      data: {
        response: data,
        statusCode: response.status,
        headers: Object.fromEntries(response.headers),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
}
```

**Step 3: Create UI schema**

```typescript
// nodes/core/http-request/http-request.ui.ts
export const httpRequestUI = {
  sections: [
    {
      name: 'Request',
      fields: ['url', 'method'],
    },
    {
      name: 'Headers',
      fields: ['headers'],
      collapsible: true,
    },
    {
      name: 'Body',
      fields: ['body'],
      collapsible: true,
      showIf: { method: ['POST', 'PUT', 'PATCH'] },
    },
  ],
  fieldOverrides: {
    method: {
      component: 'select',
      options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
    headers: {
      component: 'key-value-editor',
    },
    body: {
      component: 'json-editor',
    },
  },
};
```

**Step 4: Create index file**

```typescript
// nodes/core/http-request/index.ts
export { httpRequestDefinition } from './http-request.definition';
export { execute } from './http-request.node';
export { httpRequestUI } from './http-request.ui';
```

---

## Rules for Node Development

### DO:

✅ Keep execution logic pure - input → output  
✅ Use `@rex/shared` types for all interfaces  
✅ Handle errors gracefully with `try/catch`  
✅ Return structured `NodeResult` objects  
✅ Keep files under 300 lines  
✅ Document public APIs with JSDoc  

### DON'T:

❌ Import from `backend/` directly  
❌ Import database clients (`prisma`, `redis`)  
❌ Import queue systems (`BullMQ`)  
❌ Access `process.env` directly (use context)  
❌ Make nodes aware of other node types  
❌ Store state outside the execution context  

---

## Testing Changes

### Before (scattered tests):

```
backend/src/tests/nodes/http-request.test.ts
frontend/src/__tests__/NodeConfigPanel.test.tsx
```

### After (centralized):

```
tests/
├── unit/
│   ├── nodes/
│   │   └── core/
│   │       └── http-request.test.ts
│   └── engine/
│       └── executor.test.ts
├── integration/
│   └── workflows/
│       └── http-workflow.test.ts
└── e2e/
    └── workflow-execution.spec.ts
```

---

## Package Dependencies

### Dependency Graph

```
                    ┌─────────────┐
                    │   shared    │  (no dependencies)
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
    │  engine │       │  nodes  │       │   sdk   │
    └────┬────┘       └────┬────┘       └─────────┘
         │                 │
         └────────┬────────┘
                  │
             ┌────▼────┐
             │ backend │
             └────┬────┘
                  │
             ┌────▼────┐
             │frontend │
             └─────────┘
```

### Rules:

1. `shared` → No internal dependencies
2. `engine` → Only `shared`
3. `nodes` → Only `shared`
4. `backend` → `shared`, `engine`, `nodes`, `db`
5. `frontend` → `shared`, `sdk`

---

## Checklist for Migration

- [ ] Types moved to `shared/types/`
- [ ] Node extracted to `nodes/<category>/<name>/`
- [ ] Node split into definition, execution, UI files
- [ ] Imports updated to use `@rex/*` paths
- [ ] Tests moved to `tests/unit/<package>/`
- [ ] No forbidden imports (db, redis, backend)
- [ ] File size under 300 lines
- [ ] Documentation updated

---

## Getting Help

- **Refactoring Plan:** [docs/architecture/REFACTORING-PLAN.md](./REFACTORING-PLAN.md)
- **Node Inventory:** [docs/architecture/NODE-INVENTORY.md](./NODE-INVENTORY.md)
- **Architecture Overview:** [docs/architecture/overview.md](./overview.md)
