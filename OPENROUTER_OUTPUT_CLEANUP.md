# OpenRouter Node Output Cleanup
**Date:** 2025-11-14  
**Issue:** Output structure had redundant/repeated fields causing confusion when passing data between nodes

---

## 🔴 Problem

The OpenRouter node output had several issues:

1. **Test fields in output** - `test: true` from input was being preserved in output
2. **Duplicate fields** - `provider` and `model` appeared both at top level and inside `raw` object
3. **Inconsistent structure** - Made it unclear which fields to use when passing data to next node

**Before:**
```json
{
  "output": {
    "test": true,              // ❌ Test field shouldn't be in output
    "content": "...",
    "provider": "OpenRouter",  // ❌ Duplicated
    "model": "openai/gpt-4o",  // ❌ Duplicated
    "raw": {
      "provider": "OpenAI",    // ❌ Different value, confusing
      "model": "openai/gpt-4o" // ❌ Duplicated
    }
  }
}
```

---

## ✅ Solution

**File:** `backend 2/src/nodes/llm/openrouter.node.ts` (Line 138-171)

**Changes:**
1. **Remove test fields** - Filters out `test` and `_test` from input before including in output
2. **Single source of truth** - Uses model from raw response (more accurate) instead of duplicating
3. **Clean structure** - Primary fields at top level, raw response under `_raw` (prefixed to indicate it's for advanced use)
4. **Extract usage info** - Provides clean usage object instead of nested raw structure

**After:**
```json
{
  "output": {
    "content": "...",           // ✅ Primary output
    "model": "openai/gpt-4o",   // ✅ Single source
    "provider": "OpenRouter",   // ✅ Single source
    "usage": {                  // ✅ Clean usage info
      "promptTokens": 11,
      "completionTokens": 125,
      "totalTokens": 136
    },
    "_raw": { ... }             // ✅ Full response available if needed
  }
}
```

---

## 📋 Output Structure

### Primary Fields (for normal use)
- `content` - The generated text (main output)
- `model` - Model used (from API response)
- `provider` - Always "OpenRouter"
- `usage` - Token usage information (if available)

### Advanced Fields
- `_raw` - Full API response for advanced use cases

### Preserved Input
- Other input fields are preserved (except test fields)
- Useful for passing context through the workflow

---

## 🔄 Data Flow Between Nodes

Now when passing data from OpenRouter to another node:

**Clean and predictable:**
```javascript
// Next node receives:
{
  content: "Generated text...",
  model: "openai/gpt-4o",
  provider: "OpenRouter",
  usage: { ... },
  // Other input fields preserved
}
```

**No confusion about:**
- Which `provider` to use (only one at top level)
- Which `model` to use (only one at top level)
- Whether to use `raw.provider` or `provider` (use top-level)

---

## ✅ Benefits

1. **Cleaner output** - No redundant fields
2. **Predictable structure** - Easy to know which fields to use
3. **Better data flow** - Clean data passes between nodes
4. **Backward compatible** - Raw response still available under `_raw`
5. **No test pollution** - Test fields don't leak into output

---

**Status:** ✅ Fixed - Output structure cleaned and optimized

