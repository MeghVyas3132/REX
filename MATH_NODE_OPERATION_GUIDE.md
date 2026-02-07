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

