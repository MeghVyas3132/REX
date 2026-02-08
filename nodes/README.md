# REX Nodes

All workflow nodes for the REX automation platform.

## Purpose

This package contains all executable workflow nodes organized by category.
Nodes are self-contained, isolated components that:
- Define their inputs/outputs
- Execute specific operations
- Return structured results

## Key Principles

1. **Self-Contained**: Each node handles its own logic completely
2. **No Backend Imports**: NEVER import from `backend/`, `db/`, or `redis`
3. **Pure Functions**: Nodes receive context, return results
4. **Isolated**: Nodes don't know about other nodes

## Structure

```
nodes/
├── agent/                    # AI agent nodes
│   ├── context/
│   ├── decision/
│   ├── goal/
│   ├── reasoning/
│   └── state/
├── ai/                       # AI processing nodes
│   ├── audio-processor/
│   ├── data-analyzer/
│   ├── text-analyzer/
│   └── ...
├── communication/            # Communication nodes
│   ├── email/
│   ├── slack/
│   ├── whatsapp/
│   └── ...
├── integrations/             # Third-party integrations
│   ├── gmail/
│   ├── google-drive/
│   └── ...
├── triggers/                 # Workflow triggers
│   ├── manual-trigger/
│   ├── schedule/
│   ├── webhook-trigger/
│   └── ...
├── registry.ts              # Node registration
├── types.ts                 # Node-specific types
└── index.ts                 # Public exports
```

## Node Structure Template

Each node follows this structure:

```
<node-name>/
├── <node-name>.node.ts       # Execution logic (max 300 lines)
├── <node-name>.definition.ts # Node metadata and config schema
├── <node-name>.ui.ts         # UI schema for frontend
├── <node-name>.types.ts      # Node-specific types (if needed)
├── operations/               # For complex nodes
│   ├── create.ts
│   ├── read.ts
│   └── ...
├── utils/                    # Node utilities (if needed)
│   └── helpers.ts
└── index.ts                  # Re-exports
```

## Creating a New Node

```typescript
// my-node/my-node.definition.ts
export const myNodeDefinition: NodeDefinition = {
  type: 'my-node',
  displayName: 'My Node',
  description: 'Does something useful',
  category: 'utility',
  inputs: { ... },
  outputs: { ... },
};

// my-node/my-node.node.ts
export async function execute(
  context: NodeExecutionContext
): Promise<NodeResult> {
  const { inputs, credentials } = context;
  // Do work
  return { success: true, data: result };
}

// my-node/index.ts
export { myNodeDefinition } from './my-node.definition';
export { execute } from './my-node.node';
```

## Node Count by Category

| Category | Count | Description |
|----------|-------|-------------|
| agent | 5 | AI agent operations |
| ai | 10 | AI processing |
| analytics | 3 | Analytics integrations |
| cloud | 6 | Cloud services |
| communication | 12 | Messaging platforms |
| core | 7 | Core workflow operations |
| data | 4 | Database operations |
| development | 3 | Developer tools |
| file-processing | 4 | File operations |
| finance | 1 | Financial services |
| integrations | 3 | Third-party APIs |
| llm | 3 | LLM providers |
| logic | 1 | Control flow |
| productivity | 3 | Productivity tools |
| triggers | 7 | Workflow triggers |
| utility | 3 | Utility functions |
| **Total** | **75** | - |

## Dependencies

- `@rex/shared` - Shared types and utilities
- No other internal dependencies!
