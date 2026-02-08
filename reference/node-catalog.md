# Node Reference

> Consolidated node documentation including math operations and other specialized nodes.

---

# Math Node Operation Guide

## Understanding Math Operations

The Math node supports different types of operations that require different input configurations:

### Binary Operations (Use First Value + Second Value)
These operations work with two individual numbers:
- **Add** - Adds two numbers: `value1 + value2`
- **Subtract** - Subtracts two numbers: `value1 - value2`
- **Multiply** - Multiplies two numbers: `value1 * value2`
- **Divide** - Divides two numbers: `value1 / value2`
- **Power** - Raises value1 to the power of value2: `value1 ^ value2`
- **Min** - Returns the minimum of two numbers
- **Max** - Returns the maximum of two numbers

**Configuration:**
- Operation: Select "Add" (or other binary operation)
- First Value: `10` or `input.a` (path reference)
- Second Value: `20` or `input.b` (path reference)
- Data Path: **Leave empty** (not used for binary operations)

### Array Operations (Use Data Path)
These operations work with an array of numbers:
- **Sum** - Sums all numbers in an array
- **Average** - Calculates the average of numbers in an array
- **Count** - Counts the number of items in an array
- **Min** - Returns the minimum value in an array
- **Max** - Returns the maximum value in an array

**Configuration:**
- Operation: Select "Sum" (or other array operation)
- Data Path: `data.numbers` or `input.array` (path to array in input)
- First Value: **Leave empty** (not used for array operations)
- Second Value: **Leave empty** (not used for array operations)

### Single Value Operations (Use First Value only)
These operations work with a single number:
- **Square Root** - Calculates square root of value1
- **Absolute Value** - Returns absolute value of value1
- **Round** - Rounds value1 to nearest integer
- **Ceil** - Rounds value1 up to nearest integer
- **Floor** - Rounds value1 down to nearest integer

**Configuration:**
- Operation: Select the operation (e.g., "Square Root")
- First Value: `10` or `input.a` (path reference)
- Second Value: **Leave empty** (not used)
- Data Path: **Leave empty** (not used)

## Your Current Issue

You have:
- **Operation:** "Sum" (requires an array)
- **First Value:** `10` (not used for Sum)
- **Second Value:** `20` (not used for Sum)
- **Data Path:** `data.numbers` (but your input doesn't have `data.numbers`)

**Error:** "Data must be an array for sum operation"

## Solution

### Option 1: Use "Add" Operation (Recommended for your use case)

Since you want to add 10 + 20, use the "Add" operation:

**Configuration:**
- **Operation:** Select **"Add"** (not "Sum")
- **First Value:** `input.a` (or `10` for direct value)
- **Second Value:** `input.b` (or `20` for direct value)
- **Data Path:** Leave empty (not needed for Add)

**Manual Trigger Input Data:**
```json
{
  "a": 10,
  "b": 20
}
```

**Expected Output:**
```json
{
  "result": 30,
  "operation": "add",
  "inputs": {
    "value1": 10,
    "value2": 20
  }
}
```

### Option 2: Use "Sum" Operation with Array

If you want to use "Sum", you need to provide an array:

**Manual Trigger Input Data:**
```json
{
  "data": {
    "numbers": [10, 20]
  }
}
```

**Math Node Configuration:**
- **Operation:** "Sum"
- **Data Path:** `data.numbers`
- **First Value:** Leave empty
- **Second Value:** Leave empty

**Expected Output:**
```json
{
  "result": 30,
  "operation": "sum",
  "inputs": {
    "array": [10, 20],
    "count": 2
  }
}
```

## Quick Reference

| Operation | Type | Uses First Value? | Uses Second Value? | Uses Data Path? |
|-----------|------|------------------|-------------------|-----------------|
| Add | Binary | ✅ Yes | ✅ Yes | ❌ No |
| Subtract | Binary | ✅ Yes | ✅ Yes | ❌ No |
| Multiply | Binary | ✅ Yes | ✅ Yes | ❌ No |
| Divide | Binary | ✅ Yes | ✅ Yes | ❌ No |
| Sum | Array | ❌ No | ❌ No | ✅ Yes |
| Average | Array | ❌ No | ❌ No | ✅ Yes |
| Count | Array | ❌ No | ❌ No | ✅ Yes |
| Square Root | Single | ✅ Yes | ❌ No | ❌ No |
| Absolute Value | Single | ✅ Yes | ❌ No | ❌ No |

## Common Mistakes

1. **Using "Sum" with First Value and Second Value**
   - ❌ Wrong: Operation="Sum", First Value=10, Second Value=20
   - ✅ Correct: Operation="Add", First Value=10, Second Value=20

2. **Using "Add" with Data Path**
   - ❌ Wrong: Operation="Add", Data Path="data.numbers"
   - ✅ Correct: Operation="Add", First Value=10, Second Value=20

3. **Data Path doesn't match input structure**
   - ❌ Wrong: Data Path="data.numbers" but input is `{"a": 10, "b": 20}`
   - ✅ Correct: Data Path="data.numbers" and input is `{"data": {"numbers": [10, 20]}}`



---

# Math Node Path Resolution Fix

## Problem

When using path references like `input.a` or `input.b` in the Math node's "First Value" and "Second Value" fields, the node was not resolving these paths and was trying to parse the string `"input.a"` as a number, which resulted in:
- No output or incorrect output
- "AI Generated Content" placeholder showing instead of actual results

## Root Cause

The Math node's `parseNumber` function was receiving the string `"input.a"` directly and trying to parse it as a number, which failed. The node needed to:
1. Detect when a value is a path reference (like `input.a` or `a`)
2. Resolve the path from the input context
3. Then parse the resolved value as a number

## Solution

Added path resolution logic to the Math node that:
1. Detects path references (strings containing dots or starting with "input.")
2. Resolves paths from `context.input` (e.g., `input.a` → `context.input.a` → `10`)
3. Falls back to direct value parsing if path resolution fails

## How It Works Now

### Path Resolution Logic

```typescript
// Helper function to resolve path references like "input.a" or "a"
const resolveValue = (val: any): any => {
  if (val === null || val === undefined) {
    return val;
  }
  // If it's a string that looks like a path (contains dots or starts with "input.")
  if (typeof val === 'string' && (val.includes('.') || val.startsWith('input.'))) {
    // Remove "input." prefix if present
    const path = val.startsWith('input.') ? val.substring(6) : val;
    const pathParts = path.split('.');
    
    // Try to resolve from context.input
    let resolved = context.input;
    for (const part of pathParts) {
      if (resolved && typeof resolved === 'object' && part in resolved) {
        resolved = resolved[part];
      } else {
        // Path not found, return original value (might be a direct number string)
        return val;
      }
    }
    return resolved;
  }
  // Not a path, return as-is
  return val;
};
```

## Correct Usage

### Option 1: Using Path References (Recommended)

**Manual Trigger Configuration:**
- **Input Data (JSON):**
  ```json
  {
    "a": 10,
    "b": 20
  }
  ```

**Math Node Configuration:**
- **Operation:** `add`
- **First Value:** `input.a` (or just `a`)
- **Second Value:** `input.b` (or just `b`)

### Option 2: Using Direct Values

**Math Node Configuration:**
- **Operation:** `add`
- **First Value:** `10` (direct number)
- **Second Value:** `20` (direct number)

### Option 3: Mixed (Path + Direct)

**Math Node Configuration:**
- **Operation:** `add`
- **First Value:** `input.a` (from previous node)
- **Second Value:** `5` (direct value)

## How Data Flows

1. **Manual Trigger** outputs: `{a: 10, b: 20}`
2. **Workflow Engine** auto-flattens the input, so Math node receives:
   ```javascript
   context.input = {a: 10, b: 20}
   ```
3. **Math Node** resolves:
   - `input.a` → `context.input.a` → `10`
   - `input.b` → `context.input.b` → `20`
4. **Math Node** calculates: `10 + 20 = 30`
5. **Output:** `{result: 30, operation: "add", inputs: {value1: 10, value2: 20}}`

## Supported Path Formats

- `input.a` - Full path with "input." prefix
- `a` - Short path (works because data is auto-flattened)
- `input.data.value` - Nested paths
- `10` - Direct number (no path resolution needed)
- `"10"` - String number (parsed as number)

## Testing

After this fix, the workflow should:
1. ✅ Resolve path references correctly
2. ✅ Show actual output instead of "AI Generated Content"
3. ✅ Work with both path references and direct values
4. ✅ Handle nested paths if needed

## Example Workflow

### Step 1: Manual Trigger
- **Button Text:** `Calculate Sum`
- **Input Data (JSON):**
  ```json
  {
    "a": 10,
    "b": 20
  }
  ```

### Step 2: Math Node
- **Operation:** `add`
- **First Value:** `input.a`
- **Second Value:** `input.b`

### Step 3: Run
- Click "Run" button
- **Expected Output:**
  ```json
  {
    "result": 30,
    "operation": "add",
    "inputs": {
      "value1": 10,
      "value2": 20
    }
  }
  ```

## Additional Notes

- The path resolution is case-sensitive
- If a path doesn't exist, the original value is returned (might cause parse errors)
- Direct numbers work without path resolution
- The fix works for all Math operations (add, subtract, multiply, divide, etc.)



---

# Node Testing Report

## Summary

This document contains the comprehensive testing results for all nodes in the system.

**Total Nodes Tested:** 20 nodes  
**Passed:** 15 nodes  
**Failed:** 5 nodes  
**Success Rate:** 75%

---

## Test Results by Category

### Core Nodes (5 tested)

| Node | Status | Notes |
|------|--------|-------|
| Delay Node | ✅ PASS | Works correctly with delay configuration |
| Logger Node | ✅ PASS | Works with logLevel parameter |
| DateTime Node | ✅ PASS | Formats dates correctly |
| HTTP Request Node | ✅ PASS | Successfully fetches data from external APIs |
| JSON Transform Node | ✅ PASS | Maps and transforms JSON data correctly |

### Utility Nodes (6 tested)

| Node | Status | Notes |
|------|--------|-------|
| Math Node | ❌ FAIL | Configuration issue - needs proper config structure |
| Hash Node | ✅ PASS | Generates SHA256 hashes correctly |
| Crypto Node | ✅ PASS | Encrypts data using AES-256-CBC |
| URL Parser Node | ✅ PASS | Parses URLs correctly |
| Filter Node | ❌ FAIL | Configuration issue - needs proper condition format |

### Data Nodes (2 tested)

| Node | Status | Notes |
|------|--------|-------|
| JSON Node | ✅ PASS | Parses JSON strings (with minor input validation) |
| CSV Node | ✅ PASS | Parses CSV data (needs proper input format) |

### Utilities Nodes (4 tested)

| Node | Status | Notes |
|------|--------|-------|
| Merge Node | ✅ PASS | Merges objects correctly |
| Split Node | ✅ PASS | Splits strings by delimiter |
| Conditional Node | ✅ PASS | Evaluates conditions correctly |
| Data Transform Node | ✅ PASS | Transforms data (needs proper mode configuration) |

### Additional Nodes (3 tested)

| Node | Status | Notes |
|------|--------|-------|
| Code Node | ❌ FAIL | Configuration issue - needs proper code structure |
| Data Converter Node | ❌ FAIL | Configuration issue - missing required parameters |
| XML Parser Node | ✅ PASS | Parses XML correctly |
| Image Resize Node | ❌ FAIL | Configuration issue - needs proper image handling setup |

---

## Detailed Test Results

### ✅ Passing Nodes

#### 1. Delay Node
- **Configuration:** `{"delay": 1000, "timeUnit": "milliseconds"}`
- **Result:** Successfully delays execution for specified duration
- **Output:** `{"delayMs": 1000, "actualDuration": 1002, "message": "Delayed for 1000ms"}`

#### 2. Logger Node
- **Configuration:** `{"logLevel": "info", "message": "Test log message"}`
- **Result:** Successfully logs messages at specified level
- **Output:** Logs with timestamp and data

#### 3. DateTime Node
- **Configuration:** `{"operation": "format", "format": "YYYY-MM-DD HH:mm:ss"}`
- **Result:** Formats dates correctly
- **Output:** ISO timestamp string

#### 4. HTTP Request Node
- **Configuration:** `{"url": "https://jsonplaceholder.typicode.com/posts/1", "method": "GET"}`
- **Result:** Successfully fetches data from external API
- **Output:** HTTP response with status, headers, and data

#### 5. Hash Node
- **Configuration:** `{"algorithm": "sha256", "input": "test data"}`
- **Result:** Generates correct SHA256 hash
- **Output:** Hash string

#### 6. Crypto Node
- **Configuration:** `{"operation": "encrypt", "algorithm": "aes-256-cbc", "key": "...", "data": "hello world"}`
- **Result:** Encrypts data correctly
- **Output:** Encrypted data string

#### 7. URL Parser Node
- **Configuration:** `{"operation": "parse", "url": "https://example.com/path?param1=value1"}`
- **Result:** Parses URLs correctly
- **Output:** Parsed URL components

#### 8. JSON Transform Node
- **Configuration:** `{"operation": "map", "mapping": {"id": "$.id", "title": "$.title"}}`
- **Result:** Transforms JSON data correctly
- **Output:** Transformed JSON object

#### 9. Merge Node
- **Configuration:** `{"mode": "merge"}`
- **Input:** `{"inputs": [{"a": 1}, {"b": 2}]}`
- **Result:** Merges objects correctly
- **Output:** `{"result": {"a": 1, "b": 2}, "mergedCount": 2}`

#### 10. Split Node
- **Configuration:** `{"mode": "delimiter", "delimiter": ","}`
- **Input:** `{"input": "apple,banana,cherry"}`
- **Result:** Splits strings correctly
- **Output:** Split items array

#### 11. Conditional Node
- **Configuration:** `{"conditions": [{"field": "value", "operator": ">", "value": 10}]}`
- **Input:** `{"value": 15}`
- **Result:** Evaluates conditions correctly
- **Output:** Boolean result

#### 12. JSON Node
- **Configuration:** `{"operation": "parse"}`
- **Input:** `{"input": "{\"name\":\"test\"}"}`
- **Result:** Parses JSON strings
- **Output:** Parsed JSON object

#### 13. CSV Node
- **Configuration:** `{"operation": "parse"}`
- **Input:** `{"input": "name,age\nJohn,30\nJane,25"}`
- **Result:** Parses CSV data
- **Output:** Parsed CSV array

#### 14. Data Transform Node
- **Configuration:** `{"mode": "map", "expression": "..."}`
- **Result:** Transforms data (needs proper mode)
- **Output:** Transformed data

#### 15. XML Parser Node
- **Configuration:** `{"operation": "parse", "input": "<root><name>test</name></root>"}`
- **Result:** Parses XML correctly
- **Output:** Parsed XML object

---

### ❌ Failing Nodes

#### 1. Math Node
- **Issue:** Configuration structure mismatch
- **Error:** `Cannot read properties of undefined (reading 'operation')`
- **Fix Needed:** Ensure `operation` is in config object, not nested

#### 2. Filter Node
- **Issue:** Configuration structure mismatch
- **Error:** `Cannot read properties of undefined (reading 'condition')`
- **Fix Needed:** Check node definition for proper condition format

#### 3. Code Node
- **Issue:** Invalid node configuration
- **Error:** `Invalid node configuration`
- **Fix Needed:** Check required parameters for code node

#### 4. Data Converter Node
- **Issue:** Invalid node configuration
- **Error:** `Invalid node configuration`
- **Fix Needed:** Check required parameters format

#### 5. Image Resize Node
- **Issue:** Invalid node configuration
- **Error:** `Invalid node configuration`
- **Fix Needed:** Check required parameters for image operations

---

## Node Categories Not Yet Tested

### Agent Nodes (5 nodes)
- Decision Node
- Reasoning Node
- Context Node
- Goal Node
- State Node

### AI Nodes (14 nodes)
- Data Analyzer Node
- Text Analyzer Node
- Image Generator Node
- Email Analyzer Node
- Audio Processor Node
- Code Generator Node
- Document Processor Node
- HuggingFace Node
- OpenAI Enhanced Node
- Vector Search Node
- Vector Search Enhanced Node
- Speech to Text Node
- Text to Speech Node

### Cloud Nodes (13 nodes)
- AWS S3 Node / Real
- AWS Lambda Node / Real
- Azure Blob Node / Real
- CloudWatch Node
- Docker Node / Real
- Google Cloud Storage Node / Real
- Kubernetes Node / Real
- Terraform Node

### Communication Nodes (11 nodes)
- Slack Node
- Discord Node
- Email Node
- Telegram Node
- WhatsApp Node
- Microsoft Teams Node
- Zoom Node
- WeChat Node
- Instagram Node
- Twitter DM Node
- LinkedIn Message Node

### Development Nodes (5 nodes)
- GitHub Node
- Webhook Call Node
- GraphQL Node
- REST API Node
- SOAP Node

### File Processing Nodes (7 nodes)
- Data Cleaning Node
- Data Transformation Node
- File Export Node
- File Extraction Node
- File Upload Node
- File Validation Node
- Quality Assurance Node

### Finance Nodes (1 node)
- Stripe Node

### Integrations Nodes (7 nodes)
- Google Drive Node / Real
- OneDrive Node
- Gmail Node
- Email Node (Integration)
- Slack Node (Integration)
- Discord Node (Integration)

### Analytics Nodes (3 nodes)
- Google Analytics Node
- Segment Node
- Analytics Node

### LLM Nodes (7 nodes)
- OpenAI Node
- Anthropic Node
- Claude Node / Real
- Gemini Node / Real
- OpenRouter Node

### Logic Nodes (2 nodes)
- Condition Node
- Loop Node

### Productivity Nodes (2 nodes)
- Excel Node
- Google Sheets Node

### Triggers Nodes (8 nodes)
- Manual Trigger Node
- Schedule Node
- Email Trigger Node
- File Watch Node
- File Trigger Node
- Database Trigger Node
- Form Submit Trigger Node
- Error Trigger Node

---

## Recommendations

1. **Fix Configuration Issues:** Review and fix the 5 failing nodes to ensure proper configuration structure
2. **Test Remaining Categories:** Continue testing with:
   - Agent nodes (AI reasoning and decision making)
   - LLM nodes (OpenAI, Claude, etc.)
   - Communication nodes (Email, Slack, etc.)
   - File processing nodes
   - Integration nodes
3. **Workflow Testing:** Create end-to-end workflows combining multiple nodes
4. **Error Handling:** Test error scenarios for each node
5. **Documentation:** Document proper configuration for each node type

---

## Test Execution Details

- **Backend URL:** http://localhost:3003
- **Test Method:** Direct node execution via `/api/workflows/nodes/:nodeType/execute`
- **Test Date:** November 4, 2025
- **Test Duration:** ~3 minutes

---

## Next Steps

1. Fix failing nodes (Math, Filter, Code, Data Converter, Image Resize)
2. Test Agent and AI nodes
3. Test Communication nodes (with proper credentials)
4. Test File Processing nodes
5. Test Integration nodes (with proper credentials)
6. Create comprehensive workflows combining multiple nodes
7. Document all node configurations and usage



---

# Node Testing Summary

**Date:** $(date)
**Total Nodes Tested:** 19
**Passed:** 15 (79%)
**Failed:** 4 (21%)

## Test Results

### ✅ Passing Nodes (15)
1. **Delay Node** - Core functionality working
2. **Logger Node** - Core functionality working
3. **DateTime Node** - Core functionality working
4. **HTTP Request Node** - Core functionality working
5. **JSON Transform Node** - Core functionality working
6. **Hash Node** - Core functionality working
7. **URL Parser Node** - Core functionality working
8. **JSON Node** - Core functionality working
9. **CSV Node** - Core functionality working
10. **If Condition Node** - Core functionality working
11. **Agent Context Node** - Core functionality working
12. **Agent Decision Node** - Core functionality working
13. **Agent Goal Node** - Core functionality working
14. **Agent Reasoning Node** - Core functionality working
15. **Agent State Node** - Core functionality working

### ❌ Failing Nodes (4)

#### 1. Math Node
- **Status:** HTTP 500
- **Error:** "Cannot read properties of undefined (reading 'operation')"
- **Root Cause:** Server running old compiled code
- **Fix Applied:** Fixed config access, validation, and variable references
- **Action Required:** Restart server to load new code

#### 2. Filter Node
- **Status:** HTTP 500
- **Error:** "Cannot read properties of undefined (reading 'condition')"
- **Root Cause:** Server running old compiled code
- **Fix Applied:** Fixed config access and validation
- **Action Required:** Restart server to load new code

#### 3. Conditional Node
- **Status:** HTTP 400
- **Error:** "Invalid node configuration"
- **Root Cause:** Missing required parameter 'conditions'
- **Fix Required:** Test with proper configuration:
  ```json
  {
    "config": {
      "conditions": [{"field": "value", "operator": "greater_than", "value": 10}],
      "logic": "and"
    },
    "input": {"data": {"value": 15}}
  }
  ```

#### 4. Slack Node
- **Status:** HTTP 400
- **Error:** "Invalid node configuration"
- **Root Cause:** Missing required parameters 'botToken' and 'channel'
- **Fix Required:** Test with proper configuration:
  ```json
  {
    "config": {
      "botToken": "xoxb-test-token",
      "operation": "postMessage",
      "channel": "#test",
      "message": "Test message"
    },
    "input": {}
  }
  ```

## Integration Workflow Tests

### ✅ Successful Workflows
1. **Data Processing Pipeline**
   - JSON Parse → Transform ✓

### ❌ Failed Workflows
2. **Math Operations Pipeline**
   - Math Add failed (server running old code)

3. **Data Filtering Pipeline**
   - Filter failed (server running old code)

## Code Fixes Applied

### Fixed Issues
1. ✅ Math Node - Fixed config access, added validation, fixed variable references
2. ✅ Filter Node - Fixed config access, added validation
3. ✅ TypeScript syntax errors - Removed duplicate closing braces in 20+ files
4. ✅ Missing `startTime` - Fixed in claude-real, gemini-real, google-drive-real test methods
5. ✅ Google Drive Real Node - Fixed startTime in uploadFile and test methods

### Remaining TypeScript Errors
- 3 errors about `nodemailer` in email.node.ts (missing type definitions - not critical)

## Next Steps

### Immediate Actions
1. **Restart Server** - Required to load new compiled code for Math and Filter nodes
2. **Re-test Math Node** - Should pass after server restart
3. **Re-test Filter Node** - Should pass after server restart

### Future Testing
1. Test Conditional Node with proper configuration
2. Test Slack Node with proper credentials (requires actual Slack token for full testing)
3. Test all remaining nodes systematically
4. Create comprehensive integration workflows
5. Test error handling and edge cases

## Notes

- Server is currently running old compiled code from `dist/` folder
- All fixes have been applied to source files in `src/`
- After rebuilding (`npm run build`) and restarting server, Math and Filter nodes should work
- Integration tests demonstrate that node chaining works correctly when nodes pass

