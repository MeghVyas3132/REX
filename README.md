# REX Shared

Shared types, utilities, and contracts used across all REX packages.

## Purpose

This package provides:
- Common TypeScript types and interfaces
- Shared utility functions
- Validation schemas
- Constants and enums

## Key Principles

1. **Zero Dependencies**: No imports from other REX packages
2. **Pure TypeScript**: Only types, interfaces, and pure functions
3. **Platform-Agnostic**: No Node.js-specific or browser-specific code

## Structure

```
shared/
├── types/                    # Type definitions
│   ├── workflow.types.ts     # Workflow-related types
│   ├── node.types.ts         # Node-related types
│   ├── execution.types.ts    # Execution-related types
│   ├── credentials.types.ts  # Credential types
│   └── index.ts
├── interfaces/               # Contracts
│   ├── node-executor.interface.ts
│   ├── workflow-engine.interface.ts
│   └── index.ts
├── utils/                    # Pure utility functions
│   ├── validators.ts
│   ├── formatters.ts
│   ├── helpers.ts
│   └── index.ts
├── constants/                # Shared constants
│   ├── node-categories.ts
│   ├── execution-status.ts
│   └── index.ts
├── schemas/                  # Validation schemas
│   ├── workflow.schema.ts
│   ├── node.schema.ts
│   └── index.ts
└── index.ts                  # Public API
```

## Core Types

### Workflow Types

```typescript
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  settings?: WorkflowSettings;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}
```

### Node Types

```typescript
export interface NodeDefinition {
  type: string;
  displayName: string;
  description: string;
  category: NodeCategory;
  icon?: string;
  inputs: NodeInputSchema;
  outputs: NodeOutputSchema;
  credentials?: CredentialRequirement[];
}

export interface NodeExecutionContext {
  nodeId: string;
  nodeType: string;
  inputs: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  workflow: Workflow;
  executionId: string;
}

export interface NodeResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}
```

## Usage

```typescript
import { 
  Workflow, 
  WorkflowNode, 
  NodeDefinition,
  NodeResult 
} from '@rex/shared';

// Use types across all packages
const workflow: Workflow = { ... };
```

## Dependencies

- None! This is the foundation package.
