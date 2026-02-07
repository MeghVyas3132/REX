#!/bin/bash

# Workflow Testing Script
# Tests: File Upload → Code → Text Analyzer Workflow

set -e

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:3003}"
TEST_DIR="./test-files"
API_KEY="${OPENAI_API_KEY:-your-openai-api-key}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Workflow Testing Script ===${NC}\n"

# Check if backend is running
echo "Checking backend connection..."
if ! curl -s -f "${BACKEND_URL}/health" > /dev/null 2>&1; then
    echo -e "${YELLOW}Warning: Backend health check failed. Continuing anyway...${NC}\n"
fi

# Create test files directory
mkdir -p "${TEST_DIR}"

# Create test files
echo "Creating test files..."
cat > "${TEST_DIR}/positive.txt" << 'EOF'
I love this product! It's amazing and works perfectly. 
The quality is outstanding and I would definitely recommend it to others.
The customer service was excellent and the delivery was fast.
EOF

cat > "${TEST_DIR}/negative.txt" << 'EOF'
I hate this product. It's terrible and doesn't work at all. 
Very disappointed with the quality and customer service.
Would not recommend to anyone.
EOF

cat > "${TEST_DIR}/neutral.txt" << 'EOF'
The product arrived on time. It functions as described. 
No complaints, but nothing exceptional either.
EOF

echo -e "${GREEN}✓ Test files created${NC}\n"

# Workflow JSON template
WORKFLOW_JSON=$(cat <<EOF
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
          "allowedTypes": ["text/plain"],
          "maxSize": 10485760
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
          "code": "const fs = require('fs');\\nconst filePath = input.filePath || input.fileInfo?.path;\\nlet textContent = '';\\nif (filePath && fs.existsSync(filePath)) {\\n  textContent = fs.readFileSync(filePath, 'utf8');\\n} else if (input.fileContent) {\\n  textContent = input.fileContent;\\n} else if (input.text) {\\n  textContent = input.text;\\n}\\nreturn { text: textContent, filePath: filePath, originalInput: input };",
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
          "apiKey": "${API_KEY}",
          "analysisType": "sentiment",
          "model": "gpt-3.5-turbo",
          "language": "en",
          "includeConfidence": true
        }
      },
      "position": {"x": 500, "y": 100}
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
    "filePath": "FILE_PATH_PLACEHOLDER"
  }
}
EOF
)

# Function to test workflow with a file
test_workflow() {
    local file_path=$1
    local file_name=$(basename "$file_path")
    
    echo -e "${YELLOW}Testing with: ${file_name}${NC}"
    
    # Replace placeholder with actual file path
    local workflow_json=$(echo "$WORKFLOW_JSON" | sed "s|FILE_PATH_PLACEHOLDER|${file_path}|g")
    
    # Execute workflow
    local response=$(curl -s -X POST "${BACKEND_URL}/api/workflows/test/execute" \
        -H "Content-Type: application/json" \
        -d "$workflow_json")
    
    # Check if request was successful
    if [ $? -eq 0 ]; then
        # Check if response contains success
        if echo "$response" | grep -q '"success":true'; then
            echo -e "${GREEN}✓ Workflow executed successfully${NC}"
            
            # Extract sentiment if available
            local sentiment=$(echo "$response" | grep -o '"sentiment":"[^"]*"' | cut -d'"' -f4 || echo "N/A")
            echo -e "  Sentiment: ${sentiment}"
            
            # Extract confidence if available
            local confidence=$(echo "$response" | grep -o '"confidence":[0-9.]*' | cut -d':' -f2 || echo "N/A")
            echo -e "  Confidence: ${confidence}"
        else
            echo -e "${RED}✗ Workflow execution failed${NC}"
            echo "  Response: $response" | head -c 200
        fi
    else
        echo -e "${RED}✗ Request failed${NC}"
    fi
    
    echo ""
}

# Test with each file
echo "Testing workflow with different sentiment files...\n"

test_workflow "${TEST_DIR}/positive.txt"
test_workflow "${TEST_DIR}/negative.txt"
test_workflow "${TEST_DIR}/neutral.txt"

echo -e "${GREEN}=== Testing Complete ===${NC}\n"

# Optional: Clean up test files
read -p "Do you want to clean up test files? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "${TEST_DIR}"
    echo -e "${GREEN}✓ Test files cleaned up${NC}"
fi

