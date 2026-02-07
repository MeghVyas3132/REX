# Frontend & Backend Architecture Diagrams


## 1A. Complete High-Level Architecture (Full System)

```mermaid
flowchart LR
    A["1️⃣ React Frontend<br/>Workflow Builder UI"] --> B["2️⃣ Express API Gateway<br/>REST + SSE"]
    B --> C["3️⃣ Workflow Engine<br/>Orchestrates Runs"]
    C --> D["4️⃣ Node Runner<br/>Executes Selected Node"]
    D --> E["5️⃣ Node Library<br/>137+ Nodes (AI, Trigger, Action, Integration, Utility)"]
    E --> F["6️⃣ External Services<br/>OpenAI · Gmail · Slack · AWS · etc."]

    %% Side systems (minimal wiring)
    C --> G["7️⃣ Agent Orchestrator<br/>Multi-agent coordination"]
    C --> H["8️⃣ Queue Service<br/>Background jobs"]
    H --> I["Redis Queue"]
    C --> J["9️⃣ Execution Monitor<br/>Streams status via SSE"]
    J --> A

    %% Data storage
    B --> K["PostgreSQL<br/>Workflows · Runs · Users · Credentials"]
    C --> K
    H --> K

    %% Scheduler (single line)
    L["Cron Scheduler"] --> H

    classDef primary fill:#4A90E2,color:#fff;
    classDef accent fill:#7B68EE,color:#fff;
    class A primary;
    class B primary;
    class C accent;
    class D accent;
    class E accent;
    class F accent;
    class G accent;
    class H accent;
    class I accent;
    class J accent;
    class K accent;
    class L accent;
```

## 2. Simplified Frontend Architecture

```mermaid
graph LR
    subgraph L1["1️⃣ ENTRY"]
        START["main.tsx + App.tsx<br/>━━━━━━━━━━━━━━<br/>App Initialization<br/>Providers & Routing"]
    end

    subgraph L2["2️⃣ PAGES"]
        PAGES["Pages<br/>━━━━━━━━━━━━━━<br/>WorkflowHome<br/>WorkflowStudio<br/>Executions<br/>History<br/>Login"]
    end

    subgraph L3["3️⃣ COMPONENTS"]
        COMP["Components<br/>━━━━━━━━━━━━━━<br/>WorkflowCanvas<br/>NodeConfigPanel<br/>NodeSidebar<br/>OutputPanel<br/>UI Components"]
    end

    subgraph L4["4️⃣ STATE"]
        STATE["State Management<br/>━━━━━━━━━━━━━━<br/>AuthContext<br/>React Query<br/>Local Storage"]
    end

    subgraph L5["5️⃣ SERVICES"]
        SERVICES["API Services<br/>━━━━━━━━━━━━━━<br/>apiServices.ts<br/>authService.ts<br/>credentialService.ts"]
    end

    START -->|"1"| PAGES
    PAGES -->|"2"| COMP
    START -->|"3"| STATE
    COMP -->|"4"| SERVICES
    PAGES -->|"5"| SERVICES
    STATE -->|"6"| SERVICES

    style L1 fill:#E3F2FD
    style L2 fill:#FFF3E0
    style L3 fill:#F3E5F5
    style L4 fill:#FFEBEE
    style L5 fill:#F1F8E9
```

## 3. Simplified Backend Architecture

```mermaid
graph LR
    subgraph L1["1️⃣ SERVER STARTUP"]
        START["server.js + index.ts<br/>━━━━━━━━━━━━━━<br/>Starts Express Server<br/>Loads Middleware & Routes"]
    end

    subgraph L2["2️⃣ REQUEST HANDLING"]
        MIDDLEWARE["Middleware<br/>━━━━━━━━━━━━━━<br/>Auth, CORS, Security<br/>Rate Limiting"]
        ROUTES["API Routes (28)<br/>━━━━━━━━━━━━━━<br/>/api/workflows<br/>/api/executions<br/>/api/auth<br/>/api/nodes<br/>etc."]
    end

    subgraph L3["3️⃣ BUSINESS LOGIC"]
        CONTROLLERS["Controllers (12)<br/>━━━━━━━━━━━━━━<br/>Handle Requests<br/>Call Services"]
        SERVICES["Services (15)<br/>━━━━━━━━━━━━━━<br/>Business Logic<br/>Data Processing"]
    end

    subgraph L4["4️⃣ CORE ENGINE"]
        ENGINE["Workflow Engine<br/>━━━━━━━━━━━━━━<br/>Executes Workflows"]
        NODE_RUNNER["Node Runner<br/>━━━━━━━━━━━━━━<br/>Runs Individual Nodes"]
        MONITOR["Execution Monitor<br/>━━━━━━━━━━━━━━<br/>Real-time Updates"]
    end

    subgraph L5["5️⃣ SUPPORTING SYSTEMS"]
        NODES["Node Registry<br/>━━━━━━━━━━━━━━<br/>137+ Node Types"]
        AGENTS["Agent System<br/>━━━━━━━━━━━━━━<br/>Multi-Agent Coordination"]
        QUEUE["Queue Service<br/>━━━━━━━━━━━━━━<br/>Background Jobs"]
        SCHEDULER["Cron Scheduler<br/>━━━━━━━━━━━━━━<br/>Scheduled Workflows"]
    end

    subgraph L6["6️⃣ DATA STORAGE"]
        DB[("PostgreSQL<br/>━━━━━━━━━━━━━━<br/>Main Database")]
        REDIS[("Redis<br/>━━━━━━━━━━━━━━<br/>Queue & Cache")]
    end

    START --> MIDDLEWARE
    MIDDLEWARE --> ROUTES
    ROUTES --> CONTROLLERS
    CONTROLLERS --> SERVICES
    SERVICES --> ENGINE
    ENGINE --> NODE_RUNNER
    ENGINE --> MONITOR
    NODE_RUNNER --> NODES
    ENGINE --> AGENTS
    ENGINE --> QUEUE
    SCHEDULER --> QUEUE
    SERVICES --> DB
    ENGINE --> DB
    MONITOR --> DB
    QUEUE --> REDIS

    style L1 fill:#E3F2FD
    style L2 fill:#FFF3E0
    style L3 fill:#F3E5F5
    style L4 fill:#E8F5E9
    style L5 fill:#FFEBEE
    style L6 fill:#C8E6C9
```

## 4. Simplified Frontend to Backend Connections

```mermaid
graph LR
    subgraph FE["FRONTEND"]
        PAGES["Pages<br/>━━━━━━━━━━━━━━<br/>WorkflowHome<br/>WorkflowStudio<br/>Executions<br/>History<br/>Login"]
        SERVICES["API Services<br/>━━━━━━━━━━━━━━<br/>apiServices.ts<br/>authService.ts<br/>credentialService.ts"]
    end

    subgraph BE["BACKEND API"]
        ROUTES["API Routes<br/>━━━━━━━━━━━━━━<br/>/api/workflows<br/>/api/executions<br/>/api/auth<br/>/api/nodes<br/>/api/credentials"]
    end

    PAGES -->|"Uses"| SERVICES
    SERVICES -->|"HTTP/REST<br/>SSE"| ROUTES

    style FE fill:#E3F2FD
    style BE fill:#FFF3E0
```

## 5. Simplified Backend Internal Flow

```mermaid
graph LR
    subgraph L1["1️⃣ ROUTES"]
        R["API Routes<br/>━━━━━━━━━━━━━━<br/>Receive Requests"]
    end

    subgraph L2["2️⃣ CONTROLLERS"]
        C["Controllers<br/>━━━━━━━━━━━━━━<br/>Handle Requests"]
    end

    subgraph L3["3️⃣ SERVICES"]
        S["Services<br/>━━━━━━━━━━━━━━<br/>Business Logic"]
    end

    subgraph L4["4️⃣ CORE ENGINE"]
        E["Workflow Engine<br/>━━━━━━━━━━━━━━<br/>Executes Workflows"]
        N["Node Runner<br/>━━━━━━━━━━━━━━<br/>Runs Nodes"]
    end

    subgraph L5["5️⃣ SUPPORT"]
        REG["Node Registry<br/>━━━━━━━━━━━━━━<br/>137+ Nodes"]
        Q["Queue Service<br/>━━━━━━━━━━━━━━<br/>Background Jobs"]
    end

    subgraph L6["6️⃣ DATABASE"]
        DB[("PostgreSQL<br/>━━━━━━━━━━━━━━<br/>Data Storage")]
        REDIS[("Redis<br/>━━━━━━━━━━━━━━<br/>Queue Storage")]
    end

    R -->|"1"| C
    C -->|"2"| S
    S -->|"3"| E
    E -->|"4"| N
    N -->|"5"| REG
    E -->|"6"| Q
    S -->|"7"| DB
    E -->|"8"| DB
    Q -->|"9"| REDIS

    style L1 fill:#E3F2FD
    style L2 fill:#FFF3E0
    style L3 fill:#F3E5F5
    style L4 fill:#E8F5E9
    style L5 fill:#FFEBEE
    style L6 fill:#C8E6C9
```

## 6. Simplified Data Flow

```mermaid
graph LR
    subgraph STEP1["1️⃣ USER ACTION"]
        USER["User<br/>━━━━━━━━━━━━━━<br/>Creates/Runs Workflow"]
    end

    subgraph STEP2["2️⃣ FRONTEND"]
        FE["Frontend<br/>━━━━━━━━━━━━━━<br/>Sends Request"]
    end

    subgraph STEP3["3️⃣ BACKEND API"]
        API["API Gateway<br/>━━━━━━━━━━━━━━<br/>Routes Request"]
    end

    subgraph STEP4["4️⃣ EXECUTION"]
        ENGINE["Workflow Engine<br/>━━━━━━━━━━━━━━<br/>Executes Workflow"]
        NODES["Node Runner<br/>━━━━━━━━━━━━━━<br/>Runs Nodes"]
    end

    subgraph STEP5["5️⃣ EXTERNAL"]
        EXT["External APIs<br/>━━━━━━━━━━━━━━<br/>OpenAI, Gmail, etc."]
    end

    subgraph STEP6["6️⃣ STORAGE"]
        DB[("Database<br/>━━━━━━━━━━━━━━<br/>Save Results")]
    end

    subgraph STEP7["7️⃣ UPDATES"]
        UPDATE["Real-time Updates<br/>━━━━━━━━━━━━━━<br/>SSE to Frontend"]
    end

    USER -->|"1"| FE
    FE -->|"2"| API
    API -->|"3"| ENGINE
    ENGINE -->|"4"| NODES
    NODES -->|"5"| EXT
    ENGINE -->|"6"| DB
    ENGINE -->|"7"| UPDATE
    UPDATE -->|"8"| FE

    style STEP1 fill:#FFE0B2
    style STEP2 fill:#E3F2FD
    style STEP3 fill:#FFF3E0
    style STEP4 fill:#F3E5F5
    style STEP5 fill:#E8F5E9
    style STEP6 fill:#C8E6C9
    style STEP7 fill:#F1F8E9
```

## 7. Frontend-Backend Communication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    participant Queue
    participant ExternalAPI

    Note over User,ExternalAPI: Workflow Creation Flow
    User->>Frontend: Create Workflow
    Frontend->>Frontend: WorkflowCanvas (React Flow)
    Frontend->>Frontend: Save to LocalStorage (offline)
    Frontend->>Backend: POST /api/workflows
    Backend->>Backend: auth.middleware (JWT)
    Backend->>Backend: workflows.controller
    Backend->>Backend: workflow.service
    Backend->>Database: Prisma: Create Workflow
    Database-->>Backend: Workflow Saved
    Backend-->>Frontend: 201 Created

    Note over User,ExternalAPI: Workflow Execution Flow
    User->>Frontend: Click Run
    Frontend->>Backend: POST /api/workflows/:id/run
    Frontend->>Backend: GET /api/workflows/runs/stream (SSE)
    Backend->>Backend: workflow-engine.executeWorkflow()
    Backend->>Backend: Build Execution Graph
    Backend->>Queue: Enqueue Workflow Job
    Backend->>Backend: node-runner.executeNode()
    Backend->>ExternalAPI: Call External Service
    ExternalAPI-->>Backend: Response
    Backend->>Database: Save Node Result
    Backend->>Frontend: SSE Event (node:complete)
    Backend->>Database: Save Final Results
    Backend->>Frontend: SSE Event (workflow:complete)
    Frontend->>User: Display Results

    Note over User,ExternalAPI: Authentication Flow
    User->>Frontend: Login
    Frontend->>Backend: POST /api/auth/login
    Backend->>Backend: auth.service.validatePassword()
    Backend->>Backend: auth.service.generateJWT()
    Backend-->>Frontend: JWT Token
    Frontend->>Frontend: Store Token (localStorage)
    Frontend->>Frontend: AuthContext.updateAuth()
```

## 8. Detailed Connection Mapping

### Frontend Component → Backend API Endpoint Mapping

| Frontend Component | Frontend Service | HTTP Method | Backend Route | Backend Controller | Backend Service |
|-------------------|------------------|-------------|---------------|-------------------|-----------------|
| **WorkflowHome.tsx** | apiServices.ts | GET | `/api/workflows` | workflows.controller.getWorkflows() | workflow.service.findMany() |
| **WorkflowHome.tsx** | apiServices.ts | POST | `/api/workflows` | workflows.controller.createWorkflow() | workflow.service.create() |
| **WorkflowHome.tsx** | apiServices.ts | DELETE | `/api/workflows/:id` | workflows.controller.deleteWorkflow() | workflow.service.delete() |
| **WorkflowStudio.tsx** | apiServices.ts | GET | `/api/workflows/:id` | workflows.controller.getWorkflow() | workflow.service.findOne() |
| **WorkflowStudio.tsx** | apiServices.ts | PUT | `/api/workflows/:id` | workflows.controller.updateWorkflow() | workflow.service.update() |
| **WorkflowHeader.tsx** | apiServices.ts | POST | `/api/workflows/:id/run` | workflows.controller.runWorkflow() | workflow-engine.executeWorkflow() |
| **WorkflowExecution.tsx** | apiServices.ts | GET | `/api/workflows/runs/stream` | executions.controller.streamEvents() | execution-monitor.emitEvent() |
| **Executions.tsx** | apiServices.ts | GET | `/api/executions` | executions.controller.getExecutions() | execution.service.findMany() |
| **Executions.tsx** | apiServices.ts | GET | `/api/executions/:id` | executions.controller.getExecution() | execution.service.findOne() |
| **History.tsx** | apiServices.ts | GET | `/api/executions` | executions.controller.getExecutions() | execution.service.findMany() |
| **NodeSidebar.tsx** | nodeService.ts | GET | `/api/nodes` | nodes.controller.getNodes() | node-registry.getAllNodes() |
| **NodeConfigPanel.tsx** | nodeService.ts | GET | `/api/nodes/:type` | nodes.controller.getNodeDefinition() | node-registry.getNode() |
| **CredentialsManager.tsx** | credentialService.ts | GET | `/api/credentials` | credential.controller.getCredentials() | credential.service.findMany() |
| **CredentialsManager.tsx** | credentialService.ts | POST | `/api/credentials` | credential.controller.createCredential() | credential.service.create() |
| **CredentialsManager.tsx** | credentialService.ts | PUT | `/api/credentials/:id` | credential.controller.updateCredential() | credential.service.update() |
| **CredentialsManager.tsx** | credentialService.ts | DELETE | `/api/credentials/:id` | credential.controller.deleteCredential() | credential.service.delete() |
| **LoginPage** | authService.ts | POST | `/api/auth/login` | auth.controller.login() | auth.service.validatePassword() |
| **RegisterPage** | authService.ts | POST | `/api/auth/register` | auth.controller.register() | auth.service.createUser() |
| **OAuthManager.tsx** | apiServices.ts | GET | `/api/auth/oauth/status` | oauth.controller.getStatus() | oauth.service.getConnections() |
| **OAuthManager.tsx** | apiServices.ts | GET | `/api/auth/oauth/:provider` | oauth.controller.initiate() | oauth.service.getAuthUrl() |
| **OAuthManager.tsx** | apiServices.ts | DELETE | `/api/auth/oauth/:provider` | oauth.controller.revoke() | oauth.service.revoke() |

### Backend Service → Service Dependencies

| Service | Calls/Dependencies | Purpose |
|---------|-------------------|---------|
| **workflow.service.ts** | `prisma.workflow.*` | Database operations for workflows |
| **workflow.service.ts** | `validators.ts` | Input validation |
| **execution.service.ts** | `prisma.workflowRun.*` | Database operations for runs |
| **execution.service.ts** | `prisma.workflowRunEvent.*` | Database operations for events |
| **auth.service.ts** | `prisma.user.*` | Database operations for users |
| **auth.service.ts** | `bcrypt` | Password hashing |
| **auth.service.ts** | `jsonwebtoken` | JWT token generation |
| **credential.service.ts** | `encryption.ts` | Encrypt/decrypt credentials |
| **credential.service.ts** | `prisma.credential.*` | Database operations for credentials |
| **workflow-engine.ts** | `node-runner.ts` | Execute individual nodes |
| **workflow-engine.ts** | `execution-monitor.ts` | Emit execution events |
| **workflow-engine.ts** | `queue-service.ts` | Enqueue background jobs |
| **workflow-engine.ts** | `node-registry.ts` | Get node definitions |
| **workflow-engine.ts** | `agent-orchestrator.ts` | Coordinate agent nodes |
| **node-runner.ts** | `node-registry.ts` | Get node implementation |
| **node-runner.ts** | `credential-helper.ts` | Load node credentials |
| **node-runner.ts** | External APIs | Call external services (OpenAI, Gmail, etc.) |
| **execution-monitor.ts** | `prisma.workflowRunEvent.*` | Save events to database |
| **execution-monitor.ts** | SSE Stream | Send real-time events to frontend |
| **queue-service.ts** | `redis.ts` | Store jobs in Redis |
| **queue-service.ts** | `worker.ts` | Process background jobs |
| **worker.ts** | `workflow-engine.ts` | Execute workflows in background |
| **cron-scheduler.ts** | `queue-service.ts` | Enqueue scheduled workflows |
| **cron-scheduler.ts** | `prisma.workflow.*` | Load active workflows |
| **agent-orchestrator.ts** | `memory-manager.ts` | Store agent memory |
| **agent-orchestrator.ts** | `coordination-service.ts` | Coordinate multi-agent tasks |
| **memory-manager.ts** | `vector-storage.ts` | Store vector embeddings |
| **memory-manager.ts** | `embedding-service.ts` | Generate embeddings |
| **webhook-manager.ts** | `workflow-engine.ts` | Trigger workflows from webhooks |
| **webhook-manager.ts** | `prisma.webhook.*` | Load webhook configurations |

### Database Table Access Patterns

| Service/Component | Database Tables | Operations |
|------------------|----------------|------------|
| **workflow.service.ts** | `workflows` | CREATE, READ, UPDATE, DELETE |
| **execution.service.ts** | `workflow_runs` | CREATE, READ, UPDATE |
| **execution.service.ts** | `workflow_run_events` | CREATE, READ |
| **auth.service.ts** | `users` | CREATE, READ, UPDATE |
| **credential.service.ts** | `credentials` | CREATE, READ, UPDATE, DELETE |
| **orchestration.service.ts** | `agents` | CREATE, READ, UPDATE, DELETE |
| **orchestration.service.ts** | `agent_runs` | CREATE, READ, UPDATE |
| **memory.service.ts** | (Vector DB) | CREATE, READ, SEARCH |
| **webhook-manager.ts** | `webhooks` | READ |
| **webhook-manager.ts** | `webhook_events` | CREATE, READ |
| **cron-scheduler.ts** | `workflows` | READ (filter: isActive=true) |
| **analytics.service.ts** | `analytics` | CREATE, READ |
| **audit-logs.service.ts** | `audit_logs` | CREATE, READ |

### External API Connections

| Node Type | External Service | Connection Method |
|-----------|-----------------|-------------------|
| **OpenAI Node** | OpenAI API | HTTP REST (axios) |
| **OpenRouter Node** | OpenRouter API | HTTP REST (axios) |
| **Gmail Node** | Gmail API | Google API Client |
| **Slack Node** | Slack API | @slack/web-api |
| **Discord Node** | Discord API | discord.js |
| **Telegram Node** | Telegram API | node-telegram-bot-api |
| **WhatsApp Node** | WhatsApp | whatsapp-web.js |
| **AWS S3 Node** | AWS S3 | @aws-sdk/client-s3 |
| **Google Drive Node** | Google Drive API | Google API Client |
| **Stripe Node** | Stripe API | stripe SDK |
| **HTTP Node** | Any HTTP API | axios |
| **Database Node** | PostgreSQL | pg (connection pool) |

## 9. Component Details Reference

### Frontend Key Files

#### Entry & Configuration
- **main.tsx**: React app entry point, renders App component
- **App.tsx**: Main app component with providers (QueryClient, Auth, Router)
- **config.ts**: API configuration, base URLs, environment variables

#### Pages (9 pages)
- **WorkflowHome.tsx**: Workflow list, create/delete, execution status
- **WorkflowStudio.tsx**: Main workflow editor page
- **Executions.tsx**: Execution history and details
- **History.tsx**: Past execution results
- **OAuthManager.tsx**: OAuth connection management
- **LoginPage/RegisterPage**: Authentication UI
- **GoogleOAuthCallback.tsx**: OAuth callback handler
- **NotFound.tsx**: 404 page

#### Workflow Components
- **WorkflowCanvas.tsx**: React Flow canvas for visual workflow editing
- **NodeConfigPanel.tsx**: Node configuration and parameter input
- **NodeSidebar.tsx**: Node library with drag & drop
- **OutputPanel.tsx**: Execution results display
- **WorkflowHeader.tsx**: Save, delete, run controls
- **WorkflowDashboard.tsx**: Workflow overview and statistics
- **WorkflowExecution.tsx**: Execution hook and SSE handling

#### Node Components (4 types)
- **TriggerNode.tsx**: Schedule, webhook, manual triggers
- **AINode.tsx**: OpenAI, OpenRouter, LLM operations
- **ActionNode.tsx**: HTTP, database, file operations
- **UtilityNode.tsx**: Data transform, logic operations

#### Services & Libraries
- **apiServices.ts**: HTTP client, API calls, error handling
- **authService.ts**: Authentication, token management
- **credentialService.ts**: Credential CRUD operations
- **nodeService.ts**: Node definitions and metadata
- **workflowStorage.ts**: Local storage persistence
- **executor.ts**: Workflow execution logic
- **n8n-schema-adapter.ts**: n8n schema conversion

#### UI Components (50+ shadcn/ui)
- Button, Dialog, Form, Input, Select, Toast, Alert, Card, Table, etc.

### Backend Key Files

#### Entry Point
- **server.js**: Bootstrap script, ts-node registration
- **index.ts**: Express app setup, middleware, routes, server initialization

#### Routes (28 route files)
- **auth.routes.ts**: Authentication endpoints
- **workflows.routes.ts**: Workflow CRUD and execution
- **executions.routes.ts**: Execution history and streaming
- **nodes.routes.ts**: Node definitions and execution
- **agent.routes.ts**: Agent management
- **credentials.routes.ts**: Credential management
- **oauth.routes.ts**: OAuth integration
- Plus 21 more route files for various features

#### Controllers (12 controllers)
- **auth.controller.ts**: Login, register, token refresh
- **workflows.controller.ts**: Workflow CRUD operations
- **executions.controller.ts**: Execution management
- **nodes.controller.ts**: Node operations
- **orchestration.controller.ts**: Agent orchestration
- **credential.controller.ts**: Credential management
- Plus 6 more controllers

#### Services (15 services)
- **workflow.service.ts**: Workflow business logic
- **execution.service.ts**: Execution management
- **auth.service.ts**: Authentication logic
- **orchestration.service.ts**: Agent orchestration
- **credential.service.ts**: Credential encryption
- **memory.service.ts**: Agent memory management
- Plus 9 more services

#### Core Engine
- **workflow-engine.ts**: Main workflow execution engine
- **node-runner.ts**: Individual node execution
- **execution-monitor.ts**: Execution tracking and SSE
- **agent-orchestrator.ts**: Multi-agent coordination
- **coordination-service.ts**: Agent communication
- **workflow-manager.ts**: Workflow state management

#### Node System
- **node-registry.ts**: Central node registry
- **137+ node files** organized in categories:
  - AI nodes (13): OpenAI, OpenRouter, LLM operations
  - Trigger nodes (15): Schedule, webhook, email triggers
  - Action nodes (10): HTTP, database, file operations
  - Utility nodes (9): Transform, logic, data processing
  - Integration nodes (7): Gmail, Slack, Discord, etc.
  - Core nodes (13): Basic workflow operations
  - Data nodes (10): CSV, JSON, Excel processing
  - Plus more categories

#### Queue & Scheduler
- **queue-service.ts**: BullMQ queue management
- **worker.ts**: Background job processing
- **cron-scheduler.ts**: Scheduled workflow execution

#### Database
- **prisma.ts**: Prisma ORM client
- **database.ts**: PostgreSQL connection pool
- **redis.ts**: Redis client connection

#### Utilities
- **logger.ts**: Winston logging
- **error-handler.ts**: Error processing
- **encryption.ts**: AES encryption
- **validators.ts**: Input validation

