# WhatsApp Node - Dynamic Data Integration Guide

## Overview

The WhatsApp node now fully supports **real-time data from previous workflow nodes**. All fields can receive data dynamically from connected nodes, making it perfect for workflow automation.

---

## How It Works

### Data Priority Order

The node resolves field values in this priority order:
1. **`context.input`** - Data from previous nodes (highest priority)
2. **`config`** - Static configuration from node settings
3. **Default value** - Fallback default

### Supported Input Field Names

The node accepts multiple field name variations for flexibility:

| Field | Accepted Input Names |
|-------|---------------------|
| **Recipient** | `recipientPhoneNumber`, `recipient`, `to`, `phoneNumber` |
| **Message Text** | `textBody`, `message`, `text`, `content` |
| **Media URL** | `mediaLink`, `mediaUrl`, `url` |
| **Media ID** | `mediaId`, `mediaGetId`, `mediaDeleteId` |
| **Binary Data** | `mediaData`, `binaryData`, `data`, `file` |
| **Filename** | `mediaFileName`, `filename`, `fileName` |
| **Caption** | `mediaCaption`, `caption` |
| **Template** | `template`, `templateName` |
| **Components** | `components`, `templateComponents` |
| **Location** | `longitude`, `latitude`, `locationName`, `locationAddress`, `name`, `address` |

---

## Usage Examples

### Example 1: Simple Text Message from Previous Node

**Previous Node Output:**
```json
{
  "phoneNumber": "+1234567890",
  "message": "Hello from workflow!"
}
```

**WhatsApp Node Configuration:**
- **Recipient Phone Number**: Leave empty (will use `phoneNumber` from input)
- **Message Type**: Text
- **Text Body**: Leave empty (will use `message` from input)

**Result**: Node automatically uses `phoneNumber` and `message` from previous node.

---

### Example 2: Template Message with Dynamic Data

**Previous Node Output:**
```json
{
  "to": "+1234567890",
  "customerName": "John Doe",
  "orderNumber": "ORD-12345"
}
```

**WhatsApp Node Configuration:**
- **Operation**: Send Template
- **Template**: `order_confirmation|en`
- **Components**: 
  ```json
  {
    "component": [{
      "type": "body",
      "bodyParameters": {
        "parameter": [
          { "type": "text", "text": "{{$json.customerName}}" },
          { "type": "text", "text": "{{$json.orderNumber}}" }
        ]
      }
    }]
  }
  ```

---

### Example 3: Media Message with Binary Data

**Previous Node Output:**
```json
{
  "recipient": "+1234567890",
  "imageData": {
    "data": "<base64-encoded-image>",
    "mimeType": "image/jpeg",
    "fileName": "photo.jpg"
  },
  "caption": "Check out this image!"
}
```

**WhatsApp Node Configuration:**
- **Message Type**: Image
- **Media Source**: Binary Data
- **Binary Data Field Name**: `imageData`
- **Caption**: Leave empty (will use `caption` from input)

---

### Example 4: Processing Multiple Items

**Previous Node Output (Array):**
```json
[
  { "phone": "+1234567890", "message": "Hello 1" },
  { "phone": "+0987654321", "message": "Hello 2" },
  { "phone": "+1122334455", "message": "Hello 3" }
]
```

**WhatsApp Node Configuration:**
- **Recipient Phone Number**: Leave empty
- **Text Body**: Leave empty

**Result**: Node processes each item in the array and sends 3 separate messages.

---

### Example 5: Location Message

**Previous Node Output:**
```json
{
  "to": "+1234567890",
  "longitude": -122.4194,
  "latitude": 37.7749,
  "name": "San Francisco",
  "address": "123 Main St, San Francisco, CA"
}
```

**WhatsApp Node Configuration:**
- **Message Type**: Location
- **Longitude**: Leave empty (uses `longitude` from input)
- **Latitude**: Leave empty (uses `latitude` from input)
- **Location Name**: Leave empty (uses `name` from input)
- **Location Address**: Leave empty (uses `address` from input)

---

## Array Processing

When the node receives an **array** from a previous node, it automatically:
1. Iterates through each item
2. Processes each item individually
3. Returns results as an array

**Input Array:**
```json
[
  { "phone": "+111", "text": "Message 1" },
  { "phone": "+222", "text": "Message 2" }
]
```

**Output:**
```json
{
  "results": [
    { "messageId": "msg1", "status": "sent", "recipient": "+111" },
    { "messageId": "msg2", "status": "sent", "recipient": "+222" }
  ]
}
```

---

## Credentials from Previous Nodes

You can also pass credentials dynamically:

**Previous Node Output:**
```json
{
  "accessToken": "EAA...",
  "businessAccountId": "123456789",
  "phoneNumberId": "987654321",
  "recipient": "+1234567890",
  "message": "Hello!"
}
```

The node will use these credentials if provided in the input.

---

## Field Mapping Reference

### Message Fields

| Config Field | Input Field Names (in priority order) |
|--------------|--------------------------------------|
| `recipientPhoneNumber` | `recipientPhoneNumber`, `recipient`, `to`, `phoneNumber` |
| `textBody` | `textBody`, `message`, `text`, `content` |
| `messageType` | `messageType` |
| `previewUrl` | `previewUrl` |
| `template` | `template`, `templateName` |
| `components` | `components`, `templateComponents` |

### Media Fields

| Config Field | Input Field Names (in priority order) |
|--------------|--------------------------------------|
| `mediaPath` | `mediaPath` |
| `mediaLink` | `mediaLink`, `mediaUrl`, `url` |
| `mediaId` | `mediaId` |
| `mediaData` | `mediaData`, `binaryData`, `data`, `file` |
| `mediaCaption` | `mediaCaption`, `caption` |
| `mediaFilename` | `mediaFileName`, `filename`, `fileName` |

### Location Fields

| Config Field | Input Field Names (in priority order) |
|--------------|--------------------------------------|
| `longitude` | `longitude` |
| `latitude` | `latitude` |
| `locationName` | `locationName`, `name` |
| `locationAddress` | `locationAddress`, `address` |

### Credential Fields

| Config Field | Input Field Names (in priority order) |
|--------------|--------------------------------------|
| `accessToken` | `accessToken` |
| `businessAccountId` | `businessAccountId` |
| `phoneNumberId` | `phoneNumberId` |

---

## Best Practices

1. **Use Descriptive Field Names**: Name your output fields clearly (e.g., `phoneNumber`, `message`, `recipient`)

2. **Provide Fallbacks**: Set default values in node config as fallbacks

3. **Handle Arrays**: If processing multiple items, ensure your previous node outputs an array

4. **Validate Data**: The node validates required fields and provides clear error messages

5. **Preserve Input Data**: All input data is preserved in the output, so downstream nodes can access it

---

## Error Handling

If a required field is missing, the node will:
1. Check `context.input` for the field
2. Check `config` for the field
3. Throw a clear error message indicating which field is missing

**Example Error:**
```
Required parameter "recipientPhoneNumber" is missing
```

This means neither the input nor config has a recipient phone number.

---

## Output Structure

The node output includes:
- **Input data preserved**: All input fields are preserved
- **Operation results**: Message IDs, status, etc.
- **Metadata**: Timestamp, duration

**Example Output:**
```json
{
  "phoneNumber": "+1234567890",
  "message": "Hello!",
  "messageId": "wamid.xxx",
  "status": "sent",
  "recipient": "+1234567890",
  "messageType": "text",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "duration": 250
}
```

---

## Summary

✅ **Fully Dynamic**: All fields support real-time data from previous nodes
✅ **Flexible Field Names**: Multiple field name variations supported
✅ **Array Processing**: Automatically handles arrays of items
✅ **Data Preservation**: Input data is preserved in output
✅ **Clear Errors**: Helpful error messages for missing fields
✅ **Priority System**: Input > Config > Default

The WhatsApp node is now fully integrated with your workflow system and ready for dynamic data processing!

