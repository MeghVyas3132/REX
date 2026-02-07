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

