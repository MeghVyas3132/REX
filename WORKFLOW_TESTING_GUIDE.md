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

