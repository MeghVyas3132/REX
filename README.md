# REX — Visual Workflow Automation Engine

REX is a visual workflow automation platform inspired by n8n and Zapier. Build, connect, and execute multi-step workflows through a drag-and-drop canvas with **137+ built-in nodes** across 17 categories — including first-class AI/LLM support.

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────┐
│  Frontend (React + React Flow)   :5173              │
│  Visual canvas, node palette, execution monitor     │
└──────────────────┬──────────────────────────────────┘
                   │  REST + WebSocket
┌──────────────────▼──────────────────────────────────┐
│  Backend (Express + TypeScript)  :3003              │
│  WorkflowEngine → NodeRunner → NodeRegistry         │
│  Prisma (PostgreSQL) · Redis · BullMQ              │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer     | Technology                                         |
|-----------|-----------------------------------------------------|
| Frontend  | React 18, Vite, @xyflow/react, shadcn/ui, Tailwind |
| Backend   | Express.js, TypeScript, Prisma ORM                  |
| Database  | PostgreSQL                                          |
| Queue     | Redis + BullMQ                                      |
| Real-time | Socket.IO + Server-Sent Events                      |
| Auth      | JWT (access + refresh tokens)                       |

## Node Categories

Triggers · AI/LLM · Agents · Communication (Email, WhatsApp, Slack) · Data Transform · Cloud (AWS, GCP) · Database · HTTP · Code · Logic · Math · Schedule · Webhook · File · Notification · Utility

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** running locally (or via Docker)
- **Redis** running locally (or via Docker)

### 1. Backend

```bash
cd backend
cp .env.example .env        # fill in DB, Redis, JWT secrets
npm install
npx prisma migrate dev      # create tables
npm run dev                  # starts on :3003
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                  # starts on :5173
```

Open **http://localhost:5173** and start building workflows.

---

## Project Structure

> **Note:** The project is currently undergoing a major refactoring to improve modularity.
> See [docs/architecture/REFACTORING-PLAN.md](docs/architecture/REFACTORING-PLAN.md) for details.

### Target Architecture (Monorepo)

```
.
├── shared/           # @rex/shared - Shared types, utilities, contracts
├── engine/           # @rex/engine - Node-agnostic workflow execution
├── nodes/            # @rex/nodes - All workflow nodes (75+ nodes)
├── sdk/              # @rex/sdk - Client SDK for API access
├── db/               # @rex/db - Prisma schema, migrations
├── backend/          # @rex/backend - Express API, services
├── frontend/         # @rex/frontend - React visual editor
├── docker/           # Docker configurations
├── docs/             # Documentation
├── scripts/          # Utility scripts
├── tests/            # Centralized test suites
└── templates/        # Workflow templates
```

### Current Structure

```
.
├── backend/          # Express API + workflow engine
│   ├── src/
│   │   ├── core/     # engine, registry, runner
│   │   ├── nodes/    # 137+ node implementations
│   │   ├── routes/   # REST endpoints
│   │   ├── services/ # business logic
│   │   └── index.ts  # server entry point
│   └── prisma/       # schema + migrations
├── frontend/         # React visual editor
│   └── src/
│       ├── components/workflow/  # canvas, executor, panels
│       ├── pages/               # dashboard, editor, auth
│       └── App.tsx
├── docs/             # consolidated documentation
│   ├── architecture/ # system design diagrams
│   ├── integrations/ # Gmail, WhatsApp, OpenRouter guides
│   ├── guides/       # testing, OAuth setup
│   └── reference/    # node catalog, env vars
`├── scripts/          # utility scripts (node auditor)
└── templates/        # starter workflow JSON files
```

## Documentation

| Topic | Link |
|-------|------|
| Architecture Overview | [docs/architecture/overview.md](docs/architecture/overview.md) |
| Frontend ↔ Backend Flow | [docs/architecture/frontend-backend-flow.md](docs/architecture/frontend-backend-flow.md) |
| Node Catalog (all 137+ nodes) | [docs/reference/node-catalog.md](docs/reference/node-catalog.md) |
| Environment Variables | [docs/reference/environment-variables.md](docs/reference/environment-variables.md) |
| Gmail Integration | [docs/integrations/gmail.md](docs/integrations/gmail.md) |
| WhatsApp Integration | [docs/integrations/whatsapp.md](docs/integrations/whatsapp.md) |
| Testing Guide | [docs/guides/testing-workflows.md](docs/guides/testing-workflows.md) |
| OAuth Setup | [docs/guides/oauth-setup.md](docs/guides/oauth-setup.md) |
| Changelog | [docs/changelog.md](docs/changelog.md) |

---

## License

Private — All rights reserved.
