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

