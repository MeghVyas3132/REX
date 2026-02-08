# REX Architecture Refactoring Plan

## Executive Summary

This document outlines a comprehensive refactoring plan to transform REX from its current organically-grown structure into a clean, scalable monolithic source layout that supports 200+ workflow nodes while respecting the branch-based CI/CD service segregation pipeline.

---

## 1. Current State Analysis

### 1.1 Current Directory Structure

```
REX/
├── .github/workflows/     # CI/CD pipelines
├── backend/               # Express + TypeScript backend (monolithic)
│   ├── prisma/            # Database schema
│   └── src/
│       ├── api/           # REST controllers, routes, middlewares
│       ├── config/        # Configuration
│       ├── core/          # Engine, queue, scheduler, webhooks, etc.
│       ├── db/            # Database clients (Prisma, Redis)
│       ├── nodes/         # 83 workflow node implementations
│       ├── services/      # Business logic services
│       ├── templates/     # Workflow templates
│       ├── tests/         # Test files
│       ├── types/         # Type definitions
│       └── utils/         # Utilities and shared types
├── docs/                  # Documentation
├── frontend/              # React frontend
│   └── src/
│       ├── components/    # UI components including workflow canvas
│       ├── contexts/      # React contexts
│       ├── hooks/         # Custom hooks
│       ├── lib/           # Utilities
│       └── pages/         # Page components
├── scripts/               # Build/deployment scripts
└── templates/             # Workflow template JSON files
```

### 1.2 Current Branch Segregation (CI/CD)

The current `sync-branches.yml` synchronizes:
- `main` -> `backend` (backend/ folder)
- `main` -> `frontend` (frontend/ folder)
- `main` -> `docs` (docs/ folder)
- `main` -> `scripts` (scripts/ folder)
- `main` -> `templates` (templates/ folder)

---

## 2. Identified Issues

### 2.1 God-Files (>400 lines, require decomposition)

| File | Lines | Issues |
|------|-------|--------|
| `frontend/src/components/workflow/NodeConfigPanel.tsx` | 5,836 | Massive monolith handling ALL node configuration UIs |
| `backend/src/nodes/integrations/gmail.node.ts` | 2,726 | Single node file too large, mixed concerns |
| `frontend/src/components/workflow/nodeSchemas.ts` | 2,459 | All node schemas in one file |
| `frontend/src/components/workflow/executor.ts` | 1,355 | Frontend executor logic (should not exist) |
| `backend/src/tests/multi-agent.test.ts` | 1,014 | Test file too large |
| `backend/src/api/controllers/workflows.controller.ts` | 1,002 | Controller doing too much |
| `backend/src/core/engine/workflow-engine.ts` | 1,001 | Engine god-file |
| `backend/src/services/oauth.service.ts` | 946 | OAuth service too complex |
| `backend/src/nodes/file-processing/data-cleaning.node.ts` | 944 | Node too large |
| `backend/src/nodes/ai/text-analyzer.node.ts` | 922 | Node too large |
| `backend/src/templates/agent-templates.ts` | 907 | Templates file too large |
| `backend/src/nodes/ai/data-analyzer.node.ts` | 886 | Node too large |
| `backend/src/nodes/file-processing/data-transformation.node.ts` | 870 | Node too large |
| `backend/src/core/orchestration/workflow-manager.ts` | 861 | Orchestration complexity |
| `frontend/src/components/workflow/OutputPanel.tsx` | 856 | UI component too large |
| `backend/src/core/registry/node-registry.ts` | 728 | Registry handling too much |

### 2.2 Architectural Violations

1. **Workflow nodes importing backend services** - Some nodes directly import Prisma, Redis
2. **Frontend executing workflows** - `executor.ts` contains execution logic
3. **Mixed concerns in engine** - `workflow-engine.ts` handles traversal, execution, and node logic
4. **No shared types package** - Types duplicated between frontend/backend
5. **Node definitions scattered** - UI schemas in frontend, execution in backend

### 2.3 Node Inventory (83 node files)

**Categories:**
- `agent/` (5 nodes): context, decision, goal, reasoning, state
- `ai/` (10 nodes): audio-processor, data-analyzer, document-processor, email-analyzer, huggingface, image-generator, speech-to-text, text-analyzer, text-to-speech, vector-search
- `analytics/` (3 nodes): analytics, google-analytics, segment
- `cloud/` (6 nodes): aws-lambda, aws-s3, azure-blob, cloudwatch, docker, google-cloud-storage
- `communication/` (12 nodes): discord, email, instagram, linkedin-message, microsoft-teams, slack, telegram, twitter-dm, whatsapp (complex), zoom
- `core/` (7 nodes): audit-log, code, date-time, http-request, scheduler, signature-validation, webhook-trigger
- `data/` (4 nodes): database, mysql, postgresql, redis
- `development/` (3 nodes): github, rest-api, webhook-call
- `file-processing/` (4 nodes): data-cleaning, data-transformation, file-export, file-upload
- `finance/` (1 node): stripe
- `integrations/` (3 nodes): gmail, google-drive, onedrive
- `llm/` (3 nodes): gemini, openai, openrouter
- `logic/` (1 node): condition
- `productivity/` (3 nodes): excel, google-forms, google-sheets
- `triggers/` (7 nodes): database-trigger, email-trigger, error-trigger, file-trigger, gmail-trigger, manual-trigger, schedule
- `utility/` (3 nodes): data-converter, image-resize, logger

---

## 3. Proposed Directory Structure

```
REX/
├── .github/workflows/          # CI/CD (updated)
├── backend/                    # REST API, auth, queue producers
│   ├── src/
│   │   ├── api/                # Controllers, routes, middlewares
│   │   ├── config/             # Server configuration
│   │   ├── queue/              # BullMQ producers (not consumers)
│   │   └── services/           # Auth, credential services
│   ├── Dockerfile
│   └── package.json
├── db/                         # Database layer (NEW top-level)
│   ├── prisma/                 # Prisma schema and migrations
│   ├── src/
│   │   ├── clients/            # Prisma, Redis clients
│   │   ├── repositories/       # Data access layer
│   │   └── migrations/         # Migration scripts
│   └── package.json
├── docker/                     # Docker configurations (NEW top-level)
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   ├── worker.Dockerfile
│   └── docker-compose.yml
├── docs/                       # Documentation (existing)
│   ├── architecture/
│   ├── guides/
│   └── reference/
├── engine/                     # Workflow execution engine (NEW top-level)
│   ├── src/
│   │   ├── core/
│   │   │   ├── graph/          # Workflow graph construction
│   │   │   ├── traversal/      # Node traversal and branching
│   │   │   ├── context/        # Execution context
│   │   │   └── runner/         # Generic node runner
│   │   ├── queue/              # BullMQ workers/consumers
│   │   ├── scheduler/          # Cron scheduler
│   │   └── webhooks/           # Webhook processing
│   └── package.json
├── frontend/                   # React UI (existing, cleaned)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/             # Base UI components
│   │   │   └── workflow/       # Workflow-specific components
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── pages/
│   └── package.json
├── nodes/                      # All workflow nodes (NEW top-level)
│   ├── agent/
│   │   └── context/
│   │       ├── context.node.ts
│   │       ├── context.definition.ts
│   │       ├── context.ui.ts
│   │       └── index.ts
│   ├── ai/
│   ├── analytics/
│   ├── cloud/
│   ├── communication/
│   ├── core/
│   ├── data/
│   ├── development/
│   ├── file-processing/
│   ├── finance/
│   ├── integrations/
│   ├── llm/
│   ├── logic/
│   ├── productivity/
│   ├── triggers/
│   ├── utility/
│   ├── registry.ts             # Node registry
│   └── package.json
├── scripts/                    # Build/deployment scripts (existing)
├── sdk/                        # Node SDK (NEW top-level)
│   ├── src/
│   │   ├── decorators/         # @Node, @Input, @Output decorators
│   │   ├── base/               # BaseNode class
│   │   ├── validation/         # Config validation helpers
│   │   └── types/              # SDK types
│   └── package.json
├── shared/                     # Shared code (NEW top-level)
│   ├── src/
│   │   ├── types/              # Workflow, Node, Edge types
│   │   ├── constants/          # Shared constants
│   │   ├── utils/              # Common utilities
│   │   └── schemas/            # JSON schemas
│   └── package.json
├── templates/                  # Workflow templates (existing)
├── tests/                      # Test infrastructure (NEW top-level)
│   ├── e2e/                    # End-to-end tests
│   ├── integration/            # Integration tests
│   ├── unit/                   # Unit tests
│   ├── fixtures/               # Test fixtures
│   └── package.json
├── docker-compose.yml          # Root compose file
├── package.json                # Root workspace package.json
└── README.md
```

---

## 4. God-File Decomposition Plan

### 4.1 NodeConfigPanel.tsx (5,836 lines)

**Current responsibilities:**
- Base config panel layout
- Node-specific config forms for ALL 80+ nodes
- OAuth connection handlers
- File upload handlers
- Validation logic

**Split into:**
```
frontend/src/components/workflow/config/
├── NodeConfigPanel.tsx           # Main container (~200 lines)
├── ConfigPanelLayout.tsx         # Layout wrapper (~100 lines)
├── panels/
│   ├── AgentConfigPanels.tsx     # Agent node configs
│   ├── AIConfigPanels.tsx        # AI node configs
│   ├── CloudConfigPanels.tsx     # Cloud node configs
│   ├── CommunicationConfigPanels.tsx
│   ├── CoreConfigPanels.tsx
│   ├── DataConfigPanels.tsx
│   ├── IntegrationConfigPanels.tsx
│   ├── TriggerConfigPanels.tsx
│   └── UtilityConfigPanels.tsx
├── fields/
│   ├── TextField.tsx
│   ├── SelectField.tsx
│   ├── OAuthField.tsx
│   ├── FileUploadField.tsx
│   └── CodeEditorField.tsx
├── hooks/
│   ├── useNodeConfig.ts
│   ├── useOAuthConnection.ts
│   └── useConfigValidation.ts
└── index.ts
```

### 4.2 workflow-engine.ts (1,001 lines)

**Current responsibilities:**
- Workflow graph construction
- Node traversal
- Execution context management
- Node execution
- Error handling
- Result aggregation

**Split into:**
```
engine/src/core/
├── graph/
│   ├── WorkflowGraph.ts          # Graph data structure (~150 lines)
│   ├── GraphBuilder.ts           # Build graph from workflow (~100 lines)
│   └── index.ts
├── traversal/
│   ├── Traverser.ts              # DFS/BFS traversal (~150 lines)
│   ├── BranchResolver.ts         # Conditional branching (~100 lines)
│   └── index.ts
├── context/
│   ├── ExecutionContext.ts       # Context management (~150 lines)
│   ├── VariableResolver.ts       # Variable interpolation (~100 lines)
│   └── index.ts
├── runner/
│   ├── NodeRunner.ts             # Generic node executor (~150 lines)
│   ├── RetryHandler.ts           # Retry logic (~80 lines)
│   └── index.ts
├── WorkflowEngine.ts             # Orchestrator (~200 lines)
└── index.ts
```

### 4.3 nodeSchemas.ts (2,459 lines)

**Move to nodes package:**
Each node's schema should live with the node:
```
nodes/<category>/<node-name>/
├── <node-name>.definition.ts     # Node metadata and schema
├── <node-name>.ui.ts             # UI schema for frontend
└── index.ts
```

### 4.4 executor.ts (1,355 lines - FRONTEND)

**Issue:** Frontend should NOT have execution logic.

**Resolution:**
- Remove `executor.ts` from frontend
- All execution happens via API calls to backend
- Frontend only displays execution status and results

### 4.5 gmail.node.ts (2,726 lines)

**Split into:**
```
nodes/integrations/gmail/
├── gmail.node.ts                 # Main node class (~200 lines)
├── gmail.definition.ts           # Node definition (~100 lines)
├── gmail.ui.ts                   # UI schema (~100 lines)
├── operations/
│   ├── send.ts                   # Send email (~200 lines)
│   ├── read.ts                   # Read emails (~200 lines)
│   ├── search.ts                 # Search emails (~150 lines)
│   ├── labels.ts                 # Label operations (~150 lines)
│   ├── drafts.ts                 # Draft operations (~150 lines)
│   └── attachments.ts            # Attachment handling (~150 lines)
├── types.ts                      # Gmail-specific types (~100 lines)
├── utils.ts                      # Helper functions (~100 lines)
└── index.ts
```

---

## 5. File Migration Plan

### 5.1 Phase 1: Create New Top-Level Directories

```bash
# Create new directories
mkdir -p shared/src/{types,constants,utils,schemas}
mkdir -p sdk/src/{decorators,base,validation,types}
mkdir -p engine/src/core/{graph,traversal,context,runner}
mkdir -p engine/src/{queue,scheduler,webhooks}
mkdir -p db/src/{clients,repositories}
mkdir -p docker
mkdir -p tests/{e2e,integration,unit,fixtures}
mkdir -p nodes/{agent,ai,analytics,cloud,communication,core,data,development,file-processing,finance,integrations,llm,logic,productivity,triggers,utility}
```

### 5.2 Phase 2: Move Shared Types

| Old Path | New Path |
|----------|----------|
| `backend/src/utils/types.ts` | `shared/src/types/workflow.ts` |
| `backend/src/types/n8n-types.ts` | `shared/src/types/n8n-compat.ts` |
| `backend/src/core/queue/job-types.ts` | `shared/src/types/jobs.ts` |

### 5.3 Phase 3: Move Database Layer

| Old Path | New Path |
|----------|----------|
| `backend/prisma/` | `db/prisma/` |
| `backend/src/db/prisma.ts` | `db/src/clients/prisma.ts` |
| `backend/src/db/redis.ts` | `db/src/clients/redis.ts` |
| `backend/src/db/database.ts` | `db/src/repositories/workflow.repository.ts` |
| `backend/src/db/migrations/` | `db/src/migrations/` |

### 5.4 Phase 4: Extract Engine

| Old Path | New Path |
|----------|----------|
| `backend/src/core/engine/workflow-engine.ts` | `engine/src/core/WorkflowEngine.ts` (split) |
| `backend/src/core/engine/node-runner.ts` | `engine/src/core/runner/NodeRunner.ts` |
| `backend/src/core/engine/n8n-execution-adapter.ts` | `engine/src/core/compat/N8nAdapter.ts` |
| `backend/src/core/queue/` | `engine/src/queue/` |
| `backend/src/core/scheduler/` | `engine/src/scheduler/` |
| `backend/src/core/webhooks/` | `engine/src/webhooks/` |
| `backend/src/core/execution/` | `engine/src/core/execution/` |

### 5.5 Phase 5: Move Nodes

All nodes from `backend/src/nodes/<category>/<node>.node.ts` move to:
`nodes/<category>/<node-name>/<node-name>.node.ts`

Each node gets restructured into the standard format:
```
nodes/<category>/<node-name>/
├── <node-name>.node.ts
├── <node-name>.definition.ts
├── <node-name>.ui.ts
└── index.ts
```

### 5.6 Phase 6: Move Docker Files

| Old Path | New Path |
|----------|----------|
| `backend/Dockerfile` | `docker/backend.Dockerfile` |
| `backend/docker-compose.yml` | `docker/docker-compose.dev.yml` |
| `docker-compose.yml` | `docker/docker-compose.yml` |

### 5.7 Phase 7: Move Tests

| Old Path | New Path |
|----------|----------|
| `backend/src/tests/` | `tests/unit/backend/` |
| `frontend/tests/` | `tests/e2e/` |

---

## 6. Updated CI/CD Pipeline

### 6.1 New Branch Mapping

| Directory | Branch |
|-----------|--------|
| `backend/` | `backend` |
| `frontend/` | `frontend` |
| `engine/` | `engine` |
| `nodes/` | `nodes` |
| `shared/` | `shared` |
| `sdk/` | `sdk` |
| `db/` | `db` |
| `docker/` | `docker` |
| `docs/` | `docs` |
| `scripts/` | `scripts` |
| `tests/` | `tests` |
| `templates/` | `templates` |

### 6.2 Updated sync-branches.yml

See separate file: `.github/workflows/sync-branches.yml`

---

## 7. Commit Plan (Incremental & Safe)

### Phase 1: Infrastructure (Non-Breaking)
1. **Commit 1:** Create `shared/` with package.json and move types
2. **Commit 2:** Create `sdk/` with base node class and decorators
3. **Commit 3:** Update all imports to use shared types (backend)
4. **Commit 4:** Update all imports to use shared types (frontend)

### Phase 2: Database Extraction
5. **Commit 5:** Create `db/` and move Prisma schema
6. **Commit 6:** Move database clients to `db/`
7. **Commit 7:** Update backend imports to use db package

### Phase 3: Engine Extraction
8. **Commit 8:** Create `engine/` directory structure
9. **Commit 9:** Split workflow-engine.ts into modules
10. **Commit 10:** Move queue workers to engine
11. **Commit 11:** Move scheduler to engine
12. **Commit 12:** Update backend to use engine package

### Phase 4: Node Migration
13. **Commit 13:** Create `nodes/` directory structure
14. **Commit 14:** Move agent nodes (restructure format)
15. **Commit 15:** Move AI nodes
16. **Commit 16:** Move analytics nodes
17. **Commit 17:** Move cloud nodes
18. **Commit 18:** Move communication nodes
19. **Commit 19:** Move core nodes
20. **Commit 20:** Move data nodes
21. **Commit 21:** Move remaining node categories
22. **Commit 22:** Update node registry to use new locations

### Phase 5: Frontend Cleanup
23. **Commit 23:** Split NodeConfigPanel.tsx
24. **Commit 24:** Remove executor.ts (replace with API calls)
25. **Commit 25:** Split nodeSchemas.ts (move to nodes package)

### Phase 6: Test & Docker Migration
26. **Commit 26:** Create `tests/` and move test files
27. **Commit 27:** Create `docker/` and move Docker files
28. **Commit 28:** Update root docker-compose.yml

### Phase 7: CI/CD Update
29. **Commit 29:** Update sync-branches.yml with new branches
30. **Commit 30:** Final cleanup and verification

---

## 8. Validation Checklist

Before each commit:
- [ ] All TypeScript compiles without errors
- [ ] All tests pass
- [ ] Docker build succeeds
- [ ] Application starts and basic workflows execute
- [ ] No circular dependencies introduced

After refactoring complete:
- [ ] All 83 nodes function correctly
- [ ] Workflow execution works end-to-end
- [ ] Frontend can create and edit workflows
- [ ] CI/CD pipeline correctly syncs all branches
- [ ] No runtime behavior changes

---

## 9. Flagged Items (Unclear Responsibility)

1. **`backend/src/core/orchestration/`** - Multi-agent coordination. Needs clarification: does this belong in `engine/` or as a separate service?

2. **`backend/src/core/memory/`** - Memory management for agents. Should this be part of `engine/` or a separate `memory/` package?

3. **`backend/src/core/embeddings/`** - Vector embeddings. Consider: separate `embeddings/` package or part of `nodes/ai/`?

4. **`backend/src/providers/`** - LLM providers. Should be part of `nodes/llm/` or separate `providers/`?

5. **`backend/src/templates/`** - Agent templates. Move to `templates/` or keep with backend?

---

## 10. Risk Mitigation

1. **Import Path Changes:** Use TypeScript path aliases during migration to minimize import breakage

2. **Circular Dependencies:** Run `madge` after each phase to detect cycles

3. **Runtime Regression:** Maintain comprehensive test coverage before starting

4. **CI/CD Disruption:** Test branch segregation on a feature branch first

---

*Document Version: 1.0*
*Created: 2026-02-09*
*Author: Architecture Team*
