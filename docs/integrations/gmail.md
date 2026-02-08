# Gmail Integration Guide

> Consolidated from multiple documentation files. Covers setup, workflows, troubleshooting, and known issues.

---

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



---

# Gmail Auto-Reply Workflow

## Overview
This workflow automatically processes Gmail messages and generates AI-powered replies using OpenRouter, all triggered manually with a single button click.

## Workflow Steps

### 1. **Manual Trigger** (Start Node)
- **Node Type**: `manualTrigger` or `trigger.manual`
- **Purpose**: Start the workflow manually from the UI
- **Configuration**:
  - Button Text: "Process & Reply to Emails" (optional)
- **Output**: Empty object `{}` (triggers the workflow)

---

### 2. **Gmail - List Messages** (Get Email List)
- **Node Type**: `gmail`
- **Operation**: `list` or `read`
- **Purpose**: Fetch list of emails from Gmail inbox
- **Configuration**:
  - **Operation**: `list` (or `read`)
  - **Query**: Optional Gmail search query (e.g., `is:unread`, `from:example@gmail.com`)
  - **Max Results**: Number of emails to process (e.g., `10`)
  - **Label IDs**: Optional label filters (e.g., `INBOX`)
- **Output**: 
  ```json
  {
    "messages": [
      {
        "id": "message_id_1",
        "threadId": "thread_id_1",
        "snippet": "Email preview..."
      },
      ...
    ]
  }
  ```

---

### 3. **Gmail - Get Message** (Fetch Full Email Content)
- **Node Type**: `gmail`
- **Operation**: `get` or `getManyMessages`
- **Purpose**: Retrieve full email content (subject, body, sender, etc.)
- **Configuration**:
  - **Operation**: `get` (for single) or `getManyMessages` (for batch)
  - **Message ID**: Use `{{$json.messages[0].id}}` (from previous node)
  - **Format**: `full` or `raw` (recommended: `full`)
- **Output**:
  ```json
  {
    "id": "message_id",
    "threadId": "thread_id",
    "snippet": "Email preview...",
    "payload": {
      "headers": [
        { "name": "From", "value": "sender@example.com" },
        { "name": "Subject", "value": "Email Subject" },
        { "name": "Date", "value": "..." }
      ],
      "body": {
        "data": "base64_encoded_body"
      }
    }
  }
  ```

---

### 4. **OpenRouter - Generate Reply** (AI Processing)
- **Node Type**: `openrouter` or `llm.openrouter`
- **Purpose**: Generate intelligent email reply using AI
- **Configuration**:
  - **Model**: `openai/gpt-4o-mini` or `anthropic/claude-3-haiku` (recommended)
  - **API Key**: Your OpenRouter API key (or set `OPENROUTER_API_KEY` env var)
  - **System Prompt**: 
    ```
    You are a professional email assistant. Generate concise, helpful, and polite email replies based on the incoming email content. Keep replies professional and to the point.
    ```
  - **User Prompt**: 
    ```
    Please generate a reply to this email:
    
    From: {{$json.payload.headers[?(@.name=='From')].value}}
    Subject: {{$json.payload.headers[?(@.name=='Subject')].value}}
    Body: [Decoded email body from previous node]
    
    Generate a professional reply.
    ```
  - **Temperature**: `0.7` (for natural responses)
  - **Max Tokens**: `500` (adjust based on expected reply length)
- **Output**:
  ```json
  {
    "content": "Generated reply text here...",
    "raw": { ... }
  }
  ```

---

### 5. **Gmail - Reply to Email** (Send Reply)
- **Node Type**: `gmail`
- **Operation**: `reply`
- **Purpose**: Send the AI-generated reply back to the sender
- **Configuration**:
  - **Operation**: `reply`
  - **Message ID**: `{{$json.id}}` (from Get Message node)
  - **Thread ID**: `{{$json.threadId}}` (from Get Message node)
  - **Subject**: `Re: {{$json.payload.headers[?(@.name=='Subject')].value}}`
  - **Body/Text Content**: `{{$json.content}}` (from OpenRouter node output)
  - **Reply To Sender Only**: `true` (optional)
- **Output**:
  ```json
  {
    "id": "sent_message_id",
    "threadId": "thread_id",
    "labelIds": ["SENT"],
    "success": true
  }
  ```

---

## Complete Workflow Structure

```
[Manual Trigger]
    ↓
[Gmail: List Messages]
    ↓
[Gmail: Get Message] (or Get Many Messages)
    ↓
[OpenRouter: Generate Reply]
    ↓
[Gmail: Reply to Email]
```

---

## Workflow Configuration Example

### Node 1: Manual Trigger
```json
{
  "type": "trigger",
  "subtype": "manual",
  "config": {
    "buttonText": "Process & Reply to Emails"
  }
}
```

### Node 2: Gmail List
```json
{
  "type": "gmail",
  "config": {
    "operation": "list",
    "query": "is:unread",
    "maxResults": 10
  }
}
```

### Node 3: Gmail Get Message
```json
{
  "type": "gmail",
  "config": {
    "operation": "get",
    "messageId": "{{$json.messages[0].id}}",
    "format": "full"
  }
}
```

### Node 4: OpenRouter
```json
{
  "type": "openrouter",
  "config": {
    "model": "openai/gpt-4o-mini",
    "systemPrompt": "You are a professional email assistant. Generate concise, helpful replies.",
    "userPrompt": "Generate a reply to: From: {{$json.payload.headers[?(@.name=='From')].value}}, Subject: {{$json.payload.headers[?(@.name=='Subject')].value}}, Body: [email body]",
    "temperature": 0.7,
    "maxTokens": 500
  }
}
```

### Node 5: Gmail Reply
```json
{
  "type": "gmail",
  "config": {
    "operation": "reply",
    "messageId": "{{$json.id}}",
    "threadId": "{{$json.threadId}}",
    "subject": "Re: {{$json.payload.headers[?(@.name=='Subject')].value}}",
    "textContent": "{{$json.content}}"
  }
}
```

---

## Advanced: Batch Processing Multiple Emails

For processing multiple emails in a loop:

1. **Gmail List** → Returns array of message IDs
2. **Loop/Iterate** over message IDs (if loop node exists)
   - **Gmail Get Message** → Get each email
   - **OpenRouter** → Generate reply
   - **Gmail Reply** → Send reply
3. **Continue** until all emails processed

---

## Required Setup

### 1. Gmail API Credentials
- OAuth 2.0 credentials configured
- Gmail API access token stored in credentials
- Required scopes: `https://www.googleapis.com/auth/gmail.send`, `https://www.googleapis.com/auth/gmail.readonly`

### 2. OpenRouter API Key
- Set `OPENROUTER_API_KEY` environment variable, OR
- Configure API key in OpenRouter node settings

### 3. Workflow Execution
- Workflow saved and active
- Manual trigger button available in UI
- Click "Run Workflow" or configured button text to execute

---

## Data Flow Between Nodes

1. **Manual Trigger** → `{}`
2. **Gmail List** → `{ messages: [...] }`
3. **Gmail Get** → `{ id, threadId, payload: {...} }`
4. **OpenRouter** → `{ content: "reply text", raw: {...} }`
5. **Gmail Reply** → `{ id: "sent_id", success: true }`

**Note**: Each node receives output from previous node via `context.input` or `context.nodeOutputs[previousNodeId]`

---

## Testing the Workflow

1. **Start with Manual Trigger**: Click "Run Workflow" button
2. **Check Gmail List**: Verify emails are fetched
3. **Check Get Message**: Verify full email content is retrieved
4. **Check OpenRouter**: Verify AI reply is generated
5. **Check Gmail Reply**: Verify reply is sent successfully

---

## Troubleshooting

### Issue: Gmail authentication fails
- **Solution**: Re-authenticate Gmail credentials in workflow settings

### Issue: OpenRouter returns error
- **Solution**: Verify API key is set correctly in environment or node config

### Issue: Reply not sending
- **Solution**: Check that message ID and thread ID are correctly passed from Get Message node

### Issue: Template variables not resolving
- **Solution**: Use correct syntax: `{{$json.field}}` for current node output, `{{$node['NodeName'].json.field}}` for specific node output

---

## Example Use Cases

1. **Customer Support**: Auto-reply to support emails with helpful information
2. **Meeting Requests**: Generate polite responses to meeting invitations
3. **Inquiry Responses**: Reply to product/service inquiries automatically
4. **Follow-ups**: Send follow-up messages based on email content

---

## Next Steps

1. Create workflow in UI with these 5 nodes
2. Connect nodes in sequence (Manual → List → Get → OpenRouter → Reply)
3. Configure each node with settings above
4. Test with a single email first
5. Scale to batch processing if needed



---

# How to Fill the Gmail Reply Form

## Overview
This guide explains how to fill out the Gmail "Reply to Email" form using template variables from previous workflow nodes.

---

## Required Fields (Must Fill)

### 1. **Thread ID** ⚠️ (Required - Currently showing error)
**Field**: `Thread ID`  
**Purpose**: Links your reply to the original email thread

**How to Fill**:
- If you have a **Gmail Get Message** node before this:
  ```
  {{$node['Gmail Get Message'].json.threadId}}
  ```
  OR if it's the directly connected previous node:
  ```
  {{$json.threadId}}
  ```

**Example**: If your previous node is named "Get Email", use:
```
{{$node['Get Email'].json.threadId}}
```

---

### 2. **Subject** ⚠️ (Required)
**Field**: `Subject`  
**Purpose**: The email subject line

**How to Fill**:
- To reply with "Re:" prefix (standard email reply format):
  ```
  Re: {{$node['Gmail Get Message'].json.payload.headers[?(@.name=='Subject')].value}}
  ```
  OR if it's the directly connected previous node:
  ```
  Re: {{$json.payload.headers[?(@.name=='Subject')].value}}
  ```

- For a custom subject:
  ```
  Reply: {{$json.payload.headers[?(@.name=='Subject')].value}}
  ```

**Example**: If your previous node is named "Get Email", use:
```
Re: {{$node['Get Email'].json.payload.headers[?(@.name=='Subject')].value}}
```

---

### 3. **Text** ⚠️ (Required)
**Field**: `Text`  
**Purpose**: The email body content (your reply text)

**How to Fill**:
- If you have an **OpenRouter** node that generated the reply:
  ```
  {{$node['OpenRouter'].json.content}}
  ```
  OR if OpenRouter is the directly connected previous node:
  ```
  {{$json.content}}
  ```

- For a static reply:
  ```
  Thank you for your email. I will get back to you soon.
  ```

**Example**: If your OpenRouter node is named "Generate Reply", use:
```
{{$node['Generate Reply'].json.content}}
```

---

## Optional Fields

### 4. **HTML** (Optional)
**Field**: `HTML`  
**Purpose**: HTML-formatted email body (if you want rich formatting)

**How to Fill**:
- If your OpenRouter node outputs HTML:
  ```
  <p>{{$node['OpenRouter'].json.content}}</p>
  ```

- For custom HTML:
  ```
  <p>Your reply text here</p>
  <p><strong>Important:</strong> Additional information</p>
  ```

---

### 5. **Reply To Message ID** (Optional)
**Field**: `Reply To Message ID`  
**Purpose**: Specific message ID to reply to (usually auto-detected from Thread ID)

**How to Fill**:
- If you have a **Gmail Get Message** node:
  ```
  {{$node['Gmail Get Message'].json.id}}
  ```
  OR:
  ```
  {{$json.id}}
  ```

**Note**: This is usually optional - Gmail can determine which message to reply to from the Thread ID.

---

### 6. **To** (Optional for Reply)
**Field**: `To`  
**Purpose**: Recipient email address (usually auto-filled from original email)

**How to Fill**:
- Usually leave empty - Gmail will automatically reply to the sender
- If you need to specify:
  ```
  {{$json.payload.headers[?(@.name=='From')].value}}
  ```

---

### 7. **CC** (Optional)
**Field**: `CC`  
**Purpose**: Carbon copy recipients

**How to Fill**:
- Static emails:
  ```
  colleague@example.com, manager@example.com
  ```

- From previous node:
  ```
  {{$json.payload.headers[?(@.name=='Cc')].value}}
  ```

---

### 8. **BCC** (Optional)
**Field**: `BCC`  
**Purpose**: Blind carbon copy recipients

**How to Fill**:
- Static emails:
  ```
  archive@example.com
  ```

---

### 9. **From** (Optional)
**Field**: `From`  
**Purpose**: Sender email address (usually uses your connected Gmail account)

**How to Fill**:
- Usually leave empty - uses your connected Gmail account
- To specify a different address:
  ```
  custom@example.com
  ```

---

### 10. **Reply To** (Optional)
**Field**: `Reply To`  
**Purpose**: Email address for replies (different from sender)

**How to Fill**:
- Static email:
  ```
  support@example.com
  ```

---

### 11. **Attachments** (Optional)
**Field**: `Attachments`  
**Purpose**: Add file attachments to your reply

**How to Fill**:
- Format (JSON array):
  ```json
  [
    {
      "name": "document.pdf",
      "content": "base64_encoded_content_here",
      "type": "application/pdf"
    }
  ]
  ```

---

## Complete Example: Auto-Reply Workflow

Based on the `GMAIL_AUTO_REPLY_WORKFLOW.md` workflow structure:

### Workflow Flow:
```
[Manual Trigger] 
  ↓
[Gmail: List Messages] 
  ↓
[Gmail: Get Message] (node name: "Get Email")
  ↓
[OpenRouter: Generate Reply] (node name: "AI Reply")
  ↓
[Gmail: Reply to Email] ← YOU ARE HERE
```

### Fill the Reply Form:

1. **Thread ID**:
   ```
   {{$node['Get Email'].json.threadId}}
   ```

2. **Subject**:
   ```
   Re: {{$node['Get Email'].json.payload.headers[?(@.name=='Subject')].value}}
   ```

3. **Text**:
   ```
   {{$node['AI Reply'].json.content}}
   ```

4. **Reply To Message ID** (optional):
   ```
   {{$node['Get Email'].json.id}}
   ```

5. **HTML** (optional):
   ```
   <p>{{$node['AI Reply'].json.content}}</p>
   ```

6. Leave all other fields empty (CC, BCC, From, Reply To, To, Attachments)

---

## Template Variable Reference

### Access Current Node Output
```
{{$json.fieldName}}
{{$json.threadId}}
{{$json.id}}
```

### Access Specific Previous Node Output
```
{{$node['Node Name'].json.fieldName}}
{{$node['Get Email'].json.threadId}}
{{$node['AI Reply'].json.content}}
```

### Access Nested Fields
```
{{$json.payload.headers[?(@.name=='Subject')].value}}
{{$json.payload.headers[?(@.name=='From')].value}}
```

### JSONPath Examples
- Get Subject header: `{{$json.payload.headers[?(@.name=='Subject')].value}}`
- Get From header: `{{$json.payload.headers[?(@.name=='From')].value}}`
- Get first message ID: `{{$json.messages[0].id}}`

---

## Quick Fill Checklist

For a typical auto-reply workflow, fill these fields:

- [ ] **Thread ID**: `{{$node['Get Email'].json.threadId}}` (or `{{$json.threadId}}`)
- [ ] **Subject**: `Re: {{$node['Get Email'].json.payload.headers[?(@.name=='Subject')].value}}`
- [ ] **Text**: `{{$node['AI Reply'].json.content}}` (or `{{$json.content}}`)
- [ ] **Reply To Message ID**: `{{$node['Get Email'].json.id}}` (optional)
- [ ] **HTML**: Leave empty or add HTML version
- [ ] **To, CC, BCC, From, Reply To**: Leave empty (auto-filled)
- [ ] **Attachments**: Leave empty unless needed

---

## Troubleshooting

### Error: "Thread ID is required"
- **Problem**: Thread ID field is empty
- **Solution**: Add `{{$node['Previous Node Name'].json.threadId}}` or `{{$json.threadId}}`

### Error: Template variable not resolving
- **Problem**: Variable shows as literal text instead of value
- **Solution**: 
  - Check node names match exactly (case-sensitive)
  - Ensure previous node has executed successfully
  - Use `{{$json.field}}` if node is directly connected

### Error: Subject is required
- **Problem**: Subject field is empty
- **Solution**: Add a subject template or static text

### Error: Body is required
- **Problem**: Text field is empty
- **Solution**: Add text content template or static text

---

## Testing

1. **Fill Required Fields**: Thread ID, Subject, Text
2. **Click "Fill Required Fields"** button (if available) to auto-fill
3. **Test the workflow** with a sample email
4. **Verify** the reply is sent correctly

---

## Notes

- Template variables use double curly braces: `{{...}}`
- Node names in templates are case-sensitive
- Use `$json` for directly connected previous node
- Use `$node['Node Name'].json` for specific node output
- Gmail will automatically handle "To" field for replies (replies to original sender)
- Thread ID is the most critical field - it links your reply to the conversation



---

# Gmail Node - Potential Failure Issues

## Overview
This document lists all potential issues that could cause Gmail node operations to fail, based on code analysis.

---

## 🔴 CRITICAL FAILURE POINTS

### 1. **No Error Handling for `response.json()` Parsing**
**Location:** All API calls throughout the file  
**Issue:** If Gmail API returns non-JSON response (e.g., HTML error page, empty body), `await response.json()` will throw `SyntaxError` and crash the node.  
**Impact:** HIGH - Node will crash on unexpected API responses  
**Example:**
```typescript
const error = await response.json(); // ❌ Will throw if response is not JSON
```
**Fix Required:**
```typescript
let error: any = {};
try {
  error = await response.json();
} catch (e) {
  error = { error: { message: response.statusText || 'Unknown error' } };
}
```

**Affected Operations:** ALL (send, read, search, get, reply, createDraft, listDrafts, getDraft, deleteDraft, listLabels, createLabel, getLabel, deleteLabel, listThreads, getThread, trashThread, untrashThread, addLabelToThread, removeLabelFromThread, addLabelToMessage, removeLabelFromMessage, deleteMessage, getManyMessages, markAsRead, markAsUnread, sendAndWait)

---

### 2. **No Rate Limiting / 429 Error Handling**
**Location:** All API calls  
**Issue:** Gmail API has rate limits. When exceeded, returns 429 status. No retry logic or exponential backoff.  
**Impact:** HIGH - Operations will fail immediately on rate limit  
**Fix Required:**
- Detect 429 status code
- Implement exponential backoff retry
- Respect `Retry-After` header
- Add configurable retry attempts

**Affected Operations:** ALL

---

### 3. **Token Expiration During Long Operations**
**Location:** `sendAndWait()` method  
**Issue:** Access token may expire during long polling (up to 3600 seconds). No token refresh logic.  
**Impact:** HIGH - `sendAndWait` will fail if token expires  
**Fix Required:**
- Check token expiration before each poll
- Refresh token if needed
- Handle token refresh errors

**Affected Operations:** sendAndWait

---

### 4. **No Validation for Email Address Format**
**Location:** `sendEmail()`, `replyToEmail()`, `createDraft()`  
**Issue:** Invalid email addresses (e.g., "notanemail", "test@", "@domain.com") will be sent to Gmail API, causing 400 errors.  
**Impact:** MEDIUM - Operations fail with cryptic Gmail API errors  
**Fix Required:**
- Validate email format before API call
- Provide clear error messages
- Support multiple recipients (comma-separated)

**Affected Operations:** send, reply, createDraft, sendAndWait

---

### 5. **Invalid Attachment Content Causes Crash**
**Location:** `createEmailMessage()` - attachment processing  
**Issue:** If attachment content is invalid base64 or corrupted, `Buffer.from()` may throw or create invalid data.  
**Impact:** MEDIUM - Node crashes when processing invalid attachments  
**Current Code:**
```typescript
attachmentData = Buffer.from(attachment.content, 'base64'); // ❌ No validation
```
**Fix Required:**
- Validate base64 format before decoding
- Handle decode errors gracefully
- Validate attachment size limits

**Affected Operations:** send, reply, createDraft

---

### 6. **Template Resolution Returns Unresolved Templates**
**Location:** `resolveTemplate()` function  
**Issue:** If template expression cannot be resolved, it returns the original template string (e.g., `{{steps.nodeId.output.field}}`). This gets sent to Gmail API as-is, causing failures.  
**Impact:** HIGH - Operations fail with invalid parameters  
**Example:**
```typescript
const messageId = "{{steps.nodeId.output.messages[0].id}}"; // Not resolved
// Gets sent to API: /messages/{{steps.nodeId.output.messages[0].id}}
```
**Fix Required:**
- Validate that required fields are not template expressions after resolution
- Throw descriptive error if template cannot be resolved
- Add validation for each operation's required fields

**Affected Operations:** ALL (when using template expressions)

---

### 7. **No Timeout Handling for API Calls**
**Location:** All `fetch()` calls  
**Issue:** Network requests can hang indefinitely. No timeout configured.  
**Impact:** MEDIUM - Operations hang forever on network issues  
**Fix Required:**
- Add timeout to all fetch calls (e.g., 30 seconds)
- Use AbortController for timeout
- Handle timeout errors gracefully

**Affected Operations:** ALL

---

### 8. **Invalid Message/Thread/Draft IDs Cause Cryptic Errors**
**Location:** All operations requiring IDs (get, delete, modify)  
**Issue:** Invalid IDs (wrong format, non-existent) return 400/404 errors with unclear messages.  
**Impact:** MEDIUM - Users get confusing error messages  
**Fix Required:**
- Validate ID format before API call
- Provide helpful error messages
- Check if ID exists before operations

**Affected Operations:** get, deleteMessage, getDraft, deleteDraft, getThread, trashThread, untrashThread, getLabel, deleteLabel, addLabelToThread, removeLabelFromThread, addLabelToMessage, removeLabelFromMessage, markAsRead, markAsUnread, reply

---

### 9. **Missing Required Fields Not Caught Early**
**Location:** Various operations  
**Issue:** Some operations check for required fields, but validation happens after template resolution. If template fails, error is unclear.  
**Impact:** MEDIUM - Confusing error messages  
**Example:**
```typescript
// In sendEmail - checks after template resolution
if (!to || !subject || !body) {
  throw new Error('to, subject, and body are required');
}
// But if to = "{{steps.nodeId.output.to}}" and not resolved, this passes validation
```
**Fix Required:**
- Validate required fields after template resolution
- Check for unresolved template expressions
- Provide field-specific error messages

**Affected Operations:** send, reply, createDraft, search, get, etc.

---

### 10. **Array Handling for labelIds/messageIds Can Fail**
**Location:** Operations using labelIds, messageIds  
**Issue:** If user provides invalid array format (e.g., string when array expected, or malformed), operations fail.  
**Impact:** MEDIUM - Operations fail with unclear errors  
**Current Code:**
```typescript
// Handles string and array, but what if it's an object or null?
if (typeof labelIds === 'string') {
  labelIds = labelIds.split(',')...
}
```
**Fix Required:**
- Validate array/string format
- Handle null/undefined gracefully
- Provide clear error messages

**Affected Operations:** readEmails, addLabelToThread, removeLabelFromThread, addLabelToMessage, removeLabelFromMessage, getManyMessages

---

## 🟡 MEDIUM PRIORITY ISSUES

### 11. **No Handling for Empty Results**
**Location:** List operations (list, read, search, listDrafts, listThreads, listLabels)  
**Issue:** If no results found, returns empty array. No indication if this is an error or expected.  
**Impact:** LOW - May confuse users  
**Fix Required:**
- Consider adding metadata (e.g., `resultCount: 0`)
- Document expected behavior

**Affected Operations:** list, read, search, listDrafts, listThreads, listLabels

---

### 12. **Base64 Decoding Errors Silently Ignored**
**Location:** `getMessage()` - body parsing  
**Issue:** Base64 decode errors are caught and ignored. User gets message without body content.  
**Impact:** LOW - Partial data returned  
**Current Code:**
```typescript
try {
  parsedMessage.text = Buffer.from(part.body.data, 'base64').toString('utf-8');
} catch (e) {
  // Ignore decode errors ❌
}
```
**Fix Required:**
- Log decode errors
- Include error in output metadata
- Try alternative decoding methods

**Affected Operations:** get, getManyMessages, getThread

---

### 13. **No Validation for maxResults Range**
**Location:** List operations  
**Issue:** Gmail API has limits (e.g., max 500 for getAll). No validation.  
**Impact:** LOW - API returns error if exceeded  
**Fix Required:**
- Validate maxResults against API limits
- Provide helpful error messages

**Affected Operations:** list, read, search, listDrafts, listThreads

---

### 14. **Invalid Query Format in Search**
**Location:** `searchEmails()`  
**Issue:** Invalid Gmail search query syntax causes API errors. No validation.  
**Impact:** MEDIUM - Search fails with unclear errors  
**Fix Required:**
- Validate query syntax (basic checks)
- Provide examples in error messages
- Document supported query operators

**Affected Operations:** search, listThreads

---

### 15. **No Handling for Concurrent Modifications**
**Location:** Modify operations (addLabel, removeLabel, delete, trash)  
**Issue:** If message/thread is modified/deleted by another process between check and operation, API returns error.  
**Impact:** LOW - Rare but possible  
**Fix Required:**
- Handle 404/409 errors gracefully
- Retry with exponential backoff
- Provide clear error messages

**Affected Operations:** deleteMessage, deleteDraft, deleteLabel, trashThread, untrashThread, addLabelToThread, removeLabelFromThread, addLabelToMessage, removeLabelFromMessage

---

### 16. **Attachment Size Limits Not Enforced**
**Location:** `createEmailMessage()`  
**Issue:** Gmail API has 25MB limit per message. No validation. Large attachments will fail.  
**Impact:** MEDIUM - Operations fail with unclear errors  
**Fix Required:**
- Validate total attachment size before API call
- Provide clear error if exceeded
- Suggest alternatives (e.g., Google Drive links)

**Affected Operations:** send, reply, createDraft

---

### 17. **No Validation for Label Name Format**
**Location:** `createLabel()`  
**Issue:** Gmail has restrictions on label names (length, characters). No validation.  
**Impact:** LOW - API returns error if invalid  
**Fix Required:**
- Validate label name format
- Check length limits
- Validate allowed characters

**Affected Operations:** createLabel

---

### 18. **Thread ID Validation Missing**
**Location:** Thread operations  
**Issue:** Invalid thread IDs cause API errors. No format validation.  
**Impact:** MEDIUM - Operations fail with unclear errors  
**Fix Required:**
- Validate thread ID format
- Provide helpful error messages

**Affected Operations:** reply, getThread, trashThread, untrashThread, addLabelToThread, removeLabelFromThread

---

### 19. **No Handling for Deleted Resources**
**Location:** Get operations (get, getDraft, getLabel, getThread)  
**Issue:** If resource was deleted, API returns 404. Error message could be clearer.  
**Impact:** LOW - Error handling exists but could be improved  
**Fix Required:**
- Detect 404 errors
- Provide resource-specific error messages
- Suggest checking if resource exists

**Affected Operations:** get, getDraft, getLabel, getThread

---

### 20. **MIME Encoding Issues with Special Characters**
**Location:** `createEmailMessage()`  
**Issue:** Special characters in subject/body may not be properly encoded, causing email format errors.  
**Impact:** LOW - Some emails may be malformed  
**Fix Required:**
- Properly encode special characters in headers
- Use RFC 2047 encoding for non-ASCII subject
- Validate email format before sending

**Affected Operations:** send, reply, createDraft

---

## 🟢 LOW PRIORITY / EDGE CASES

### 21. **No Handling for Network Interruptions**
**Location:** All API calls  
**Issue:** Network interruptions during API calls cause unhandled errors.  
**Impact:** LOW - Rare but possible  
**Fix Required:**
- Detect network errors
- Retry with exponential backoff
- Provide clear error messages

**Affected Operations:** ALL

---

### 22. **Circular References in Template Resolution**
**Location:** `resolveTemplate()` function  
**Issue:** If template references create circular dependency, resolution may hang.  
**Impact:** LOW - Rare edge case  
**Fix Required:**
- Detect circular references
- Limit resolution depth
- Provide error message

**Affected Operations:** ALL (when using templates)

---

### 23. **No Validation for HTML Content**
**Location:** `createEmailMessage()`  
**Issue:** Invalid HTML in htmlBody may cause email rendering issues.  
**Impact:** LOW - Email may display incorrectly  
**Fix Required:**
- Basic HTML validation
- Sanitize dangerous content
- Warn about potential issues

**Affected Operations:** send, reply, createDraft

---

### 24. **Missing Error Context in Logs**
**Location:** Error handling throughout  
**Issue:** Some errors don't include enough context for debugging.  
**Impact:** LOW - Makes debugging harder  
**Fix Required:**
- Include operation, nodeId, userId in all errors
- Log request/response details
- Include stack traces

**Affected Operations:** ALL

---

### 25. **No Handling for Gmail API Version Changes**
**Location:** All API calls  
**Issue:** If Gmail API changes, hardcoded endpoints may break.  
**Impact:** LOW - Long-term maintenance issue  
**Fix Required:**
- Use API version constants
- Document API version requirements
- Handle version-specific errors

**Affected Operations:** ALL

---

## 📋 SUMMARY BY OPERATION

### **Send Email**
- ❌ No JSON parsing error handling
- ❌ No rate limiting
- ❌ No email validation
- ❌ Invalid attachment handling
- ❌ No timeout
- ❌ Template resolution issues
- ❌ No attachment size validation
- ❌ MIME encoding issues

### **List Messages / Read Emails**
- ❌ No JSON parsing error handling
- ❌ No rate limiting
- ❌ No timeout
- ❌ Template resolution issues
- ❌ No maxResults validation

### **Search Emails**
- ❌ No JSON parsing error handling
- ❌ No rate limiting
- ❌ No timeout
- ❌ Template resolution issues
- ❌ No query validation
- ❌ No maxResults validation

### **Get Message**
- ❌ No JSON parsing error handling
- ❌ No rate limiting
- ❌ No timeout
- ❌ Template resolution issues
- ❌ Invalid ID handling
- ❌ Base64 decode errors ignored

### **Reply to Email**
- ❌ No JSON parsing error handling
- ❌ No rate limiting
- ❌ No timeout
- ❌ Template resolution issues
- ❌ No email validation
- ❌ Invalid attachment handling
- ❌ Invalid thread ID handling

### **Create Draft**
- ❌ No JSON parsing error handling
- ❌ No rate limiting
- ❌ No timeout
- ❌ Template resolution issues
- ❌ No email validation
- ❌ Invalid attachment handling

### **Get Many Messages**
- ❌ No JSON parsing error handling
- ❌ No rate limiting
- ❌ No timeout
- ❌ Template resolution issues
- ❌ Invalid messageIds array handling
- ❌ No error handling for individual message failures
- ❌ Base64 decode errors ignored

### **Send and Wait**
- ❌ No JSON parsing error handling
- ❌ No rate limiting
- ❌ No timeout (for polling)
- ❌ Token expiration during wait
- ❌ Template resolution issues
- ❌ No email validation

### **Label Operations**
- ❌ No JSON parsing error handling
- ❌ No rate limiting
- ❌ No timeout
- ❌ Template resolution issues
- ❌ Invalid label ID/name handling

### **Thread Operations**
- ❌ No JSON parsing error handling
- ❌ No rate limiting
- ❌ No timeout
- ❌ Template resolution issues
- ❌ Invalid thread ID handling

---

## 🎯 PRIORITY FIX ORDER

### **Must Fix (Critical):**
1. ✅ Add error handling for `response.json()` parsing
2. ✅ Add rate limiting / 429 error handling
3. ✅ Add timeout handling for API calls
4. ✅ Validate template resolution results
5. ✅ Add email address validation

### **Should Fix (High Priority):**
6. ✅ Validate attachment content
7. ✅ Add token refresh for long operations
8. ✅ Validate ID formats
9. ✅ Improve error messages
10. ✅ Validate required fields after template resolution

### **Nice to Have (Medium/Low Priority):**
11. ⚠️ Validate query syntax
12. ⚠️ Validate attachment sizes
13. ⚠️ Handle empty results
14. ⚠️ Improve base64 error handling
15. ⚠️ Add retry logic for concurrent modifications

---

**Last Updated:** 2025-01-16  
**Total Issues Found:** 25  
**Critical:** 10  
**Medium:** 10  
**Low:** 5



---

# Gmail Node Comparison with n8n - Missing Fields and Issues

## Overview
This document compares the current Gmail node implementation with n8n's Gmail node (v2) to identify missing fields, incorrect logic, and areas for improvement.

---

## 🔴 CRITICAL MISSING FIELDS

### 1. **Email Type Selector** (Send, Reply, Create Draft)
**Current:** Separate `textContent` and `htmlContent` fields  
**n8n:** Single "Email Type" dropdown (Text/HTML) + single "Message" field  
**Impact:** HIGH - Different UX pattern, less intuitive

**Required Changes:**
- Add `emailType` field (options: 'text', 'html')
- Rename `textContent` to `message` (single field)
- Show `message` field based on `emailType` selection
- Backend should use `emailType` to determine which field to use

---

### 2. **Options Collection** (Send, Reply, Create Draft)
**Current:** Fields are at top level  
**n8n:** Has an "Options" collection with additional fields  
**Impact:** HIGH - Missing important functionality

**Missing Options Fields:**
- ✅ **Attachments** (with UI for binary field selection) - PARTIALLY IMPLEMENTED
- ❌ **Sender Name** (`senderName`) - Missing
- ❌ **Reply to Sender Only** (`replyToSenderOnly`) - Missing (for Reply)
- ❌ **Append Attribution** (`appendAttribution`) - Missing
- ✅ **CC, BCC, Reply To** - Already at top level (OK)

**Required Changes:**
- Add "Options" collapsible section
- Move CC, BCC, Reply To, From to Options (or keep at top level)
- Add Sender Name field
- Add Reply to Sender Only checkbox
- Add Append Attribution checkbox
- Improve Attachments UI (binary field selector)

---

### 3. **Simplify Option** (Get Message, Get Many Messages, Get Thread)
**Current:** Always returns parsed format  
**n8n:** Has "Simplify" boolean (default: true)  
**Impact:** MEDIUM - Less control over output format

**Required Changes:**
- Add `simple` boolean field (default: true)
- When `simple: true`, return parsed/clean format
- When `simple: false`, return raw Gmail API response
- This should work with existing `format` field

---

### 4. **Return All Option** (Get All Messages, Get All Threads, Get All Drafts)
**Current:** Only has `maxResults`  
**n8n:** Has "Return All" boolean + "Limit" field  
**Impact:** MEDIUM - Can't fetch all results easily

**Required Changes:**
- Add `returnAll` boolean field (default: false)
- When `returnAll: true`, fetch all results (ignore maxResults)
- When `returnAll: false`, show "Limit" field (rename maxResults to limit)
- Implement pagination loop in backend when `returnAll: true`

---

### 5. **Filters Collection** (Get All Messages, Get All Threads)
**Current:** Only has `query` field  
**n8n:** Has "Filters" collection with multiple options  
**Impact:** HIGH - Limited search/filter capabilities

**Missing Filter Fields:**
- ❌ **Include Spam/Trash** (`includeSpamTrash`) - Missing
- ❌ **Has Attachment** (`hasAttachment`) - Missing
- ❌ **Query** - Already exists but should be in Filters
- ❌ **From** - Missing
- ❌ **To** - Missing
- ❌ **Subject** - Missing
- ❌ **Date Range** - Missing

**Required Changes:**
- Add "Filters" collapsible section
- Move `query` to Filters
- Add Include Spam/Trash checkbox
- Add Has Attachment checkbox
- Add From, To, Subject fields
- Add Date Range fields (From Date, To Date)
- Backend should build query from filters

---

### 6. **Download Attachments Option** (Get Message, Get Draft, Get Thread)
**Current:** Not implemented  
**n8n:** Has "Download Attachments" boolean + "Attachment Prefix" field  
**Impact:** MEDIUM - Can't download attachments automatically

**Required Changes:**
- Add `downloadAttachments` boolean (default: false)
- Add `dataPropertyAttachmentsPrefixName` string (default: 'attachment_')
- When enabled, download attachments and add to output
- Use prefix for attachment property names (attachment_0, attachment_1, etc.)

---

### 7. **Attachment Prefix** (Get Message, Get Draft, Get Thread)
**Current:** Not implemented  
**n8n:** Has "Attachment Prefix" field in Options  
**Impact:** LOW - Less control over attachment property names

**Required Changes:**
- Add `dataPropertyAttachmentsPrefixName` field
- Use this prefix when downloading attachments

---

### 8. **Return Only Messages** (Get Thread)
**Current:** Returns full thread  
**n8n:** Has "Return Only Messages" option  
**Impact:** LOW - Less control over output

**Required Changes:**
- Add `returnOnlyMessages` boolean (default: false)
- When true, return only messages array (not full thread object)

---

### 9. **From Alias** (Create Draft)
**Current:** Only has `from` email  
**n8n:** Has "From Alias" field  
**Impact:** LOW - Can't set display name separately

**Required Changes:**
- Add `fromAlias` field in Options
- Use format: `"Display Name <email@example.com>"` when both provided

---

### 10. **Thread ID in Options** (Create Draft)
**Current:** Not supported  
**n8n:** Can specify Thread ID in Options for Create Draft  
**Impact:** LOW - Can't create draft in existing thread

**Required Changes:**
- Add `threadId` field in Options for Create Draft
- Use this when creating draft to add to existing thread

---

## 🟡 OPERATION-SPECIFIC ISSUES

### **Send Email Operation**
**Missing:**
- ❌ Sender Name option
- ❌ Append Attribution option
- ❌ Better attachments UI (binary field selector)
- ❌ Email Type selector (Text/HTML)

**Current Fields:**
- ✅ To, Subject, Text, HTML, CC, BCC, From, Reply To
- ✅ Attachments (basic)

---

### **Reply to Email Operation**
**Missing:**
- ❌ Reply to Sender Only option
- ❌ Sender Name option
- ❌ Append Attribution option
- ❌ Email Type selector (Text/HTML)
- ❌ Better attachments UI

**Current Fields:**
- ✅ Thread ID, To, Subject, Text, HTML, Reply To Message ID
- ✅ CC, BCC, From, Reply To

---

### **Create Draft Operation**
**Missing:**
- ❌ From Alias option
- ❌ Thread ID in Options
- ❌ Sender Name option
- ❌ Email Type selector (Text/HTML)
- ❌ Better attachments UI

**Current Fields:**
- ✅ To, Subject, Text, HTML, CC, BCC, From, Reply To
- ✅ Attachments (basic)

---

### **Get Message Operation**
**Missing:**
- ❌ Simplify option
- ❌ Download Attachments option
- ❌ Attachment Prefix option

**Current Fields:**
- ✅ Message ID, Format

---

### **List Messages / Read Emails Operation**
**Missing:**
- ❌ Return All option
- ❌ Limit field (instead of Max Results)
- ❌ Filters collection (Include Spam/Trash, Has Attachment, etc.)
- ❌ Simplify option

**Current Fields:**
- ✅ Max Results, Page Token, Label IDs

**Note:** "List Messages" and "Read Emails" seem to be the same operation. n8n uses "Get All" for messages.

---

### **Search Emails Operation**
**Missing:**
- ❌ Return All option
- ❌ Limit field
- ❌ Filters collection
- ❌ Simplify option

**Current Fields:**
- ✅ Query, Max Results, Page Token

---

### **Get Many Messages Operation**
**Missing:**
- ❌ Simplify option
- ❌ Download Attachments option
- ❌ Attachment Prefix option

**Current Fields:**
- ✅ Message IDs, Format

---

### **Get Thread Operation**
**Missing:**
- ❌ Simplify option
- ❌ Return Only Messages option
- ❌ Download Attachments option
- ❌ Attachment Prefix option

**Current Fields:**
- ✅ Thread ID, Format

---

### **List Threads Operation**
**Missing:**
- ❌ Return All option
- ❌ Limit field
- ❌ Filters collection
- ❌ Simplify option

**Current Fields:**
- ✅ Query, Max Results, Page Token

---

### **List Drafts Operation**
**Missing:**
- ❌ Return All option
- ❌ Limit field

**Current Fields:**
- ✅ Max Results, Page Token

---

### **Get Draft Operation**
**Missing:**
- ❌ Download Attachments option
- ❌ Attachment Prefix option

**Current Fields:**
- ✅ Draft ID

---

### **Create Label Operation**
**Current Fields:**
- ✅ Label Name, Label List Visibility, Message List Visibility

**Status:** ✅ Complete (matches n8n)

---

### **Add/Remove Label to Thread/Message Operations**
**Current Fields:**
- ✅ Thread ID / Message ID, Label IDs

**Status:** ✅ Complete (matches n8n)

---

## 🟢 BACKEND LOGIC ISSUES

### 1. **Attachment Handling**
**Current:** Basic attachment support  
**n8n:** Advanced attachment handling with binary field selection

**Required Changes:**
- Support `attachmentsUi.attachmentsBinary[].property` format
- Allow selecting binary fields from previous nodes
- Download attachments when `downloadAttachments: true`
- Use `dataPropertyAttachmentsPrefixName` for property names

---

### 2. **Query Building from Filters**
**Current:** Only supports direct query string  
**n8n:** Builds query from filters collection

**Required Changes:**
- Build Gmail query from filters object
- Support: from, to, subject, has:attachment, date ranges
- Combine with existing query string

---

### 3. **Pagination for Return All**
**Current:** Only returns one page  
**n8n:** Loops through pages when `returnAll: true`

**Required Changes:**
- Implement pagination loop in backend
- Continue fetching until no more pages
- Combine all results into single array

---

### 4. **Simplify Output**
**Current:** Always returns parsed format  
**n8n:** Returns simplified or raw based on `simple` flag

**Required Changes:**
- When `simple: true`, return clean parsed format (current behavior)
- When `simple: false`, return raw Gmail API response
- Apply to Get Message, Get Many Messages, Get Thread operations

---

### 5. **Email Type Handling**
**Current:** Uses both textContent and htmlContent  
**n8n:** Uses single `message` field + `emailType` selector

**Required Changes:**
- Support `emailType` field ('text' or 'html')
- Use `message` field for content
- Set appropriate MIME type based on `emailType`

---

## 📋 SUMMARY OF REQUIRED CHANGES

### **High Priority:**
1. ✅ Add Email Type selector (Text/HTML) + single Message field
2. ✅ Add Options collection with Sender Name, Reply to Sender Only, Append Attribution
3. ✅ Add Filters collection for Get All operations
4. ✅ Add Return All + Limit fields
5. ✅ Improve Attachments UI (binary field selector)

### **Medium Priority:**
6. ✅ Add Simplify option
7. ✅ Add Download Attachments option
8. ✅ Implement pagination for Return All

### **Low Priority:**
9. ✅ Add Attachment Prefix option
10. ✅ Add Return Only Messages option
11. ✅ Add From Alias option
12. ✅ Add Thread ID in Options for Create Draft

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

1. **Phase 1: Core UX Improvements**
   - Email Type selector + Message field
   - Options collection structure
   - Return All + Limit fields

2. **Phase 2: Advanced Features**
   - Filters collection
   - Simplify option
   - Download Attachments

3. **Phase 3: Polish**
   - Attachment Prefix
   - Return Only Messages
   - From Alias
   - Other minor options

---

## 📝 NOTES

- **Operation Naming:** Consider renaming "List Messages" to "Get All Messages" to match n8n
- **Field Organization:** Consider grouping related fields in collapsible sections (Options, Filters)
- **Backward Compatibility:** Ensure existing workflows continue to work after changes
- **Documentation:** Update user documentation with new fields and options

---

## ✅ CURRENTLY WORKING CORRECTLY

- ✅ All 27 operations are implemented
- ✅ OAuth2 authentication works
- ✅ Template expression resolution works
- ✅ Variable selector (`{}` button) works
- ✅ Basic field validation works
- ✅ Output format is clean and readable
- ✅ Label operations are complete
- ✅ Thread operations are complete
- ✅ Draft operations are mostly complete

---

**Last Updated:** 2025-01-16  
**Comparison Based On:** n8n Gmail Node v2

