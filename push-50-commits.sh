#!/bin/bash
# Script to create 50 commits with short messages

cd /Users/meghvyas/Desktop/REX

# Commit 1-5: README and docs
git add README.md && git commit -m "Update README with project overview" 2>/dev/null || true
git add docs/ && git commit -m "Update documentation files" 2>/dev/null || true

# Commit 6-10: Backend config
git add backend/package.json && git commit -m "Rename backend package to @rex/backend" 2>/dev/null || true
git add backend/tsconfig.json && git commit -m "Update TypeScript config for monorepo" 2>/dev/null || true
git add backend/env.example && git commit -m "Update environment example file" 2>/dev/null || true

# Commit 11-15: Remove duplicates
git add backend/Dockerfile backend/docker-compose.yml && git commit -m "Remove duplicate Docker files" 2>/dev/null || true

# Commit 16-25: Backend API controllers
git add backend/src/api/controllers/audit-logs.controller.ts && git commit -m "Update audit controller imports" 2>/dev/null || true
git add backend/src/api/controllers/credentials.controller.ts && git commit -m "Update credentials controller imports" 2>/dev/null || true
git add backend/src/api/controllers/email-data.controller.ts && git commit -m "Update email controller imports" 2>/dev/null || true
git add backend/src/api/controllers/executions.controller.ts && git commit -m "Update executions controller imports" 2>/dev/null || true
git add backend/src/api/controllers/webhooks.controller.ts && git commit -m "Update webhooks controller imports" 2>/dev/null || true
git add backend/src/api/controllers/workflows.controller.ts && git commit -m "Update workflows controller imports" 2>/dev/null || true

# Commit 26-30: Backend API routes
git add backend/src/api/routes/communication.routes.ts && git commit -m "Use @rex/nodes in communication routes" 2>/dev/null || true
git add backend/src/api/routes/triggers.routes.ts && git commit -m "Use @rex/nodes in trigger routes" 2>/dev/null || true
git add backend/src/api/routes/queue.routes.ts && git commit -m "Update queue routes imports" 2>/dev/null || true
git add backend/src/api/routes/*.ts && git commit -m "Update remaining route imports" 2>/dev/null || true

# Commit 31-35: Backend core engine
git add backend/src/core/engine/workflow-engine.ts && git commit -m "Update workflow engine imports" 2>/dev/null || true
git add backend/src/core/engine/node-runner.ts && git commit -m "Update node runner imports" 2>/dev/null || true
git add backend/src/core/engine/n8n-execution-adapter.ts && git commit -m "Update execution adapter imports" 2>/dev/null || true
git add backend/src/core/engine/*.ts && git commit -m "Update engine module imports" 2>/dev/null || true

# Commit 36-40: Backend core modules
git add backend/src/core/memory/*.ts && git commit -m "Update memory module imports" 2>/dev/null || true
git add backend/src/core/orchestration/*.ts && git commit -m "Update orchestration module imports" 2>/dev/null || true
git add backend/src/core/registry/*.ts && git commit -m "Update registry module imports" 2>/dev/null || true
git add backend/src/core/state/*.ts && git commit -m "Update state module imports" 2>/dev/null || true
git add backend/src/core/webhooks/*.ts && git commit -m "Update webhooks module imports" 2>/dev/null || true
git add backend/src/core/*.ts && git commit -m "Update remaining core imports" 2>/dev/null || true

# Commit 41-45: Backend services
git add backend/src/services/workflow.service.ts && git commit -m "Update workflow service imports" 2>/dev/null || true
git add backend/src/services/execution.service.ts && git commit -m "Update execution service imports" 2>/dev/null || true
git add backend/src/services/orchestration.service.ts && git commit -m "Update orchestration service imports" 2>/dev/null || true
git add backend/src/services/template.service.ts && git commit -m "Update template service imports" 2>/dev/null || true
git add backend/src/services/*.ts && git commit -m "Update remaining service imports" 2>/dev/null || true

# Commit 46-50: Backend misc and tests
git add backend/src/templates/*.ts && git commit -m "Update templates imports" 2>/dev/null || true
git add backend/src/tests/*.ts && git commit -m "Update test file imports" 2>/dev/null || true
git add backend/src/examples/*.ts && git commit -m "Update example file imports" 2>/dev/null || true
git add backend/src/*.ts && git commit -m "Update backend entry imports" 2>/dev/null || true

# Nodes package updates
git add nodes/registry/node-registry.ts && git commit -m "Add backward compatibility to registry" 2>/dev/null || true
git add nodes/triggers/index.ts && git commit -m "Add triggers barrel export" 2>/dev/null || true
git add nodes/triggers/database-trigger/*.ts && git commit -m "Fix database trigger imports" 2>/dev/null || true
git add nodes/tsconfig.json && git commit -m "Update nodes TypeScript config" 2>/dev/null || true
git add nodes/package.json && git commit -m "Add node types to dependencies" 2>/dev/null || true
git add nodes/*.ts && git commit -m "Update nodes package exports" 2>/dev/null || true

# Shared package
git add shared/ && git commit -m "Update shared types package" 2>/dev/null || true

# DB package
git add db/ && git commit -m "Clean up db package" 2>/dev/null || true

# Engine package
git add engine/ && git commit -m "Update engine package" 2>/dev/null || true

# Docker configs
git add docker/ && git commit -m "Update Docker configurations" 2>/dev/null || true

# Root configs
git add package.json && git commit -m "Update root workspace config" 2>/dev/null || true
git add docker-compose.yml && git commit -m "Update root docker compose" 2>/dev/null || true

# SDK and tests
git add sdk/ && git commit -m "Update SDK package" 2>/dev/null || true
git add tests/ && git commit -m "Update test infrastructure" 2>/dev/null || true

# Scripts and templates
git add scripts/ && git commit -m "Update build scripts" 2>/dev/null || true
git add templates/ && git commit -m "Update workflow templates" 2>/dev/null || true

# Catch any remaining files
git add -A && git commit -m "Miscellaneous cleanup and fixes" 2>/dev/null || true

echo "Done creating commits!"
git log --oneline -50
