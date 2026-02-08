# REX Node Inventory

## Summary
- **Total Node Files:** 83 (including support files)
- **Total Node Categories:** 16
- **Target Node Count:** 200+ (with new node structure)

---

## Complete Node Inventory

### 1. Agent Nodes (5 nodes)

| Current Path | New Path | Lines | Status |
|--------------|----------|-------|--------|
| `backend/src/nodes/agent/context.node.ts` | `nodes/agent/context/context.node.ts` | ~400 | Needs restructure |
| `backend/src/nodes/agent/decision.node.ts` | `nodes/agent/decision/decision.node.ts` | 606 | **GOD-FILE** |
| `backend/src/nodes/agent/goal.node.ts` | `nodes/agent/goal/goal.node.ts` | 622 | **GOD-FILE** |
| `backend/src/nodes/agent/reasoning.node.ts` | `nodes/agent/reasoning/reasoning.node.ts` | ~400 | Needs restructure |
| `backend/src/nodes/agent/state.node.ts` | `nodes/agent/state/state.node.ts` | ~350 | Needs restructure |

### 2. AI Nodes (10 nodes)

| Current Path | New Path | Lines | Status |
|--------------|----------|-------|--------|
| `backend/src/nodes/ai/audio-processor.node.ts` | `nodes/ai/audio-processor/audio-processor.node.ts` | 853 | **GOD-FILE** |
| `backend/src/nodes/ai/data-analyzer.node.ts` | `nodes/ai/data-analyzer/data-analyzer.node.ts` | 886 | **GOD-FILE** |
| `backend/src/nodes/ai/document-processor.node.ts` | `nodes/ai/document-processor/document-processor.node.ts` | ~400 | Needs restructure |
| `backend/src/nodes/ai/email-analyzer.node.ts` | `nodes/ai/email-analyzer/email-analyzer.node.ts` | 660 | **GOD-FILE** |
| `backend/src/nodes/ai/huggingface.node.ts` | `nodes/ai/huggingface/huggingface.node.ts` | 578 | **GOD-FILE** |
| `backend/src/nodes/ai/image-generator.node.ts` | `nodes/ai/image-generator/image-generator.node.ts` | 609 | **GOD-FILE** |
| `backend/src/nodes/ai/speech-to-text.node.ts` | `nodes/ai/speech-to-text/speech-to-text.node.ts` | ~400 | Needs restructure |
| `backend/src/nodes/ai/text-analyzer.node.ts` | `nodes/ai/text-analyzer/text-analyzer.node.ts` | 922 | **GOD-FILE** |
| `backend/src/nodes/ai/text-to-speech.node.ts` | `nodes/ai/text-to-speech/text-to-speech.node.ts` | 554 | **GOD-FILE** |
| `backend/src/nodes/ai/vector-search.node.ts` | `nodes/ai/vector-search/vector-search.node.ts` | ~350 | Needs restructure |

### 3. Analytics Nodes (3 nodes)

| Current Path | New Path | Lines | Status |
|--------------|----------|-------|--------|
| `backend/src/nodes/analytics/analytics.node.ts` | `nodes/analytics/analytics/analytics.node.ts` | ~300 | Needs restructure |
| `backend/src/nodes/analytics/google-analytics.node.ts` | `nodes/analytics/google-analytics/google-analytics.node.ts` | 635 | **GOD-FILE** |
| `backend/src/nodes/analytics/segment.node.ts` | `nodes/analytics/segment/segment.node.ts` | ~250 | Needs restructure |

### 4. Cloud Nodes (6 nodes)

| Current Path | New Path | Lines | Status |
|--------------|----------|-------|--------|
| `backend/src/nodes/cloud/aws-lambda.node.ts` | `nodes/cloud/aws-lambda/aws-lambda.node.ts` | ~400 | Needs restructure |
| `backend/src/nodes/cloud/aws-s3.node.ts` | `nodes/cloud/aws-s3/aws-s3.node.ts` | ~450 | **GOD-FILE** |
| `backend/src/nodes/cloud/azure-blob.node.ts` | `nodes/cloud/azure-blob/azure-blob.node.ts` | ~400 | Needs restructure |
| `backend/src/nodes/cloud/cloudwatch.node.ts` | `nodes/cloud/cloudwatch/cloudwatch.node.ts` | ~350 | Needs restructure |
| `backend/src/nodes/cloud/docker.node.ts` | `nodes/cloud/docker/docker.node.ts` | ~400 | Needs restructure |
| `backend/src/nodes/cloud/google-cloud-storage.node.ts` | `nodes/cloud/google-cloud-storage/google-cloud-storage.node.ts` | ~400 | Needs restructure |

### 5. Communication Nodes (12 nodes)

| Current Path | New Path | Lines | Status |
|--------------|----------|-------|--------|
| `backend/src/nodes/communication/discord.node.ts` | `nodes/communication/discord/discord.node.ts` | ~400 | Needs restructure |
| `backend/src/nodes/communication/email.node.ts` | `nodes/communication/email/email.node.ts` | 599 | **GOD-FILE** |
| `backend/src/nodes/communication/instagram.node.ts` | `nodes/communication/instagram/instagram.node.ts` | ~350 | Needs restructure |
| `backend/src/nodes/communication/linkedin-message.node.ts` | `nodes/communication/linkedin-message/linkedin-message.node.ts` | ~350 | Needs restructure |
| `backend/src/nodes/communication/microsoft-teams.node.ts` | `nodes/communication/microsoft-teams/microsoft-teams.node.ts` | 547 | **GOD-FILE** |
| `backend/src/nodes/communication/slack.node.ts` | `nodes/communication/slack/slack.node.ts` | ~450 | **GOD-FILE** |
| `backend/src/nodes/communication/telegram.node.ts` | `nodes/communication/telegram/telegram.node.ts` | 599 | **GOD-FILE** |
| `backend/src/nodes/communication/twitter-dm.node.ts` | `nodes/communication/twitter-dm/twitter-dm.node.ts` | ~350 | Needs restructure |
| `backend/src/nodes/communication/whatsapp/` | `nodes/communication/whatsapp/` | 845+ | **COMPLEX - Multiple files** |
| `backend/src/nodes/communication/zoom.node.ts` | `nodes/communication/zoom/zoom.node.ts` | 530 | **GOD-FILE** |

**WhatsApp Node Structure (Already well-organized):**
```
whatsapp/
├── constants.ts
├── types.ts
├── whatsapp.node.ts (845 lines - needs split)
├── descriptions/
│   ├── MediaFields.ts
│   └── MessageFields.ts
└── utils/
    ├── GenericFunctions.ts
    ├── MediaFunctions.ts
    ├── MessageFunctions.ts
    └── PhoneUtils.ts
```

### 6. Core Nodes (7 nodes)

| Current Path | New Path | Lines | Status |
|--------------|----------|-------|--------|
| `backend/src/nodes/core/audit-log.node.ts` | `nodes/core/audit-log/audit-log.node.ts` | ~250 | Needs restructure |
| `backend/src/nodes/core/code.node.ts` | `nodes/core/code/code.node.ts` | ~400 | Needs restructure |
| `backend/src/nodes/core/date-time.node.ts` | `nodes/core/date-time/date-time.node.ts` | ~300 | Needs restructure |
| `backend/src/nodes/core/http-request.node.ts` | `nodes/core/http-request/http-request.node.ts` | 703 | **GOD-FILE** |
| `backend/src/nodes/core/scheduler.node.ts` | `nodes/core/scheduler/scheduler.node.ts` | ~400 | Needs restructure |
| `backend/src/nodes/core/signature-validation.node.ts` | `nodes/core/signature-validation/signature-validation.node.ts` | ~250 | Needs restructure |
| `backend/src/nodes/core/webhook-trigger.node.ts` | `nodes/core/webhook-trigger/webhook-trigger.node.ts` | ~400 | Needs restructure |

### 7. Data Nodes (4 nodes)

| Current Path | New Path | Lines | Status |
|--------------|----------|-------|--------|
| `backend/src/nodes/data/database.node.ts` | `nodes/data/database/database.node.ts` | ~450 | **GOD-FILE** |
| `backend/src/nodes/data/mysql.node.ts` | `nodes/data/mysql/mysql.node.ts` | ~400 | Needs restructure |
| `backend/src/nodes/data/postgresql.node.ts` | `nodes/data/postgresql/postgresql.node.ts` | ~400 | Needs restructure |
| `backend/src/nodes/data/redis.node.ts` | `nodes/data/redis/redis.node.ts` | 539 | **GOD-FILE** |

### 8. Development Nodes (3 nodes)

| Current Path | New Path | Lines | Status |
|--------------|----------|-------|--------|
| `backend/src/nodes/development/github.node.ts` | `nodes/development/github/github.node.ts` | 839 | **GOD-FILE** |
| `backend/src/nodes/development/rest-api.node.ts` | `nodes/development/rest-api/rest-api.node.ts` | ~350 | Needs restructure |
| `backend/src/nodes/development/webhook-call.node.ts` | `nodes/development/webhook-call/webhook-call.node.ts` | ~300 | Needs restructure |

### 9. File Processing Nodes (4 nodes)

| Current Path | New Path | Lines | Status |
|--------------|----------|-------|--------|
| `backend/src/nodes/file-processing/data-cleaning.node.ts` | `nodes/file-processing/data-cleaning/data-cleaning.node.ts` | 944 | **GOD-FILE** |
| `backend/src/nodes/file-processing/data-transformation.node.ts` | `nodes/file-processing/data-transformation/data-transformation.node.ts` | 870 | **GOD-FILE** |
| `backend/src/nodes/file-processing/file-export.node.ts` | `nodes/file-processing/file-export/file-export.node.ts` | ~350 | Needs restructure |
| `backend/src/nodes/file-processing/file-upload.node.ts` | `nodes/file-processing/file-upload/file-upload.node.ts` | ~350 | Needs restructure |

### 10. Finance Nodes (1 node)

| Current Path | New Path | Lines | Status |
|--------------|----------|-------|--------|
| `backend/src/nodes/finance/stripe.node.ts` | `nodes/finance/stripe/stripe.node.ts` | 645 | **GOD-FILE** |

### 11. Integration Nodes (3 nodes)

| Current Path | New Path | Lines | Status |
|--------------|----------|-------|--------|
| `backend/src/nodes/integrations/gmail.node.ts` | `nodes/integrations/gmail/gmail.node.ts` | 2,726 | **CRITICAL GOD-FILE** |
| `backend/src/nodes/integrations/google-drive.node.ts` | `nodes/integrations/google-drive/google-drive.node.ts` | 754 | **GOD-FILE** |
| `backend/src/nodes/integrations/onedrive.node.ts` | `nodes/integrations/onedrive/onedrive.node.ts` | 674 | **GOD-FILE** |

### 12. LLM Nodes (3 nodes)

| Current Path | New Path | Lines | Status |
|--------------|----------|-------|--------|
| `backend/src/nodes/llm/gemini.node.ts` | `nodes/llm/gemini/gemini.node.ts` | ~400 | Needs restructure |
| `backend/src/nodes/llm/openai.node.ts` | `nodes/llm/openai/openai.node.ts` | ~500 | **GOD-FILE** |
| `backend/src/nodes/llm/openrouter.node.ts` | `nodes/llm/openrouter/openrouter.node.ts` | ~400 | Needs restructure |

### 13. Logic Nodes (1 node)

| Current Path | New Path | Lines | Status |
|--------------|----------|-------|--------|
| `backend/src/nodes/logic/condition.node.ts` | `nodes/logic/condition/condition.node.ts` | ~350 | Needs restructure |

### 14. Productivity Nodes (3 nodes)

| Current Path | New Path | Lines | Status |
|--------------|----------|-------|--------|
| `backend/src/nodes/productivity/excel.node.ts` | `nodes/productivity/excel/excel.node.ts` | ~400 | Needs restructure |
| `backend/src/nodes/productivity/google-forms.node.ts` | `nodes/productivity/google-forms/google-forms.node.ts` | ~350 | Needs restructure |
| `backend/src/nodes/productivity/google-sheets.node.ts` | `nodes/productivity/google-sheets/google-sheets.node.ts` | ~500 | **GOD-FILE** |

### 15. Trigger Nodes (7 nodes)

| Current Path | New Path | Lines | Status |
|--------------|----------|-------|--------|
| `backend/src/nodes/triggers/database-trigger.node.ts` | `nodes/triggers/database-trigger/database-trigger.node.ts` | 688 | **GOD-FILE** |
| `backend/src/nodes/triggers/email-trigger.node.ts` | `nodes/triggers/email-trigger/email-trigger.node.ts` | ~400 | Needs restructure |
| `backend/src/nodes/triggers/error-trigger.node.ts` | `nodes/triggers/error-trigger/error-trigger.node.ts` | ~250 | Needs restructure |
| `backend/src/nodes/triggers/file-trigger.node.ts` | `nodes/triggers/file-trigger/file-trigger.node.ts` | ~350 | Needs restructure |
| `backend/src/nodes/triggers/gmail-trigger.node.ts` | `nodes/triggers/gmail-trigger/gmail-trigger.node.ts` | 747 | **GOD-FILE** |
| `backend/src/nodes/triggers/manual-trigger.node.ts` | `nodes/triggers/manual-trigger/manual-trigger.node.ts` | ~200 | Needs restructure |
| `backend/src/nodes/triggers/schedule.node.ts` | `nodes/triggers/schedule/schedule.node.ts` | ~400 | Needs restructure |

### 16. Utility Nodes (3 nodes)

| Current Path | New Path | Lines | Status |
|--------------|----------|-------|--------|
| `backend/src/nodes/utility/data-converter.node.ts` | `nodes/utility/data-converter/data-converter.node.ts` | ~350 | Needs restructure |
| `backend/src/nodes/utility/image-resize.node.ts` | `nodes/utility/image-resize/image-resize.node.ts` | ~300 | Needs restructure |
| `backend/src/nodes/utility/logger.node.ts` | `nodes/utility/logger/logger.node.ts` | ~200 | Needs restructure |

---

## Registry Files

| Current Path | New Path | Lines | Status |
|--------------|----------|-------|--------|
| `backend/src/nodes/node-registry.ts` | `nodes/registry.ts` | ~300 | Move only |
| `backend/src/core/registry/node-registry.ts` | `nodes/registry/node-registry.ts` | 728 | **GOD-FILE** - Split |
| `backend/src/core/registry/node-registry-v2.ts` | `nodes/registry/node-registry-v2.ts` | ~400 | Move |
| `backend/src/core/registry/node-registry-helper.ts` | `nodes/registry/node-registry-helper.ts` | ~100 | Move |

---

## Summary Statistics

| Category | God-Files (>400 lines) | Total Nodes |
|----------|------------------------|-------------|
| Agent | 2 | 5 |
| AI | 8 | 10 |
| Analytics | 1 | 3 |
| Cloud | 1 | 6 |
| Communication | 6 | 12 |
| Core | 1 | 7 |
| Data | 2 | 4 |
| Development | 1 | 3 |
| File Processing | 2 | 4 |
| Finance | 1 | 1 |
| Integrations | 3 | 3 |
| LLM | 1 | 3 |
| Logic | 0 | 1 |
| Productivity | 1 | 3 |
| Triggers | 2 | 7 |
| Utility | 0 | 3 |
| **TOTAL** | **32** | **75** |

---

## New Node Structure Template

Each node in the new structure should follow this format:

```
nodes/<category>/<node-name>/
├── <node-name>.node.ts       # Execution logic (max 300 lines)
├── <node-name>.definition.ts # Node metadata and config schema
├── <node-name>.ui.ts         # UI schema for frontend
├── <node-name>.types.ts      # Node-specific types (if needed)
├── operations/               # For complex nodes with multiple operations
│   ├── create.ts
│   ├── read.ts
│   ├── update.ts
│   └── delete.ts
├── utils/                    # Node-specific utilities (if needed)
│   └── helpers.ts
└── index.ts                  # Re-exports
```

---

*Document Version: 1.0*
*Created: 2026-02-09*
