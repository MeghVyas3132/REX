# Gmail Auto-Reply Workflow - Quick Reference

## Workflow Flow Diagram

```
┌─────────────────┐
│ Manual Trigger  │ ← Click button to start
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Gmail: List     │ ← Get list of emails
│ Messages        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Gmail: Get      │ ← Fetch full email content
│ Message         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ OpenRouter:     │ ← Generate AI reply
│ Generate Reply  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Gmail: Reply    │ ← Send reply automatically
└─────────────────┘
```

---

## Node Configuration Checklist

### ✅ Node 1: Manual Trigger
- [ ] Type: `manualTrigger` or `trigger.manual`
- [ ] Button Text: "Process & Reply to Emails" (optional)

### ✅ Node 2: Gmail List Messages
- [ ] Operation: `list`
- [ ] Query: `is:unread` (or your filter)
- [ ] Max Results: `10`
- [ ] Gmail credentials configured

### ✅ Node 3: Gmail Get Message
- [ ] Operation: `get` or `getManyMessages`
- [ ] Message ID: `{{$json.messages[0].id}}`
- [ ] Format: `full`

### ✅ Node 4: OpenRouter
- [ ] Model: `openai/gpt-4o-mini`
- [ ] System Prompt: "You are a professional email assistant..."
- [ ] User Prompt: Include email content from previous node
- [ ] API Key: Set in node or environment variable
- [ ] Temperature: `0.7`
- [ ] Max Tokens: `500`

### ✅ Node 5: Gmail Reply
- [ ] Operation: `reply`
- [ ] Message ID: `{{$json.id}}` (from Get Message)
- [ ] Thread ID: `{{$json.threadId}}` (from Get Message)
- [ ] Subject: `Re: {{$json.payload.headers[?(@.name=='Subject')].value}}`
- [ ] Body: `{{$json.content}}` (from OpenRouter)

---

## Data Mapping Between Nodes

| From Node | Output Field | To Node | Input Field |
|-----------|--------------|---------|-------------|
| Manual Trigger | `{}` | Gmail List | (triggers execution) |
| Gmail List | `messages[0].id` | Gmail Get | `messageId` |
| Gmail Get | `id`, `threadId`, `payload` | OpenRouter | (via template in prompt) |
| OpenRouter | `content` | Gmail Reply | `textContent` |
| Gmail Get | `id`, `threadId` | Gmail Reply | `messageId`, `threadId` |

---

## Template Variable Reference

### Access Current Node Output
```
{{$json.fieldName}}
{{$json.messages[0].id}}
{{$json.payload.headers[?(@.name=='From')].value}}
```

### Access Previous Node Output
```
{{$node['Gmail Get Message'].json.id}}
{{$node['OpenRouter'].json.content}}
```

### Access Workflow Input
```
{{$workflow.input.fieldName}}
```

---

## Quick Start Steps

1. **Create Workflow**
   - Open workflow editor
   - Add 5 nodes in sequence

2. **Configure Nodes**
   - Follow checklist above
   - Connect nodes: Manual → List → Get → OpenRouter → Reply

3. **Set Credentials**
   - Gmail: OAuth token configured
   - OpenRouter: API key set

4. **Test**
   - Click "Run Workflow" button
   - Check each node output
   - Verify reply sent

5. **Deploy**
   - Save workflow
   - Activate workflow
   - Use manual trigger anytime

---

## Common Operations

### List Unread Emails
```json
{
  "operation": "list",
  "query": "is:unread",
  "maxResults": 10
}
```

### Get Email from Specific Sender
```json
{
  "operation": "list",
  "query": "from:sender@example.com is:unread"
}
```

### Reply with HTML Format
```json
{
  "operation": "reply",
  "htmlContent": "{{$json.content}}",
  "textContent": "{{$json.content}}"
}
```

---

## Environment Variables Needed

```bash
# OpenRouter API Key (if not set in node)
OPENROUTER_API_KEY=your_api_key_here

# Optional: OpenRouter Referrer
OPENROUTER_REFERRER=http://localhost:3000
OPENROUTER_TITLE=Workflow Studio
```

---

## Workflow Execution Flow

1. **User clicks** "Run Workflow" button
2. **Manual Trigger** fires → starts workflow
3. **Gmail List** executes → fetches email list
4. **Gmail Get** executes → retrieves full email content
5. **OpenRouter** executes → generates AI reply
6. **Gmail Reply** executes → sends reply automatically
7. **Workflow completes** → all emails processed

**No manual writing required!** 🎉

