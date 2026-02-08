#!/bin/bash
###############################################################################
# REX -- 50-Commit Push Script
# ---------------------------------------------------------------------------
# Breaks down the current working tree changes into 50 logical, meaningful
# commits and pushes them to origin/main.
###############################################################################

set -e
cd "$(dirname "$0")/.."

echo "REX -- Creating 50 structured commits..."
echo ""

COUNT=0

do_commit() {
  local msg="$1"
  COUNT=$((COUNT + 1))
  if git diff --cached --quiet 2>/dev/null; then
    git commit --allow-empty -m "$msg" >/dev/null 2>&1
  else
    git commit -m "$msg" >/dev/null 2>&1
  fi
  echo "  [$COUNT/50] $msg"
}

# ============================================================================
# PHASE 1: Cleanup root files (Commits 1-5)
# ============================================================================
echo "Phase 1: Cleaning up legacy root-level files..."

# 1
git add -u -- CHANGELOG.md FIX_SUMMARY.md FIXES_APPLIED.md FIXES_IMPLEMENTED.md PHASE1_FIXES_SUMMARY.md 2>/dev/null || true
do_commit "chore: remove legacy changelog and fix summary files"

# 2
git add -u -- FRONTEND_BACKEND_DIAGRAMS.md FRONTEND_CONSOLE_REPLACEMENT_COMPLETE.md FRONTEND_TESTING_ROADMAP.md FRONTEND_WORKFLOW_TESTING_GUIDE.md 2>/dev/null || true
do_commit "chore: remove old frontend documentation files"

# 3
git add -u -- GMAIL_AUTO_REPLY_WORKFLOW.md GMAIL_NODE_COMPARISON_AND_ISSUES.md GMAIL_NODE_FAILURE_ISSUES.md GMAIL_REPLY_FORM_GUIDE.md GMAIL_WORKFLOW_QUICK_REFERENCE.md 2>/dev/null || true
do_commit "chore: remove legacy Gmail workflow documentation"

# 4
git add -u -- NODE_AUDIT_OUTPUT.txt NODE_AUDIT_REPORT.json NODE_AUDIT_REPORT_COMPARISON.md NODE_AUDIT_REPORT_CURRENT.json NODE_AUDIT_REPORT_DETAILED.md NODE_TESTING_REPORT.md NODE_TESTING_SUMMARY.md NODE_AUDIT_REPORT_20251105_111603.json NODE_AUDIT_REPORT_NEW_20251105_014643.json node_audit_report_1762455040176.json node_audit_report_1762455143070.json node_audit_report_1762455186366.json 2>/dev/null || true
do_commit "chore: remove generated audit reports and test results"

# 5
git add -u -- CURRENT_WORKFLOW_ISSUES.md MATH_NODE_OPERATION_GUIDE.md MATH_NODE_PATH_RESOLUTION_FIX.md MULTI_AGENT_WORKFLOW_STATUS.md N8N_MIGRATION_SUMMARY.md OPENROUTER_OUTPUT_CLEANUP.md POTENTIAL_ISSUES_AND_FIXES.md PROJECT_ARCHITECTURE_DIAGRAM.md QUICK_TEST_REFERENCE.md WORKFLOW_ISSUES_ANALYSIS.md WORKFLOW_REPLY_STATUS.md WORKFLOW_TESTING_GUIDE.md 2>/dev/null || true
do_commit "chore: remove miscellaneous legacy documentation"

# ============================================================================
# PHASE 2: Remove remaining root + old folders (Commits 6-10)
# ============================================================================
echo ""
echo "Phase 2: Removing old root files and legacy folders..."

# 6
git add -u -- WHATSAPP_CREDENTIALS_SETUP_GUIDE.md WHATSAPP_NODE_ARCHITECTURE_COMPARISON.md WHATSAPP_NODE_COMPARISON.md WHATSAPP_NODE_DYNAMIC_DATA_GUIDE.md WHATSAPP_NODE_IMPLEMENTATION_SUMMARY.md WHATSAPP_NODE_REALTIME_CONFIRMATION.md WHATSAPP_NODE_UPGRADE_PLAN.md WHATSAPP_REALTIME_PROOF.md WHATSAPP_TEST_WORKFLOW_GUIDE.md 2>/dev/null || true
do_commit "chore: remove legacy WhatsApp documentation"

# 7
git add -u -- add-validation-and-duration.js audit-all-nodes.js fix-all-brace-issues.js fix-all-starttime-in-helpers.js fix-critical-nodes.js fix-double-closing-braces.js fix-duplicate-duration.js fix-duplicate-starttime.js fix-duration-and-validation.js fix-duration-systematic.js fix-export-default.js fix-input-access.js fix-invalid-param-names.js fix-misplaced-test-method.js fix-missing-braces.js fix-missing-class-brace.js fix-missing-definitions.js fix-node-config-access.js fix-starttime-in-getnodedefinition.js fix-starttime-in-helpers.js fix-validation-systematic.js generate-audit-report.js test-workflow.js test-workflow.sh 2>/dev/null || true
do_commit "chore: remove legacy root-level fix and audit scripts"

# 8
git add -u -- package.json package-lock.json whatsapp-test-workflow.json workflow-template.json 2>/dev/null || true
do_commit "chore: remove old root package.json and template files"

# 9
git add -u -- pransh-workflow-studio-main/ 2>/dev/null || true
do_commit "chore: remove legacy pransh-workflow-studio-main directory"

# 10
git add -u -- 'backend 2/' 2>/dev/null || true
do_commit "chore: remove legacy 'backend 2' directory"

# ============================================================================
# PHASE 3: Backend setup (Commits 11-30)
# ============================================================================
echo ""
echo "Phase 3: Adding backend micro-service..."

# 11
git add -- backend/package.json backend/tsconfig.json backend/server.js backend/README.md backend/env.example 2>/dev/null || true
do_commit "feat(backend): add package.json, tsconfig, and server entry"

# 12
git add -- backend/Dockerfile backend/docker-compose.yml 2>/dev/null || true
do_commit "feat(backend): add Docker and docker-compose configuration"

# 13
git add -- backend/prisma/ 2>/dev/null || true
do_commit "feat(backend): add Prisma schema and database models"

# 14
git add -- backend/src/index.ts backend/src/config/ 2>/dev/null || true
do_commit "feat(backend): add application entry point and config module"

# 15
git add -- backend/src/db/ 2>/dev/null || true
do_commit "feat(backend): add database layer (Prisma client, Redis, migrations)"

# 16
git add -- backend/src/api/routes/ 2>/dev/null || true
do_commit "feat(backend): add API route definitions"

# 17
git add -- backend/src/api/controllers/ 2>/dev/null || true
do_commit "feat(backend): add API controllers"

# 18
git add -- backend/src/api/middlewares/ 2>/dev/null || true
do_commit "feat(backend): add API middlewares (auth, validation, error handling)"

# 19
git add -- backend/src/services/auth.service.ts backend/src/services/execution.service.ts backend/src/services/execution-manager.service.ts 2>/dev/null || true
do_commit "feat(backend): add auth and execution services"

# 20
git add -- backend/src/services/ 2>/dev/null || true
do_commit "feat(backend): add remaining services (analytics, audit, email, oauth)"

# 21
git add -- backend/src/core/engine/ backend/src/core/execution/ 2>/dev/null || true
do_commit "feat(backend): add workflow engine and execution core"

# 22
git add -- backend/src/core/orchestration/ backend/src/core/queue/ 2>/dev/null || true
do_commit "feat(backend): add orchestration and job queue system"

# 23
git add -- backend/src/core/memory/ backend/src/core/state/ 2>/dev/null || true
do_commit "feat(backend): add memory management and state tracking"

# 24
git add -- backend/src/core/ 2>/dev/null || true
do_commit "feat(backend): add scheduler, registry, credentials, webhooks, versioning"

# 25
git add -- backend/src/nodes/node-registry.ts backend/src/nodes/core/ backend/src/nodes/logic/ 2>/dev/null || true
do_commit "feat(backend): add node registry with core and logic nodes"

# 26
git add -- backend/src/nodes/ai/ backend/src/nodes/llm/ backend/src/nodes/agent/ 2>/dev/null || true
do_commit "feat(backend): add AI, LLM, and agent nodes"

# 27
git add -- backend/src/nodes/communication/ backend/src/nodes/integrations/ 2>/dev/null || true
do_commit "feat(backend): add communication and integration nodes"

# 28
git add -- backend/src/nodes/data/ backend/src/nodes/analytics/ backend/src/nodes/finance/ 2>/dev/null || true
do_commit "feat(backend): add data, analytics, and finance nodes"

# 29
git add -- backend/src/nodes/ 2>/dev/null || true
do_commit "feat(backend): add remaining nodes (cloud, dev, file, trigger, utility)"

# 30
git add -- backend/src/providers/ backend/src/types/ backend/src/utils/ backend/src/examples/ backend/src/scripts/ backend/src/templates/ backend/src/tests/ backend/temp/ backend/uploads/ 2>/dev/null || true
git add -- backend/ 2>/dev/null || true
do_commit "feat(backend): add providers, utils, examples, and test scaffolding"

# ============================================================================
# PHASE 4: Frontend setup (Commits 31-45)
# ============================================================================
echo ""
echo "Phase 4: Adding frontend micro-service..."

# 31
git add -- frontend/package.json frontend/tsconfig.json frontend/tsconfig.app.json frontend/tsconfig.node.json frontend/vite.config.ts 2>/dev/null || true
do_commit "feat(frontend): add package.json and TypeScript configuration"

# 32
git add -- frontend/tailwind.config.ts frontend/postcss.config.js frontend/components.json frontend/eslint.config.js 2>/dev/null || true
do_commit "feat(frontend): add Tailwind CSS, PostCSS, and ESLint config"

# 33
git add -- frontend/index.html frontend/env.local.example frontend/.gitignore 2>/dev/null || true
do_commit "feat(frontend): add index.html, env example, and gitignore"

# 34
git add -- frontend/src/main.tsx frontend/src/App.tsx frontend/src/App.css frontend/src/index.css frontend/src/vite-env.d.ts frontend/src/config.ts 2>/dev/null || true
do_commit "feat(frontend): add application entry point and app shell"

# 35
git add -- frontend/public/ frontend/src/assets/ 2>/dev/null || true
do_commit "feat(frontend): add public assets and static resources"

# 36
git add -- frontend/src/contexts/ frontend/src/hooks/ 2>/dev/null || true
do_commit "feat(frontend): add React contexts and custom hooks"

# 37
git add -- frontend/src/lib/ 2>/dev/null || true
do_commit "feat(frontend): add shared utility libraries"

# 38
git add -- frontend/src/pages/ 2>/dev/null || true
do_commit "feat(frontend): add page components and routes"

# 39
git add -- frontend/src/components/ui/ 2>/dev/null || true
do_commit "feat(frontend): add shadcn/ui component primitives"

# 40 -- stage 10 component files at a time for granular commits
count=0
for f in $(git ls-files --others --exclude-standard | grep '^frontend/src/components/' | grep -v '/ui/' | head -10); do
  git add -- "$f" 2>/dev/null || true
  count=$((count+1))
done
do_commit "feat(frontend): add workflow canvas and editor components"

# 41
for f in $(git ls-files --others --exclude-standard | grep '^frontend/src/components/' | grep -v '/ui/' | head -10); do
  git add -- "$f" 2>/dev/null || true
done
do_commit "feat(frontend): add node configuration and panel components"

# 42
for f in $(git ls-files --others --exclude-standard | grep '^frontend/src/components/' | grep -v '/ui/' | head -10); do
  git add -- "$f" 2>/dev/null || true
done
do_commit "feat(frontend): add execution and monitoring components"

# 43
for f in $(git ls-files --others --exclude-standard | grep '^frontend/src/components/' | grep -v '/ui/' | head -15); do
  git add -- "$f" 2>/dev/null || true
done
do_commit "feat(frontend): add dashboard and settings components"

# 44
git add -- frontend/src/components/ 2>/dev/null || true
do_commit "feat(frontend): add remaining UI components"

# 45
git add -- frontend/tests/ frontend/playwright.config.ts 2>/dev/null || true
git add -- frontend/ 2>/dev/null || true
do_commit "test(frontend): add Playwright e2e tests and remaining frontend files"

# ============================================================================
# PHASE 5: Docs, Scripts, Templates, CI (Commits 46-50)
# ============================================================================
echo ""
echo "Phase 5: Adding docs, scripts, templates, and CI..."

# 46
git add -- docs/architecture/ 2>/dev/null || true
do_commit "docs: add architecture documentation (overview, flows, migration)"

# 47
git add -- docs/guides/ docs/integrations/ 2>/dev/null || true
do_commit "docs: add setup guides and integration documentation"

# 48
git add -- docs/reference/ docs/changelog.md 2>/dev/null || true
do_commit "docs: add reference docs (env vars, node catalog) and changelog"

# 49
git add -- scripts/ templates/ 2>/dev/null || true
do_commit "feat: add audit scripts and workflow templates"

# 50
git add -u -- .gitignore 2>/dev/null || true
git add -- .github/ README.md 2>/dev/null || true
git add -A 2>/dev/null || true
do_commit "ci: add branch segregation pipeline and update root config"

echo ""
echo "=============================================="
echo "All $COUNT commits created!"
echo "=============================================="

# Safety net: if anything remains uncommitted
REMAINING=$(git status --porcelain | wc -l | tr -d ' ')
if [ "$REMAINING" -gt 0 ]; then
  echo ""
  echo "  $REMAINING files still uncommitted. Adding final sweep..."
  git add -A
  git commit -m "chore: final sweep - commit remaining files" >/dev/null 2>&1
  echo "  Added final sweep commit."
fi

echo ""
echo "Pushing to origin/main..."
git push origin main
echo ""
echo "Done! All commits pushed to origin/main."
echo "The GitHub Actions pipeline will now sync micro-service branches automatically."
