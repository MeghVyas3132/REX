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

