# REX SDK

Client SDK for interacting with the REX API.

## Purpose

This package provides a TypeScript/JavaScript client for:
- Managing workflows programmatically
- Executing workflows via API
- Managing credentials
- Accessing execution history

## Structure

```
sdk/
├── src/
│   ├── client.ts           # Main REX client
│   ├── workflows.ts        # Workflow operations
│   ├── executions.ts       # Execution operations
│   ├── credentials.ts      # Credential management
│   ├── webhooks.ts         # Webhook management
│   ├── types.ts            # SDK-specific types
│   └── index.ts
├── examples/
│   ├── basic-usage.ts
│   ├── workflow-builder.ts
│   └── webhook-handler.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

```bash
npm install @rex/sdk
```

## Usage

```typescript
import { RexClient } from '@rex/sdk';

const rex = new RexClient({
  baseUrl: 'http://localhost:3003',
  apiKey: 'your-api-key',
});

// List workflows
const workflows = await rex.workflows.list();

// Create a workflow
const workflow = await rex.workflows.create({
  name: 'My Workflow',
  nodes: [...],
  edges: [...],
});

// Execute a workflow
const execution = await rex.workflows.execute(workflow.id, {
  inputData: { key: 'value' },
});

// Get execution status
const status = await rex.executions.get(execution.id);
```

## API Reference

### RexClient

```typescript
const client = new RexClient(options: RexClientOptions);
```

### Workflows

- `client.workflows.list()` - List all workflows
- `client.workflows.get(id)` - Get workflow by ID
- `client.workflows.create(data)` - Create new workflow
- `client.workflows.update(id, data)` - Update workflow
- `client.workflows.delete(id)` - Delete workflow
- `client.workflows.execute(id, options)` - Execute workflow

### Executions

- `client.executions.list()` - List executions
- `client.executions.get(id)` - Get execution by ID
- `client.executions.cancel(id)` - Cancel execution

### Credentials

- `client.credentials.list()` - List credentials
- `client.credentials.create(data)` - Create credential
- `client.credentials.delete(id)` - Delete credential

## Dependencies

- `@rex/shared` - Shared types
- `fetch` (native or polyfill)
