# Testing Workflows Guide

> Consolidated testing documentation.

---

# Workflow Testing Guide: File Upload → Code → Sentiment Analysis

This guide provides comprehensive testing methods for your workflow that processes uploaded files, executes custom code, and analyzes text sentiment.

## Workflow Overview

**Workflow Structure:**
1. **File Upload (Trigger)** - Uploads and processes files
2. **Code (Utility)** - Executes custom JavaScript code
3. **Text Analyzer (Action)** - Analyzes text for sentiment

---

## Prerequisites

- ✅ Backend running on `http://localhost:3003` (or your configured port)
- ✅ Frontend running (if testing via UI)
- ✅ OpenAI API key (for Text Analyzer node)
- ✅ Test file ready (text file with content to analyze)

---

## Testing Methods

### Method 1: Frontend UI Testing (Recommended for First Test)

#### Step 1: Create/Open Workflow in Frontend

1. Navigate to your workflow studio
2. Create a new workflow or open your existing workflow
3. Ensure nodes are connected: **File Upload** → **Code** → **Text Analyzer**

#### Step 2: Configure File Upload Node

1. Click on the **File Upload** node
2. Configure:
   - **Source**: `local` (or use UI file upload)
   - **Allowed Types**: `['text/plain', 'text/csv', 'application/json']` or `['*']` for all
   - **Max Size**: `10485760` (10MB) or leave default
   - **Upload Path**: `./uploads` (default)
   - **Preserve Name**: `true` (optional)

**OR** upload a file directly via the UI:
- Click "Upload File" button in the node configuration
- Select a text file (`.txt`, `.csv`, `.json`)
- File will be automatically attached

#### Step 3: Configure Code Node

1. Click on the **Code** node
2. Configure:
   - **Language**: `javascript`
   - **Code**: 
   ```javascript
   // Extract text content from file upload output
   const filePath = input.filePath || input.fileInfo?.path;
   const fs = require('fs');
   
   // Read file content
   let textContent = '';
   if (filePath && fs.existsSync(filePath)) {
     textContent = fs.readFileSync(filePath, 'utf8');
   } else if (input.fileContent) {
     textContent = input.fileContent;
   } else if (input.text) {
     textContent = input.text;
   }
   
   // Return text content for sentiment analysis
   return {
     text: textContent,
     filePath: filePath,
     originalInput: input
   };
   ```
   - **Timeout**: `30` seconds
   - **Allow Imports**: `true` (if using `require`)

#### Step 4: Configure Text Analyzer Node

1. Click on the **Text Analyzer** node
2. Configure:
   - **API Key**: Your OpenAI API key (or set `OPENAI_API_KEY` env variable)
   - **Analysis Type**: `sentiment` (or `comprehensive` for full analysis)
   - **Model**: `gpt-3.5-turbo` (or `gpt-4` for better results)
   - **Language**: `en`
   - **Include Confidence**: `true`
   - **Text Input**: `{{code.text}}` or `{{input.text}}`

#### Step 5: Run Workflow

1. Click **"Run"** or **"Execute"** button
2. If using file upload via UI, select your test file
3. Watch the execution progress
4. Check the output panel for results

#### Expected Output Structure

```json
{
  "success": true,
  "output": {
    "sentiment": "positive",
    "confidence": 0.95,
    "text": "I love this product! It's amazing and works perfectly.",
    "analysis": {
      "sentiment": "positive",
      "score": 0.95,
      "emotions": ["joy", "satisfaction"]
    }
  },
  "nodeResults": {
    "file-upload-1": {
      "filePath": "./uploads/test-file.txt",
      "fileInfo": { ... }
    },
    "code-1": {
      "text": "I love this product!...",
      "filePath": "./uploads/test-file.txt"
    },
    "text-analyzer-1": {
      "sentiment": "positive",
      "confidence": 0.95
    }
  }
}
```

---

### Method 2: API Testing (cURL/Postman)

#### Test 1: Execute Workflow with File Upload via API

**Endpoint:** `POST /api/workflows/test/execute`

**Request Body:**
```json
{
  "nodes": [
    {
      "id": "file-upload-1",
      "type": "trigger",
      "subtype": "file-upload",
      "data": {
        "config": {
          "source": "local",
          "uploadPath": "./uploads",
          "allowedTypes": ["text/plain", "text/csv"],
          "maxSize": 10485760
        }
      },
      "position": { "x": 100, "y": 100 }
    },
    {
      "id": "code-1",
      "type": "action",
      "subtype": "code",
      "data": {
        "config": {
          "language": "javascript",
          "code": "const fs = require('fs');\nconst filePath = input.filePath || input.fileInfo?.path;\nlet textContent = '';\nif (filePath && fs.existsSync(filePath)) {\n  textContent = fs.readFileSync(filePath, 'utf8');\n}\nreturn { text: textContent, filePath: filePath };",
          "timeout": 30,
          "allowImports": true
        }
      },
      "position": { "x": 300, "y": 100 }
    },
    {
      "id": "text-analyzer-1",
      "type": "action",
      "subtype": "text-analyzer",
      "data": {
        "config": {
          "apiKey": "your-openai-api-key",
          "analysisType": "sentiment",
          "model": "gpt-3.5-turbo",
          "language": "en",
          "includeConfidence": true
        }
      },
      "position": { "x": 500, "y": 100 }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "file-upload-1",
      "target": "code-1",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge-2",
      "source": "code-1",
      "target": "text-analyzer-1",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ],
  "input": {
    "filePath": "./test-files/sample-text.txt"
  }
}
```

**cURL Command:**
```bash
curl -X POST http://localhost:3003/api/workflows/test/execute \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {
        "id": "file-upload-1",
        "type": "trigger",
        "subtype": "file-upload",
        "data": {
          "config": {
            "source": "local",
            "uploadPath": "./uploads",
            "allowedTypes": ["text/plain"]
          }
        },
        "position": {"x": 100, "y": 100}
      },
      {
        "id": "code-1",
        "type": "action",
        "subtype": "code",
        "data": {
          "config": {
            "language": "javascript",
            "code": "const fs = require(\"fs\");\nconst filePath = input.filePath || input.fileInfo?.path;\nlet textContent = \"\";\nif (filePath && fs.existsSync(filePath)) {\n  textContent = fs.readFileSync(filePath, \"utf8\");\n}\nreturn { text: textContent, filePath: filePath };",
            "timeout": 30,
            "allowImports": true
          }
        },
        "position": {"x": 300, "y": 100}
      },
      {
        "id": "text-analyzer-1",
        "type": "action",
        "subtype": "text-analyzer",
        "data": {
          "config": {
            "apiKey": "your-openai-api-key",
            "analysisType": "sentiment",
            "model": "gpt-3.5-turbo",
            "language": "en"
          }
        },
        "position": {"x": 500, "y": 100}
      }
    ],
    "edges": [
      {
        "id": "edge-1",
        "source": "file-upload-1",
        "target": "code-1"
      },
      {
        "id": "edge-2",
        "source": "code-1",
        "target": "text-analyzer-1"
      }
    ],
    "input": {
      "filePath": "./test-files/sample-text.txt"
    }
  }'
```

#### Test 2: Execute with Base64 File Content

If you want to send file content directly:

```bash
curl -X POST http://localhost:3003/api/workflows/test/execute \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {
        "id": "file-upload-1",
        "type": "trigger",
        "subtype": "file-upload",
        "data": {
          "config": {
            "source": "base64",
            "uploadPath": "./uploads"
          }
        }
      },
      {
        "id": "code-1",
        "type": "action",
        "subtype": "code",
        "data": {
          "config": {
            "language": "javascript",
            "code": "const text = Buffer.from(input.fileData, \"base64\").toString(\"utf8\");\nreturn { text: text };",
            "allowImports": true
          }
        }
      },
      {
        "id": "text-analyzer-1",
        "type": "action",
        "subtype": "text-analyzer",
        "data": {
          "config": {
            "apiKey": "your-openai-api-key",
            "analysisType": "sentiment",
            "model": "gpt-3.5-turbo"
          }
        }
      }
    ],
    "edges": [
      {"source": "file-upload-1", "target": "code-1"},
      {"source": "code-1", "target": "text-analyzer-1"}
    ],
    "input": {
      "fileData": "SSBsb3ZlIHRoaXMgcHJvZHVjdCEgSXQncyBhbWF6aW5nIGFuZCB3b3JrcyBwZXJmZWN0bHku"
    }
  }'
```

---

### Method 3: Step-by-Step Node Testing

Test each node individually before testing the full workflow.

#### Test File Upload Node Only

```bash
curl -X POST http://localhost:3003/api/workflows/test/execute \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {
        "id": "file-upload-1",
        "type": "trigger",
        "subtype": "file-upload",
        "data": {
          "config": {
            "source": "local",
            "uploadPath": "./uploads"
          }
        }
      }
    ],
    "edges": [],
    "input": {
      "filePath": "./test-files/sample.txt"
    }
  }'
```

**Expected Output:**
```json
{
  "success": true,
  "data": {
    "result": {
      "output": {
        "filePath": "./uploads/sample.txt",
        "fileInfo": {
          "name": "sample.txt",
          "path": "./uploads/sample.txt",
          "size": 1024,
          "type": "text/plain"
        }
      }
    }
  }
}
```

#### Test Code Node Only

```bash
curl -X POST http://localhost:3003/api/workflows/test/execute \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {
        "id": "code-1",
        "type": "action",
        "subtype": "code",
        "data": {
          "config": {
            "language": "javascript",
            "code": "return { text: input.text || \"Hello World\", processed: true };"
          }
        }
      }
    ],
    "edges": [],
    "input": {
      "text": "I love this product!"
    }
  }'
```

#### Test Text Analyzer Node Only

```bash
curl -X POST http://localhost:3003/api/workflows/test/execute \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {
        "id": "text-analyzer-1",
        "type": "action",
        "subtype": "text-analyzer",
        "data": {
          "config": {
            "apiKey": "your-openai-api-key",
            "analysisType": "sentiment",
            "model": "gpt-3.5-turbo",
            "language": "en"
          }
        }
      }
    ],
    "edges": [],
    "input": {
      "text": "I love this product! It is amazing."
    }
  }'
```

---

### Method 4: Create Test File Script

Create a test file and run the workflow:

```bash
# Create test directory
mkdir -p test-files

# Create sample text file
echo "I love this product! It's amazing and works perfectly. The quality is outstanding and I would definitely recommend it to others." > test-files/sample-text.txt

# Create negative sentiment file
echo "I hate this product. It's terrible and doesn't work at all. Very disappointed with the quality." > test-files/negative-text.txt

# Create neutral sentiment file
echo "The product arrived on time. It functions as described. No complaints." > test-files/neutral-text.txt
```

Then run your workflow with each file:

```bash
# Test with positive sentiment file
curl -X POST http://localhost:3003/api/workflows/test/execute \
  -H "Content-Type: application/json" \
  -d @workflow-test-positive.json

# Test with negative sentiment file
curl -X POST http://localhost:3003/api/workflows/test/execute \
  -H "Content-Type: application/json" \
  -d @workflow-test-negative.json
```

---

## Test Cases

### Test Case 1: Positive Sentiment Text File

**Input File:** `test-files/positive.txt`
```
I love this product! It's amazing and works perfectly. 
The quality is outstanding and I would definitely recommend it to others.
```

**Expected Result:**
- ✅ File uploaded successfully
- ✅ Code node extracts text content
- ✅ Sentiment: `positive`
- ✅ Confidence score > 0.7

### Test Case 2: Negative Sentiment Text File

**Input File:** `test-files/negative.txt`
```
I hate this product. It's terrible and doesn't work at all. 
Very disappointed with the quality.
```

**Expected Result:**
- ✅ File uploaded successfully
- ✅ Code node extracts text content
- ✅ Sentiment: `negative`
- ✅ Confidence score > 0.7

### Test Case 3: Large File (>1MB)

**Input File:** Large text file (1.5MB)

**Expected Result:**
- ⚠️ File upload may fail if maxSize is set too low
- ✅ Should handle gracefully with error message

### Test Case 4: Invalid File Type

**Input File:** `test-files/image.png`

**Expected Result:**
- ❌ File upload should fail or skip
- ✅ Error message: "File type not allowed"

### Test Case 5: Empty File

**Input File:** Empty text file

**Expected Result:**
- ✅ File uploaded successfully
- ⚠️ Code node may return empty text
- ⚠️ Text Analyzer may return error or neutral sentiment

### Test Case 6: Code Node Error Handling

**Test:** Code node with invalid JavaScript

**Expected Result:**
- ❌ Code execution fails
- ✅ Error message returned
- ⚠️ Workflow may continue or stop depending on error handling settings

---

## Validation Checklist

### File Upload Node
- [ ] File uploads successfully
- [ ] File path is returned correctly
- [ ] File info (name, size, type) is accurate
- [ ] File validation works (type, size)
- [ ] Error handling for invalid files

### Code Node
- [ ] Code executes successfully
- [ ] File content is read correctly
- [ ] Text is extracted properly
- [ ] Output format matches expected structure
- [ ] Error handling for file read failures

### Text Analyzer Node
- [ ] API key is valid
- [ ] Text is analyzed correctly
- [ ] Sentiment result is accurate
- [ ] Confidence score is returned
- [ ] Error handling for API failures

### Workflow Integration
- [ ] Data flows correctly between nodes
- [ ] File Upload output → Code input
- [ ] Code output → Text Analyzer input
- [ ] Final output contains all expected fields
- [ ] Execution order is correct

---

## Troubleshooting

### Issue: File Upload Fails

**Possible Causes:**
- File path doesn't exist
- File permissions issue
- File size exceeds maxSize limit
- File type not in allowedTypes

**Solutions:**
1. Check file path exists: `ls -la ./test-files/sample.txt`
2. Check file permissions: `chmod 644 ./test-files/sample.txt`
3. Increase maxSize in node config
4. Add file type to allowedTypes array

### Issue: Code Node Fails

**Possible Causes:**
- Invalid JavaScript syntax
- File not found at path
- Missing require/import permissions

**Solutions:**
1. Validate JavaScript syntax
2. Check file path is correct
3. Set `allowImports: true` if using require/import
4. Add error handling in code

### Issue: Text Analyzer Fails

**Possible Causes:**
- Invalid API key
- API rate limit exceeded
- Text input is empty
- Network error

**Solutions:**
1. Verify API key is correct
2. Check API quota/rate limits
3. Ensure text is passed correctly from Code node
4. Check network connectivity

### Issue: Data Not Flowing Between Nodes

**Possible Causes:**
- Edge connections not configured correctly
- Output format doesn't match input expectations
- Node IDs don't match edge source/target

**Solutions:**
1. Verify edges array in workflow JSON
2. Check node output structure matches next node's input expectations
3. Use logger node to inspect data at each step
4. Verify node IDs match in edges

---

## Performance Testing

### Test Execution Time

```bash
time curl -X POST http://localhost:3003/api/workflows/test/execute \
  -H "Content-Type: application/json" \
  -d @workflow-test.json
```

**Expected Times:**
- File Upload: < 1 second
- Code Execution: < 1 second
- Text Analyzer: 2-5 seconds (depends on API)
- **Total**: 3-7 seconds

### Test with Multiple Files

Create a script to test multiple files:

```bash
#!/bin/bash
for file in test-files/*.txt; do
  echo "Testing: $file"
  curl -X POST http://localhost:3003/api/workflows/test/execute \
    -H "Content-Type: application/json" \
    -d "{\"nodes\": [...], \"input\": {\"filePath\": \"$file\"}}"
  echo ""
done
```

---

## Next Steps

1. **Save Workflow**: Once tested, save the workflow for reuse
2. **Add Error Handling**: Add error handling nodes for production
3. **Add Logging**: Add logger nodes to track execution
4. **Optimize Code**: Refine code node for better performance
5. **Add More Analysis**: Extend Text Analyzer to comprehensive analysis

---

## Quick Reference

### API Endpoint
```
POST /api/workflows/test/execute
```

### Required Headers
```
Content-Type: application/json
```

### Workflow JSON Structure
```json
{
  "nodes": [...],
  "edges": [...],
  "input": {...}
}
```

### Node Types
- `trigger`: File Upload
- `action`: Code, Text Analyzer

### Common Input Paths
- File Upload output: `input.filePath`, `input.fileInfo`
- Code output: `input.text`, `input.filePath`
- Text Analyzer input: `input.text`

---

## Support

If you encounter issues:
1. Check backend logs: `tail -f backend/logs/app.log`
2. Verify API endpoint is accessible
3. Check node configurations match examples
4. Ensure all required environment variables are set
5. Review node documentation for specific requirements

Good luck with your testing! 🚀



---

# Quick Test Reference - File Upload → Code → Sentiment Analysis Workflow

## 🚀 Quick Start

### Option 1: Using the Test Script (Easiest)

**Bash Script:**
```bash
# Set your OpenAI API key
export OPENAI_API_KEY="your-api-key-here"

# Run the test script
./test-workflow.sh
```

**Node.js Script:**
```bash
# Set your OpenAI API key
export OPENAI_API_KEY="your-api-key-here"

# Run the test script
node test-workflow.js

# With cleanup
node test-workflow.js --cleanup
```

### Option 2: Using cURL

```bash
# Update workflow-template.json with your API key and file path
# Then run:
curl -X POST http://localhost:3003/api/workflows/test/execute \
  -H "Content-Type: application/json" \
  -d @workflow-template.json
```

### Option 3: Frontend UI

1. Open workflow studio in your browser
2. Load/create your workflow
3. Configure nodes (see guide below)
4. Click "Run" button
5. Upload a file when prompted

---

## 📋 Node Configuration Quick Reference

### File Upload Node
```json
{
  "source": "local",
  "uploadPath": "./uploads",
  "allowedTypes": ["text/plain", "text/csv"],
  "maxSize": 10485760
}
```

### Code Node
```javascript
// JavaScript code to extract text from file
const fs = require('fs');
const filePath = input.filePath || input.fileInfo?.path;
let textContent = '';
if (filePath && fs.existsSync(filePath)) {
  textContent = fs.readFileSync(filePath, 'utf8');
}
return { text: textContent, filePath: filePath };
```

### Text Analyzer Node
```json
{
  "apiKey": "your-openai-api-key",
  "analysisType": "sentiment",
  "model": "gpt-3.5-turbo",
  "language": "en",
  "includeConfidence": true
}
```

---

## 🧪 Test Files

Create test files in `./test-files/`:

**positive.txt:**
```
I love this product! It's amazing and works perfectly.
```

**negative.txt:**
```
I hate this product. It's terrible and doesn't work.
```

**neutral.txt:**
```
The product arrived on time. It functions as described.
```

---

## ✅ Expected Output

```json
{
  "success": true,
  "output": {
    "sentiment": "positive",
    "confidence": 0.95,
    "text": "I love this product!..."
  },
  "nodeResults": {
    "file-upload-1": { "filePath": "./uploads/..." },
    "code-1": { "text": "I love..." },
    "text-analyzer-1": { "sentiment": "positive" }
  }
}
```

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| File not found | Check file path exists |
| API key invalid | Set `OPENAI_API_KEY` env variable |
| Code execution fails | Check JavaScript syntax |
| Backend not responding | Verify backend is running on port 3003 |

---

## 📚 Full Documentation

See `WORKFLOW_TESTING_GUIDE.md` for comprehensive testing instructions.

---

## 🎯 Testing Checklist

- [ ] Backend is running
- [ ] Test files created
- [ ] API key configured
- [ ] Workflow nodes configured
- [ ] Test executed successfully
- [ ] Results validated

---

**Quick Help:**
- Full Guide: `WORKFLOW_TESTING_GUIDE.md`
- Test Script: `test-workflow.sh` or `test-workflow.js`
- Template: `workflow-template.json`



---

# Frontend Workflow Testing Guide

This comprehensive guide will help you test your frontend by creating different types of workflows step-by-step. Each workflow includes specific inputs, expected outputs, and clear instructions.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Workflow Categories](#workflow-categories)
3. [Step-by-Step Workflow Tests](#step-by-step-workflow-tests)
   - [Level 1: Simple Workflows (2-3 nodes)](#level-1-simple-workflows-2-3-nodes)
   - [Level 2: Intermediate Workflows (4-6 nodes)](#level-2-intermediate-workflows-4-6-nodes)
   - [Level 3: Advanced Workflows (7-10 nodes)](#level-3-advanced-workflows-7-10-nodes)
   - [Level 4: Complex Workflows (11+ nodes)](#level-4-complex-workflows-11-nodes)
4. [Testing Checklist](#testing-checklist)

---

## Getting Started

### Prerequisites
- Frontend running (usually `http://localhost:3000` or similar)
- Backend running (usually `http://localhost:3003`)
- Browser with developer console open (F12)

### How to Create a Workflow in Frontend

1. **Open Workflow Studio**
   - Navigate to the workflow dashboard
   - Click "Create New Workflow" or "New Workflow"

2. **Add Nodes**
   - Drag nodes from the sidebar onto the canvas
   - Connect nodes by dragging from output handles to input handles
   - Configure each node by clicking on it

3. **Configure Nodes**
   - Click on a node to open its configuration panel
   - Fill in the required fields
   - Use the examples provided in this guide

4. **Test Workflow**
   - Click "Run" or "Execute" button
   - Check the output panel for results
   - Verify each node executed successfully

5. **Save Workflow**
   - Click "Save" to persist your workflow
   - Give it a descriptive name

---

## Workflow Categories

### Category 1: Utility & Core Nodes
- Manual Trigger, Delay, Logger, Math, JSON Transform, DateTime

### Category 2: Data Processing Nodes
- JSON, CSV, Data Transform, Merge, Split, Filter

### Category 3: HTTP & API Nodes
- HTTP Request, Webhook Trigger, REST API, GraphQL

### Category 4: AI & LLM Nodes
- OpenAI, Text Analyzer, Code Generator, Data Analyzer

### Category 5: Communication Nodes
- Email, Slack, Discord, Telegram

### Category 6: File Processing Nodes
- File Upload, File Validation, Data Cleaning

### Category 7: Database Nodes
- PostgreSQL, MySQL, MongoDB, Database

---

## Step-by-Step Workflow Tests

---

## Level 1: Simple Workflows (2-3 nodes)

### Workflow 1.1: Basic Math Calculation
**Purpose:** Test basic math operations with manual trigger

**Nodes:**
1. Manual Trigger
2. Math Node

**Step-by-Step:**
1. **Add Manual Trigger Node**
   - Drag "Manual Trigger" from sidebar
   - Click on the node to open configuration panel
   - Configure:
     - **Button Text:** `"Calculate Sum"` (optional, defaults to "Run Workflow")
     - **Input Data (JSON):** 
       ```json
       {
         "a": 10,
         "b": 20
       }
       ```
   - Click "Save"

2. **Add Math Node**
   - Drag "Math" node from sidebar
   - Connect Manual Trigger output → Math input (drag from Manual Trigger's output handle to Math's input handle)
   - Click on Math node to open configuration panel
   - Configure:
     - **Operation:** Select `"add"` from dropdown
     - **First Value:** `input.a` OR `10` (can use path reference or direct value)
     - **Second Value:** `input.b` OR `20` (can use path reference or direct value)
   - Click "Save"

3. **Run Workflow**
   - Click "Run" button
   - Expected Output: `{"result": 30}`

**Expected Output:**
```json
{
  "result": 30,
  "operation": "add"
}
```

---

### Workflow 1.2: JSON Data Transformation
**Purpose:** Test JSON transformation and data manipulation

**Nodes:**
1. Manual Trigger
2. JSON Transform Node

**Step-by-Step:**
1. **Add Manual Trigger**
   - Button Text: `"Transform Data"`
   - Input Data:
   ```json
   {
     "user": {
       "name": "John Doe",
       "email": "john@example.com",
       "age": 30
     }
   }
   ```

2. **Add JSON Transform Node**
   - Connect Trigger → JSON Transform
   - Configure:
     - Transform Type: `"map"` or `"extract"`
     - Source Path: `"input.user"`
     - Target Structure:
     ```json
     {
       "fullName": "{{user.name}}",
       "contactEmail": "{{user.email}}",
       "yearsOld": "{{user.age}}"
     }
     ```

3. **Run Workflow**
   - Expected Output:
   ```json
   {
     "fullName": "John Doe",
     "contactEmail": "john@example.com",
     "yearsOld": 30
   }
   ```

---

### Workflow 1.3: Delay and Logger
**Purpose:** Test delay functionality and logging

**Nodes:**
1. Manual Trigger
2. Delay Node
3. Logger Node

**Step-by-Step:**
1. **Add Manual Trigger**
   - Button Text: `"Test Delay"`
   - Input Data: `{"message": "Starting workflow"}`

2. **Add Delay Node**
   - Connect Trigger → Delay
   - Configure:
     - Delay: `5000` (5 seconds)
     - Time Unit: `"milliseconds"`
     - Delay Message: `"Waiting 5 seconds..."`

3. **Add Logger Node**
   - Connect Delay → Logger
   - Configure:
     - Log Level: `"info"`
     - Message: `"{{data.message}} - Delay completed"`
     - Log Data Path: `"data"`

4. **Run Workflow**
   - Watch the console/logs
   - Expected: Delay of 5 seconds, then log message appears

**Expected Output:**
```json
{
  "data": {"message": "Starting workflow"},
  "delayMs": 5000,
  "message": "Waiting 5 seconds...",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T10:00:05Z"
}
```

---

### Workflow 1.4: DateTime Operations
**Purpose:** Test date and time manipulation

**Nodes:**
1. Manual Trigger
2. DateTime Node

**Step-by-Step:**
1. **Add Manual Trigger**
   - Button Text: `"Get Current Date"`
   - Input Data: `{}`

2. **Add DateTime Node**
   - Connect Trigger → DateTime
   - Configure:
     - Operation: `"format"` or `"getCurrent"`
     - Format: `"YYYY-MM-DD HH:mm:ss"`
     - Timezone: `"UTC"`

3. **Run Workflow**
   - Expected Output:
   ```json
   {
     "formattedDate": "2024-01-15 10:00:00",
     "timestamp": 1705315200000,
     "timezone": "UTC"
   }
   ```

---

## Level 2: Intermediate Workflows (4-6 nodes)

### Workflow 2.1: Data Processing Pipeline
**Purpose:** Process and transform data through multiple steps

**Nodes:**
1. Manual Trigger
2. JSON Node
3. Data Transform Node
4. Filter Node
5. Logger Node

**Step-by-Step:**
1. **Add Manual Trigger**
   - Button Text: `"Process User Data"`
   - Input Data:
   ```json
   {
     "users": [
       {"id": 1, "name": "Alice", "age": 25, "active": true},
       {"id": 2, "name": "Bob", "age": 30, "active": false},
       {"id": 3, "name": "Charlie", "age": 35, "active": true}
     ]
   }
   ```

2. **Add JSON Node**
   - Connect Trigger → JSON
   - Configure:
     - Operation: `"parse"` or `"stringify"`
     - Data Path: `"input.users"`

3. **Add Filter Node**
   - Connect JSON → Filter
   - Configure:
     - Filter Condition: `"item.active === true"`
     - Array Path: `"data"`

4. **Add Data Transform Node**
   - Connect Filter → Data Transform
   - Configure:
     - Transform: Map each item to `{"name": "{{item.name}}", "age": "{{item.age}}"}`

5. **Add Logger Node**
   - Connect Data Transform → Logger
   - Configure:
     - Log Level: `"info"`
     - Message: `"Processed {{data.length}} active users"`

6. **Run Workflow**
   - Expected Output: Only active users (Alice, Charlie) processed

**Expected Output:**
```json
{
  "filtered": [
    {"name": "Alice", "age": 25},
    {"name": "Charlie", "age": 35}
  ],
  "count": 2
}
```

---

### Workflow 2.2: HTTP Request with Error Handling
**Purpose:** Test HTTP requests and conditional logic

**Nodes:**
1. Manual Trigger
2. HTTP Request Node
3. Condition Node
4. Logger Node (Success)
5. Logger Node (Error)

**Step-by-Step:**
1. **Add Manual Trigger**
   - Button Text: `"Fetch API Data"`
   - Input Data: `{"apiUrl": "https://jsonplaceholder.typicode.com/posts/1"}`

2. **Add HTTP Request Node**
   - Connect Trigger → HTTP Request
   - Configure:
     - Method: `"GET"`
     - URL: `"{{input.apiUrl}}"` or `"https://jsonplaceholder.typicode.com/posts/1"`
     - Headers: `{"Content-Type": "application/json"}`

3. **Add Condition Node**
   - Connect HTTP Request → Condition
   - Configure:
     - Condition: `"{{response.status}} === 200"`
     - True Path: → Logger (Success)
     - False Path: → Logger (Error)

4. **Add Logger Node (Success)**
   - Configure:
     - Log Level: `"success"`
     - Message: `"API call successful: {{response.data.title}}"`

5. **Add Logger Node (Error)**
   - Configure:
     - Log Level: `"error"`
     - Message: `"API call failed: {{response.status}}"`

6. **Run Workflow**
   - Expected: Success logger should fire with post data

**Expected Output:**
```json
{
  "status": 200,
  "data": {
    "userId": 1,
    "id": 1,
    "title": "sunt aut facere repellat...",
    "body": "quia et suscipit..."
  }
}
```

---

### Workflow 2.3: CSV Processing Workflow
**Purpose:** Process CSV data and transform it

**Nodes:**
1. Manual Trigger
2. CSV Node
3. Data Transform Node
4. JSON Node
5. Logger Node

**Step-by-Step:**
1. **Add Manual Trigger**
   - Button Text: `"Process CSV"`
   - Input Data:
   ```json
   {
     "csvData": "name,age,city\nAlice,25,New York\nBob,30,London\nCharlie,35,Paris"
   }
   ```

2. **Add CSV Node**
   - Connect Trigger → CSV
   - Configure:
     - Operation: `"parse"`
     - CSV Data: `"{{input.csvData}}"`

3. **Add Data Transform Node**
   - Connect CSV → Data Transform
   - Configure:
     - Transform each row to: `{"person": "{{row.name}}", "location": "{{row.city}}"}`

4. **Add JSON Node**
   - Connect Data Transform → JSON
   - Configure:
     - Operation: `"stringify"`
     - Data Path: `"data"`

5. **Add Logger Node**
   - Connect JSON → Logger
   - Configure:
     - Log Level: `"info"`
     - Message: `"Processed CSV: {{data}}"`

6. **Run Workflow**
   - Expected: CSV parsed and transformed to JSON

**Expected Output:**
```json
{
  "transformed": [
    {"person": "Alice", "location": "New York"},
    {"person": "Bob", "location": "London"},
    {"person": "Charlie", "location": "Paris"}
  ]
}
```

---

### Workflow 2.4: Merge and Split Data
**Purpose:** Test data merging and splitting operations

**Nodes:**
1. Manual Trigger
2. Merge Node
3. Split Node
4. Logger Node

**Step-by-Step:**
1. **Add Manual Trigger**
   - Button Text: `"Merge and Split"`
   - Input Data:
   ```json
   {
     "data1": {"a": 1, "b": 2},
     "data2": {"c": 3, "d": 4},
     "items": ["item1", "item2", "item3"]
   }
   ```

2. **Add Merge Node**
   - Connect Trigger → Merge
   - Configure:
     - Merge Type: `"object"`
     - Source 1 Path: `"input.data1"`
     - Source 2 Path: `"input.data2"`

3. **Add Split Node**
   - Connect Trigger → Split (parallel path)
   - Configure:
     - Split Type: `"array"`
     - Array Path: `"input.items"`

4. **Add Logger Node**
   - Connect both Merge and Split → Logger
   - Configure:
     - Log Level: `"info"`
     - Message: `"Merged: {{mergedData}}, Split: {{splitData}}"`

5. **Run Workflow**
   - Expected: Objects merged, array split into individual items

**Expected Output:**
```json
{
  "merged": {"a": 1, "b": 2, "c": 3, "d": 4},
  "split": ["item1", "item2", "item3"]
}
```

---

## Level 3: Advanced Workflows (7-10 nodes)

### Workflow 3.1: Complete Data Processing Pipeline
**Purpose:** End-to-end data processing with validation

**Nodes:**
1. Manual Trigger
2. JSON Node
3. Data Validation Node
4. Filter Node
5. Data Transform Node
6. Merge Node
7. JSON Transform Node
8. Logger Node

**Step-by-Step:**
1. **Add Manual Trigger**
   - Button Text: `"Process Orders"`
   - Input Data:
   ```json
   {
     "orders": [
       {"id": 1, "amount": 100, "status": "pending", "customer": "Alice"},
       {"id": 2, "amount": 200, "status": "completed", "customer": "Bob"},
       {"id": 3, "amount": 150, "status": "pending", "customer": "Charlie"}
     ]
   }
   ```

2. **Add JSON Node**
   - Parse input data

3. **Add Data Validation Node** (or use Condition)
   - Validate: `"item.amount > 0"`

4. **Add Filter Node**
   - Filter: `"item.status === 'pending'"`

5. **Add Data Transform Node**
   - Transform to: `{"orderId": "{{item.id}}", "total": "{{item.amount}}"}`

6. **Add Merge Node**
   - Merge with metadata: `{"processedAt": "{{currentTime}}"}`

7. **Add JSON Transform Node**
   - Final formatting

8. **Add Logger Node**
   - Log results

**Expected Output:**
```json
{
  "processedOrders": [
    {"orderId": 1, "total": 100},
    {"orderId": 3, "total": 150}
  ],
  "processedAt": "2024-01-15T10:00:00Z",
  "count": 2
}
```

---

### Workflow 3.2: Webhook to Email Notification
**Purpose:** Receive webhook, process data, send email

**Nodes:**
1. Webhook Trigger
2. JSON Node
3. Data Transform Node
4. Condition Node
5. Email Node
6. Audit Log Node
7. Logger Node

**Step-by-Step:**
1. **Add Webhook Trigger**
   - Configure:
     - HTTP Method: `"POST"`
     - Webhook Path: `"/webhook/order-notification"`
     - Webhook Secret: `"my_secret_key"` (optional)

2. **Add JSON Node**
   - Parse webhook body

3. **Add Data Transform Node**
   - Extract: `{"orderId": "{{body.order_id}}", "customerEmail": "{{body.customer_email}}"}`

4. **Add Condition Node**
   - Check: `"{{transformed.customerEmail}}"` exists

5. **Add Email Node** (if condition true)
   - Configure:
     - To: `"{{transformed.customerEmail}}"`
     - Subject: `"Order Confirmation #{{transformed.orderId}}"`
     - Body: `"Your order has been received!"`

6. **Add Audit Log Node**
   - Log the webhook event

7. **Add Logger Node**
   - Log success/failure

**Test Input (via curl or Postman):**
```bash
curl -X POST http://localhost:3003/webhook/order-notification \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "12345",
    "customer_email": "customer@example.com",
    "amount": 99.99
  }'
```

**Expected Output:**
- Email sent to customer@example.com
- Audit log created
- Success message logged

---

### Workflow 3.3: AI-Powered Text Analysis
**Purpose:** Analyze text using AI nodes

**Nodes:**
1. Manual Trigger
2. Text Analyzer Node
3. Data Analyzer Node
4. Condition Node
5. Logger Node (Positive)
6. Logger Node (Negative)

**Step-by-Step:**
1. **Add Manual Trigger**
   - Button Text: `"Analyze Text"`
   - Input Data:
   ```json
   {
     "text": "I love this product! It's amazing and works perfectly."
   }
   ```

2. **Add Text Analyzer Node**
   - Configure:
     - Text: `"{{input.text}}"`
     - Analysis Type: `"sentiment"` or `"keywords"`

3. **Add Data Analyzer Node**
   - Configure:
     - Data: `"{{textAnalyzer.result}}"`
     - Analysis Type: `"summary"`

4. **Add Condition Node**
   - Check sentiment: `"{{textAnalyzer.sentiment}} === 'positive'"`

5. **Add Logger Node (Positive)**
   - Log: `"Positive feedback received"`

6. **Add Logger Node (Negative)**
   - Log: `"Negative feedback received"`

**Expected Output:**
```json
{
  "sentiment": "positive",
  "keywords": ["love", "amazing", "perfectly"],
  "summary": "Customer expresses strong positive sentiment"
}
```

---

### Workflow 3.4: Database Query with HTTP Response
**Purpose:** Query database and return HTTP response

**Nodes:**
1. Webhook Trigger
2. JSON Node
3. Database Node (or PostgreSQL)
4. Data Transform Node
5. JSON Transform Node
6. HTTP Response Node (or Logger)
7. Audit Log Node

**Step-by-Step:**
1. **Add Webhook Trigger**
   - Method: `"GET"`
   - Path: `"/api/users/:userId"`

2. **Add JSON Node**
   - Extract userId from query/params

3. **Add Database Node**
   - Configure:
     - Query Type: `"select"`
     - Table: `"users"`
     - Condition: `"id = {{userId}}"`

4. **Add Data Transform Node**
   - Format response

5. **Add JSON Transform Node**
   - Final formatting

6. **Add HTTP Response Node** (or Logger)
   - Return formatted data

7. **Add Audit Log Node**
   - Log the query

**Test Input:**
```bash
curl http://localhost:3003/api/users/123
```

**Expected Output:**
```json
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com"
}
```

---

## Level 4: Complex Workflows (11+ nodes)

### Workflow 4.1: Complete E-commerce Order Processing
**Purpose:** Full order processing pipeline

**Nodes:**
1. Webhook Trigger (Order Received)
2. JSON Node
3. Data Validation Node
4. Database Node (Check Inventory)
5. Condition Node (Inventory Check)
6. Stripe Node (Payment Processing)
7. Database Node (Update Order)
8. Email Node (Order Confirmation)
9. Slack Node (Notify Team)
10. Audit Log Node
11. Logger Node

**Step-by-Step:**
1. **Webhook Trigger** - Receive order
2. **JSON Node** - Parse order data
3. **Data Validation** - Validate order structure
4. **Database Node** - Check product inventory
5. **Condition Node** - If inventory available
6. **Stripe Node** - Process payment
7. **Database Node** - Update order status
8. **Email Node** - Send confirmation
9. **Slack Node** - Notify fulfillment team
10. **Audit Log** - Log transaction
11. **Logger** - Log completion

**Test Input:**
```json
{
  "order_id": "ORD-12345",
  "customer_email": "customer@example.com",
  "items": [
    {"product_id": 1, "quantity": 2}
  ],
  "payment_token": "tok_visa"
}
```

**Expected Output:**
- Payment processed
- Order confirmed
- Email sent
- Slack notification sent
- Audit log created

---

### Workflow 4.2: AI-Powered Content Generation Pipeline
**Purpose:** Generate and process content using AI

**Nodes:**
1. Manual Trigger
2. Text Analyzer Node
3. OpenAI Node (Generate Content)
4. Code Generator Node
5. Data Analyzer Node
6. Text to Speech Node
7. File Upload Node (Save Generated Content)
8. Email Node (Send Results)
9. Audit Log Node
10. Logger Node

**Step-by-Step:**
1. **Manual Trigger** - Start with topic
2. **Text Analyzer** - Analyze requirements
3. **OpenAI Node** - Generate article
4. **Code Generator** - Generate code examples
5. **Data Analyzer** - Analyze generated content
6. **Text to Speech** - Convert to audio
7. **File Upload** - Save to storage
8. **Email Node** - Send to client
9. **Audit Log** - Log generation
10. **Logger** - Log success

**Test Input:**
```json
{
  "topic": "Introduction to Machine Learning",
  "length": "1000 words",
  "format": "article"
}
```

---

## Testing Checklist

### For Each Workflow:

- [ ] **Workflow Creation**
  - [ ] Workflow created successfully
  - [ ] All nodes added correctly
  - [ ] All connections made properly

- [ ] **Node Configuration**
  - [ ] Each node configured with correct inputs
  - [ ] Required fields filled
  - [ ] Dynamic inputs connected properly

- [ ] **Workflow Execution**
  - [ ] Workflow runs without errors
  - [ ] All nodes execute in correct order
  - [ ] Data flows correctly between nodes

- [ ] **Output Validation**
  - [ ] Expected outputs match actual outputs
  - [ ] Data transformations work correctly
  - [ ] Error handling works (if applicable)

- [ ] **Error Scenarios**
  - [ ] Invalid inputs handled gracefully
  - [ ] Error messages are clear
  - [ ] Workflow fails safely

- [ ] **Performance**
  - [ ] Workflow completes in reasonable time
  - [ ] No memory leaks
  - [ ] Resources cleaned up properly

---

## Quick Reference: Common Node Configurations

### Manual Trigger
```json
{
  "buttonText": "Run Workflow",
  "inputData": {
    "key": "value"
  }
}
```

### HTTP Request
```json
{
  "method": "GET",
  "url": "https://api.example.com/data",
  "headers": {
    "Content-Type": "application/json"
  }
}
```

### Condition Node
```json
{
  "condition": "{{data.value}} > 10",
  "truePath": "success",
  "falsePath": "error"
}
```

### Email Node
```json
{
  "to": "recipient@example.com",
  "subject": "Test Email",
  "body": "This is a test email"
}
```

### Logger Node
```json
{
  "logLevel": "info",
  "message": "Processing data: {{data}}"
}
```

---

## Tips for Testing

1. **Start Simple**: Begin with 2-3 node workflows, then increase complexity
2. **Test One Node at a Time**: Verify each node works before connecting to next
3. **Use Console**: Check browser console for errors and debug messages
4. **Save Frequently**: Save your workflows as you build them
5. **Document Results**: Note what works and what doesn't for future reference
6. **Test Edge Cases**: Try invalid inputs, empty data, null values
7. **Check Data Flow**: Verify data passes correctly between nodes using logger

---

## Next Steps

After completing these workflows:

1. Create your own custom workflows for your use cases
2. Test with real data from your application
3. Integrate workflows into your application
4. Monitor workflow performance and optimize
5. Document your custom workflows for your team

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify backend is running
3. Check node configurations match examples
4. Ensure data types match expected formats
5. Review node documentation for specific requirements

Good luck with your testing! 🚀



---

# Frontend Testing Roadmap

This roadmap will guide you through testing your frontend with different types of workflows, step-by-step.

---

## 📋 Overview

You have **130+ nodes** available across multiple categories. This roadmap will help you:
1. Understand what inputs to give
2. Know what outputs to expect
3. Create workflows systematically
4. Test all node categories

---

## 🗺️ Testing Roadmap

### Week 1: Foundation (Basic Nodes)

**Goal:** Test basic utility and core nodes

**Day 1-2: Simple Workflows (2-3 nodes)**
- ✅ Simple Math Calculation
- ✅ Delay and Logger
- ✅ JSON Transformation
- ✅ DateTime Operations

**Day 3-4: Data Processing (3-4 nodes)**
- ✅ JSON Operations
- ✅ CSV Processing
- ✅ Data Transform
- ✅ Filter Operations

**Day 5: Testing & Documentation**
- ✅ Test all workflows from Day 1-4
- ✅ Document what works
- ✅ Note any issues

**Resources:**
- See `QUICK_START_WORKFLOW_EXAMPLES.md` - Examples 1-5
- See `FRONTEND_WORKFLOW_TESTING_GUIDE.md` - Level 1 workflows

---

### Week 2: Intermediate (HTTP & API Nodes)

**Goal:** Test HTTP requests, webhooks, and API integrations

**Day 1-2: HTTP Requests**
- ✅ HTTP Request with Condition
- ✅ HTTP Request Enhanced
- ✅ Error Handling

**Day 3-4: Webhooks & Triggers**
- ✅ Webhook Trigger
- ✅ Form Trigger
- ✅ Schedule Trigger
- ✅ Manual Trigger

**Day 5: API Integrations**
- ✅ REST API Node
- ✅ GraphQL Node
- ✅ Webhook Call Node

**Resources:**
- See `QUICK_START_WORKFLOW_EXAMPLES.md` - Examples 6-7
- See `FRONTEND_WORKFLOW_TESTING_GUIDE.md` - Level 2 workflows

---

### Week 3: Advanced (AI & LLM Nodes)

**Goal:** Test AI and LLM capabilities

**Day 1-2: Text Analysis**
- ✅ Text Analyzer Node
- ✅ Data Analyzer Node
- ✅ Email Analyzer Node

**Day 3-4: AI Generation**
- ✅ OpenAI Node
- ✅ Code Generator Node
- ✅ Text to Speech Node
- ✅ Speech to Text Node

**Day 5: Advanced AI**
- ✅ Image Generator Node
- ✅ Vector Search Node
- ✅ HuggingFace Node

**Resources:**
- See `FRONTEND_WORKFLOW_TESTING_GUIDE.md` - Level 3 workflows
- See `COMPLETE_NODE_LIST.md` - AI Nodes section

---

### Week 4: Communication & Integration

**Goal:** Test communication and integration nodes

**Day 1-2: Communication Nodes**
- ✅ Email Node
- ✅ Slack Node
- ✅ Discord Node
- ✅ Telegram Node

**Day 3-4: File Processing**
- ✅ File Upload Node
- ✅ File Validation Node
- ✅ Data Cleaning Node
- ✅ File Export Node

**Day 5: Database Nodes**
- ✅ PostgreSQL Node
- ✅ MySQL Node
- ✅ MongoDB Node
- ✅ Database Node

**Resources:**
- See `FRONTEND_WORKFLOW_TESTING_GUIDE.md` - Level 3-4 workflows
- See `COMPLETE_NODE_LIST.md` - Communication & Data Nodes sections

---

### Week 5: Complex Workflows

**Goal:** Create complex multi-node workflows

**Day 1-2: E-commerce Workflow**
- ✅ Order Processing Pipeline
- ✅ Payment Processing
- ✅ Email Notifications
- ✅ Database Updates

**Day 3-4: Data Pipeline**
- ✅ Data Collection
- ✅ Data Processing
- ✅ Data Transformation
- ✅ Data Storage

**Day 5: Integration Testing**
- ✅ End-to-end workflows
- ✅ Error handling
- ✅ Performance testing

**Resources:**
- See `FRONTEND_WORKFLOW_TESTING_GUIDE.md` - Level 4 workflows
- See `UTILITY_NODES_TESTING_GUIDE.md` - Complete scenarios

---

## 📝 Step-by-Step Testing Process

### For Each Workflow:

1. **Plan Your Workflow**
   - Decide which nodes to use
   - Plan the data flow
   - Identify inputs and outputs

2. **Create Workflow in Frontend**
   - Click "Create New Workflow"
   - Give it a descriptive name
   - Add description

3. **Add Nodes**
   - Drag nodes from sidebar
   - Connect them in order
   - Verify connections

4. **Configure Each Node**
   - Click on node to open config panel
   - Fill in required fields
   - Use examples from guides
   - Connect dynamic inputs if needed

5. **Test Workflow**
   - Click "Run" button
   - Watch execution progress
   - Check output panel
   - Check console for errors

6. **Verify Results**
   - Compare output with expected results
   - Verify all nodes executed
   - Check data transformations

7. **Save Workflow**
   - Click "Save" button
   - Give it a descriptive name
   - Add tags if available

8. **Document Results**
   - Note what worked
   - Note any issues
   - Document configurations

---

## 🎯 Testing Checklist

### For Each Workflow:

**Before Testing:**
- [ ] Workflow created
- [ ] All nodes added
- [ ] All connections made
- [ ] All nodes configured
- [ ] Input data prepared

**During Testing:**
- [ ] Workflow runs without errors
- [ ] All nodes execute
- [ ] Data flows correctly
- [ ] Output matches expected

**After Testing:**
- [ ] Results documented
- [ ] Issues noted
- [ ] Workflow saved
- [ ] Configurations saved

---

## 📚 Documentation Guide

### What to Document:

1. **Workflow Details**
   - Name and description
   - Nodes used
   - Connections made
   - Purpose of workflow

2. **Node Configurations**
   - Input values used
   - Dynamic inputs connected
   - Output paths used
   - Any special settings

3. **Test Results**
   - Expected outputs
   - Actual outputs
   - Any errors encountered
   - Performance metrics

4. **Issues & Solutions**
   - Problems encountered
   - Solutions found
   - Workarounds used
   - Notes for future

---

## 🔍 Common Testing Scenarios

### Scenario 1: Basic Data Flow
**Purpose:** Verify data flows between nodes

**Workflow:**
1. Manual Trigger → JSON Node → Data Transform → Logger

**Test:**
- Input: `{"name": "John", "age": 30}`
- Expected: Transformed data logged

---

### Scenario 2: Conditional Logic
**Purpose:** Test conditional branching

**Workflow:**
1. Manual Trigger → Condition Node → Logger (True) / Logger (False)

**Test:**
- Input: `{"value": 10}`
- Condition: `value > 5`
- Expected: True path executes

---

### Scenario 3: Error Handling
**Purpose:** Test error handling

**Workflow:**
1. Manual Trigger → HTTP Request → Condition → Logger (Error)

**Test:**
- Invalid URL
- Expected: Error logged, workflow continues

---

### Scenario 4: Data Transformation
**Purpose:** Test data transformations

**Workflow:**
1. Manual Trigger → JSON Node → Filter → Transform → Logger

**Test:**
- Input: Array of objects
- Expected: Filtered and transformed data

---

## 💡 Tips for Success

1. **Start Simple**
   - Begin with 2-3 node workflows
   - Gradually increase complexity
   - Master basics before advanced

2. **Test Incrementally**
   - Test one node at a time
   - Verify each step before moving on
   - Use logger nodes to debug

3. **Use Examples**
   - Follow examples in guides
   - Adapt examples to your needs
   - Build on successful workflows

4. **Document Everything**
   - Keep notes on what works
   - Document configurations
   - Save successful workflows

5. **Test Edge Cases**
   - Try invalid inputs
   - Test empty data
   - Test null values
   - Test error scenarios

6. **Save Frequently**
   - Save after each successful test
   - Create backups
   - Version your workflows

---

## 🚀 Quick Start

**Ready to start? Follow these steps:**

1. **Read Quick Start Guide**
   - Open `QUICK_START_WORKFLOW_EXAMPLES.md`
   - Start with Example 1
   - Follow step-by-step instructions

2. **Create Your First Workflow**
   - Example 1: Simple Math (2 nodes)
   - Takes 5-10 minutes
   - Builds confidence

3. **Test and Verify**
   - Run workflow
   - Check output
   - Verify results

4. **Move to Next Example**
   - Example 2: Delay and Log (3 nodes)
   - Gradually increase complexity
   - Build your skills

5. **Document Your Progress**
   - Note what works
   - Note any issues
   - Keep track of configurations

---

## 📖 Resources

### Documentation Files:
1. **QUICK_START_WORKFLOW_EXAMPLES.md**
   - Ready-to-use examples
   - Step-by-step instructions
   - Quick reference

2. **FRONTEND_WORKFLOW_TESTING_GUIDE.md**
   - Comprehensive guide
   - All workflow levels
   - Detailed configurations

3. **UTILITY_NODES_TESTING_GUIDE.md**
   - Utility node details
   - Input/output examples
   - Testing scenarios

4. **COMPLETE_NODE_LIST.md**
   - All available nodes
   - Node categories
   - Testing strategy

---

## 🎓 Learning Path

### Beginner (Week 1-2)
- ✅ Basic nodes (Math, Logger, Delay)
- ✅ Data processing (JSON, CSV)
- ✅ Simple workflows (2-4 nodes)

### Intermediate (Week 3-4)
- ✅ HTTP requests
- ✅ Webhooks
- ✅ API integrations
- ✅ Medium workflows (5-7 nodes)

### Advanced (Week 5+)
- ✅ AI/LLM nodes
- ✅ Complex workflows (8+ nodes)
- ✅ Integration testing
- ✅ Performance optimization

---

## ✅ Success Criteria

### You'll know you're successful when:

1. **You can create workflows confidently**
   - Know which nodes to use
   - Know how to configure them
   - Know how to connect them

2. **You understand data flow**
   - Know what inputs to give
   - Know what outputs to expect
   - Know how data transforms

3. **You can debug issues**
   - Identify problems quickly
   - Fix configuration errors
   - Resolve data flow issues

4. **You can create complex workflows**
   - Combine multiple nodes
   - Handle errors gracefully
   - Optimize performance

---

## 🎯 Next Steps

1. **Start with Quick Start Guide**
   - Open `QUICK_START_WORKFLOW_EXAMPLES.md`
   - Begin with Example 1
   - Follow the roadmap

2. **Create Your First Workflow**
   - Simple Math Calculation
   - Test it thoroughly
   - Document results

3. **Progress Through Examples**
   - One example at a time
   - Master each before moving on
   - Build your skills gradually

4. **Create Your Own Workflows**
   - Use what you've learned
   - Create workflows for your use cases
   - Share with your team

---

## 📞 Support

If you need help:
1. Check the guides first
2. Review examples
3. Check node documentation
4. Test with simple workflows first
5. Use logger nodes to debug

---

**Good luck with your testing! You've got this! 🚀**

---

## 📅 Weekly Progress Tracker

### Week 1: Foundation
- [ ] Day 1: Simple workflows
- [ ] Day 2: Simple workflows
- [ ] Day 3: Data processing
- [ ] Day 4: Data processing
- [ ] Day 5: Testing & documentation

### Week 2: Intermediate
- [ ] Day 1: HTTP requests
- [ ] Day 2: HTTP requests
- [ ] Day 3: Webhooks & triggers
- [ ] Day 4: Webhooks & triggers
- [ ] Day 5: API integrations

### Week 3: Advanced
- [ ] Day 1: Text analysis
- [ ] Day 2: Text analysis
- [ ] Day 3: AI generation
- [ ] Day 4: AI generation
- [ ] Day 5: Advanced AI

### Week 4: Communication & Integration
- [ ] Day 1: Communication nodes
- [ ] Day 2: Communication nodes
- [ ] Day 3: File processing
- [ ] Day 4: File processing
- [ ] Day 5: Database nodes

### Week 5: Complex Workflows
- [ ] Day 1: E-commerce workflow
- [ ] Day 2: E-commerce workflow
- [ ] Day 3: Data pipeline
- [ ] Day 4: Data pipeline
- [ ] Day 5: Integration testing

---

**Track your progress and celebrate your wins! 🎉**

