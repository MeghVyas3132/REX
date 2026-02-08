# REX Tests

Comprehensive test suites for all REX packages.

## Purpose

Centralized testing for:
- Unit tests for all packages
- Integration tests
- E2E tests
- Performance tests

## Structure

```
tests/
├── unit/                    # Unit tests by package
│   ├── shared/
│   ├── engine/
│   ├── nodes/
│   ├── backend/
│   ├── frontend/
│   └── sdk/
├── integration/             # Integration tests
│   ├── api/                # API integration tests
│   ├── database/           # Database tests
│   ├── workflows/          # Workflow execution tests
│   └── nodes/              # Node integration tests
├── e2e/                    # End-to-end tests
│   ├── smoke/              # Smoke tests
│   ├── workflows/          # Workflow E2E tests
│   └── ui/                 # UI E2E tests
├── performance/            # Performance tests
│   ├── load/              # Load testing
│   └── benchmarks/        # Benchmarks
├── fixtures/               # Test data
│   ├── workflows/
│   ├── nodes/
│   └── mocks/
├── utils/                  # Test utilities
│   ├── setup.ts
│   ├── factories.ts
│   └── helpers.ts
├── jest.config.js         # Jest configuration
├── vitest.config.ts       # Vitest configuration  
├── playwright.config.ts   # Playwright E2E config
└── README.md
```

## Running Tests

### All Tests

```bash
# Run all unit tests
npm run test

# Run with coverage
npm run test:coverage
```

### By Package

```bash
# Test specific package
npm run test:shared
npm run test:engine
npm run test:nodes
npm run test:backend
npm run test:frontend
npm run test:sdk
```

### Integration Tests

```bash
# Run integration tests (requires running services)
npm run test:integration
```

### E2E Tests

```bash
# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui
```

### Performance Tests

```bash
# Run load tests
npm run test:load

# Run benchmarks
npm run test:bench
```

## Test Utilities

### Factories

```typescript
import { createWorkflow, createNode } from '@rex/tests/factories';

const workflow = createWorkflow({
  nodes: [
    createNode({ type: 'manual-trigger' }),
    createNode({ type: 'http-request' }),
  ],
});
```

### Mocks

```typescript
import { mockNodeRegistry, mockEngine } from '@rex/tests/mocks';

const registry = mockNodeRegistry();
const engine = mockEngine();
```

## Coverage Requirements

| Package | Target Coverage |
|---------|----------------|
| shared | 90% |
| engine | 85% |
| nodes | 80% |
| backend | 75% |
| frontend | 70% |

## CI Integration

Tests run automatically on:
- Pull request creation
- Push to main branch
- Nightly builds (full suite)
