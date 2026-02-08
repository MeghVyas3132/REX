# REX Engine

Node-agnostic workflow execution engine.

## Purpose

This package contains the core workflow execution logic:
- Workflow graph building and traversal
- Node execution coordination
- Context and state management
- Retry and error handling
- Loop and branch processing

## Key Principles

1. **Node-Agnostic**: The engine knows NOTHING about specific node types
2. **No Direct Imports**: Never import from `backend/` or `nodes/`
3. **Interface-Based**: Nodes implement the `NodeExecutor` interface

## Structure

```
engine/
├── executor/           # Node execution coordination
│   ├── node-executor.ts
│   ├── context-manager.ts
│   └── retry-handler.ts
├── graph/             # Workflow graph operations
│   ├── graph-builder.ts
│   ├── traversal.ts
│   └── validator.ts
├── state/             # Execution state management
│   ├── state-manager.ts
│   └── variable-resolver.ts
├── interfaces/        # Contracts for nodes to implement
│   ├── node-executor.interface.ts
│   └── workflow.interface.ts
├── types/             # Engine-specific types
│   └── index.ts
└── index.ts           # Public API
```

## Usage

```typescript
import { WorkflowEngine } from '@rex/engine';

const engine = new WorkflowEngine({
  nodeRegistry: registry,
  stateManager: stateManager,
});

const result = await engine.execute(workflow, initialContext);
```

## Dependencies

- `@rex/shared` - Shared types and utilities
- No other internal dependencies!
