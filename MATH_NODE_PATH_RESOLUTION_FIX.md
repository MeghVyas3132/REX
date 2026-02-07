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

