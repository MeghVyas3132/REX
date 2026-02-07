# Simple WhatsApp Test Workflow Guide

## Overview
This is a minimal workflow to test your WhatsApp node. It consists of:
1. **Manual Trigger** - Starts the workflow with test data
2. **WhatsApp Node** - Sends a text message via WhatsApp Business API

---

## Quick Setup

### Step 1: Configure WhatsApp Credentials

Before running the workflow, you need to set up your WhatsApp Business API credentials:

1. **Get your Access Token** from Meta Business Manager
2. **Get your Phone Number ID** from WhatsApp Business API settings
3. **Get your Business Account ID** (optional, needed for templates)

### Step 2: Update the Workflow

Edit `whatsapp-test-workflow.json` and replace:
- `YOUR_WHATSAPP_ACCESS_TOKEN` - Your actual access token
- `YOUR_PHONE_NUMBER_ID` - Your actual phone number ID
- `+1234567890` - The recipient phone number (must be in E.164 format)

### Step 3: Import and Run

1. Import the workflow JSON into your workflow studio
2. Click "Run" or use the Manual Trigger button
3. Check the output to see if the message was sent successfully

---

## Workflow Structure

```json
{
  "nodes": [
    {
      "id": "manual-trigger-1",
      "type": "manual-trigger",
      "data": {
        "config": {
          "inputData": {
            "recipientPhoneNumber": "+1234567890",
            "message": "Hello! This is a test message."
          }
        }
      }
    },
    {
      "id": "whatsapp-1",
      "type": "whatsapp",
      "data": {
        "config": {
          "resource": "message",
          "operation": "send",
          "messageType": "text",
          "accessToken": "YOUR_TOKEN",
          "phoneNumberId": "YOUR_ID",
          "recipientPhoneNumber": "{{ $json.recipientPhoneNumber }}",
          "textBody": "{{ $json.message }}"
        }
      }
    }
  ]
}
```

---

## Alternative: Static Values Version

If you want to test with static values (no dynamic input), use this configuration:

```json
{
  "id": "whatsapp-1",
  "type": "whatsapp",
  "data": {
    "config": {
      "resource": "message",
      "operation": "send",
      "messageType": "text",
      "accessToken": "YOUR_WHATSAPP_ACCESS_TOKEN",
      "phoneNumberId": "YOUR_PHONE_NUMBER_ID",
      "recipientPhoneNumber": "+1234567890",
      "textBody": "Hello! This is a static test message."
    }
  }
}
```

---

## Expected Output

On successful execution, you should see:

```json
{
  "success": true,
  "output": {
    "messageId": "wamid.xxx...",
    "status": "sent",
    "recipient": "+1234567890",
    "messageType": "text",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "duration": 250
  }
}
```

---

## Testing Different Message Types

### Text Message (Current)
```json
{
  "messageType": "text",
  "textBody": "Your message here"
}
```

### Template Message
```json
{
  "messageType": "template",
  "templateName": "hello_world",
  "templateLanguage": "en",
  "components": {
    "body": [
      {"type": "text", "text": "John"}
    ]
  }
}
```

### Image Message
```json
{
  "messageType": "image",
  "mediaUrl": "https://example.com/image.jpg",
  "caption": "Optional caption"
}
```

---

## Troubleshooting

### Error: "Missing access token"
- Make sure `accessToken` is set in the WhatsApp node config

### Error: "Missing phone number ID"
- Make sure `phoneNumberId` is set in the WhatsApp node config

### Error: "Invalid phone number format"
- Phone numbers must be in E.164 format: `+[country code][number]`
- Example: `+14155552671` (US), `+919876543210` (India)

### Error: "Unauthorized"
- Check that your access token is valid and not expired
- Verify the token has WhatsApp Business API permissions

### Message not received
- Ensure the recipient number has opted in to receive messages
- For test numbers, use numbers registered in your Meta Business Manager
- Check WhatsApp Business API status in Meta Business Manager

---

## Next Steps

Once this basic workflow works, you can:
1. Add more nodes (conditions, logging, etc.)
2. Test template messages
3. Test media messages (images, videos, documents)
4. Test location messages
5. Add error handling nodes

