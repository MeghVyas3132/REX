#!/bin/bash

# Gmail Node Operations Test Script
# This script tests all Gmail node operations using curl commands

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:3003}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
ISSUES=()

# Function to print test header
print_test() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Testing: $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to test an operation
test_operation() {
    local operation=$1
    local config_json=$2
    local description=$3
    
    print_test "$description (Operation: $operation)"
    
    # Prepare request body
    local body=$(cat <<EOF
{
  "config": {
    "operation": "$operation",
    $config_json
  }
}
EOF
)
    
    # Make request
    local response
    if [ -z "$AUTH_TOKEN" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST \
            "$BACKEND_URL/api/workflows/nodes/gmail/execute" \
            -H "Content-Type: application/json" \
            -d "$body")
    else
        response=$(curl -s -w "\n%{http_code}" -X POST \
            "$BACKEND_URL/api/workflows/nodes/gmail/execute" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -d "$body")
    fi
    
    # Extract HTTP status code (last line)
    local http_code=$(echo "$response" | tail -n1)
    # Extract response body (all but last line)
    local response_body=$(echo "$response" | sed '$d')
    
    # Check result
    if [ "$http_code" -eq 200 ]; then
        local success=$(echo "$response_body" | grep -o '"success":[^,}]*' | cut -d':' -f2 | tr -d ' ')
        if [ "$success" = "true" ]; then
            echo -e "${GREEN}✓ PASSED${NC}"
            echo "Response: $response_body" | head -c 500
            echo ""
            ((PASSED++))
            return 0
        else
            echo -e "${RED}✗ FAILED - Success is false${NC}"
            echo "Response: $response_body"
            ((FAILED++))
            ISSUES+=("$description: Success is false")
            return 1
        fi
    else
        echo -e "${RED}✗ FAILED - HTTP $http_code${NC}"
        echo "Response: $response_body"
        ((FAILED++))
        ISSUES+=("$description: HTTP $http_code - $(echo "$response_body" | grep -o '"error":"[^"]*"' | cut -d'"' -f4 || echo 'Unknown error')")
        return 1
    fi
}

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Gmail Node Operations Test Suite${NC}"
echo -e "${YELLOW}========================================${NC}"
echo "Backend URL: $BACKEND_URL"
echo "Auth Token: ${AUTH_TOKEN:0:20}..." 
echo ""

# Test 1: List Messages
test_operation "list" '"maxResults": 5' "List Messages"

# Test 2: Read Emails
test_operation "read" '"maxResults": 5, "labelIds": ["INBOX"]' "Read Emails"

# Test 3: Search Emails
test_operation "search" '"query": "is:unread", "maxResults": 5' "Search Emails"

# Test 4: Get Message (will fail without messageId, but tests the operation exists)
test_operation "get" '"messageId": "test123", "format": "full"' "Get Message (test - will fail without valid ID)"

# Test 5: List Drafts
test_operation "listDrafts" '"maxResults": 5' "List Drafts"

# Test 6: Get Draft (will fail without draftId, but tests the operation exists)
test_operation "getDraft" '"draftId": "test123"' "Get Draft (test - will fail without valid ID)"

# Test 7: List Labels
test_operation "listLabels" '{}' "List Labels"

# Test 8: Get Label (will fail without labelId, but tests the operation exists)
test_operation "getLabel" '"labelId": "INBOX"' "Get Label"

# Test 9: List Threads
test_operation "listThreads" '"maxResults": 5' "List Threads"

# Test 10: Get Thread (will fail without threadId, but tests the operation exists)
test_operation "getThread" '"threadId": "test123"' "Get Thread (test - will fail without valid ID)"

# Test 11: Create Label
test_operation "createLabel" '"name": "Test Label '$(date +%s)'", "labelListVisibility": "labelShow", "messageListVisibility": "show"' "Create Label"

# Test 12: Send Email (will fail without required fields, but tests the operation exists)
test_operation "send" '"to": "test@example.com", "subject": "Test", "body": "Test body"' "Send Email (test - may fail without valid OAuth)"

# Test 13: Create Draft (will fail without required fields, but tests the operation exists)
test_operation "createDraft" '"to": "test@example.com", "subject": "Test Draft", "body": "Test draft body"' "Create Draft (test - may fail without valid OAuth)"

# Test 14: Reply to Email (will fail without required fields, but tests the operation exists)
test_operation "reply" '"threadId": "test123", "subject": "Re: Test", "body": "Reply body"' "Reply to Email (test - may fail without valid OAuth)"

# Test 15: Delete Draft (will fail without draftId, but tests the operation exists)
test_operation "deleteDraft" '"draftId": "test123"' "Delete Draft (test - will fail without valid ID)"

# Test 16: Delete Label (will fail without labelId, but tests the operation exists)
test_operation "deleteLabel" '"labelId": "test123"' "Delete Label (test - will fail without valid ID)"

# Test 17: Trash Thread (will fail without threadId, but tests the operation exists)
test_operation "trashThread" '"threadId": "test123"' "Trash Thread (test - will fail without valid ID)"

# Test 18: Untrash Thread (will fail without threadId, but tests the operation exists)
test_operation "untrashThread" '"threadId": "test123"' "Untrash Thread (test - will fail without valid ID)"

# Test 19: Add Label to Thread (will fail without required fields, but tests the operation exists)
test_operation "addLabelToThread" '"threadId": "test123", "labelIds": ["INBOX"]' "Add Label to Thread (test - will fail without valid ID)"

# Test 20: Remove Label from Thread (will fail without required fields, but tests the operation exists)
test_operation "removeLabelFromThread" '"threadId": "test123", "labelIds": ["INBOX"]' "Remove Label from Thread (test - will fail without valid ID)"

# Test 21: Add Label to Message (will fail without required fields, but tests the operation exists)
test_operation "addLabelToMessage" '"messageId": "test123", "labelIds": ["INBOX"]' "Add Label to Message (test - will fail without valid ID)"

# Test 22: Remove Label from Message (will fail without required fields, but tests the operation exists)
test_operation "removeLabelFromMessage" '"messageId": "test123", "labelIds": ["INBOX"]' "Remove Label from Message (test - will fail without valid ID)"

# Test 23: Delete Message (will fail without messageId, but tests the operation exists)
test_operation "deleteMessage" '"messageId": "test123"' "Delete Message (test - will fail without valid ID)"

# Test 24: Get Many Messages (will fail without messageIds, but tests the operation exists)
test_operation "getManyMessages" '"messageIds": ["test123"], "format": "full"' "Get Many Messages (test - will fail without valid IDs)"

# Test 25: Mark as Read (will fail without messageId, but tests the operation exists)
test_operation "markAsRead" '"messageId": "test123"' "Mark as Read (test - will fail without valid ID)"

# Test 26: Mark as Unread (will fail without messageId, but tests the operation exists)
test_operation "markAsUnread" '"messageId": "test123"' "Mark as Unread (test - will fail without valid ID)"

# Test 27: Send and Wait (will fail without required fields, but tests the operation exists)
test_operation "sendAndWait" '"to": "test@example.com", "subject": "Test", "body": "Test body", "maxWaitTime": 60, "pollInterval": 5' "Send and Wait (test - may fail without valid OAuth)"

# Print summary
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Test Summary${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "Total: $((PASSED + FAILED))"

if [ ${#ISSUES[@]} -gt 0 ]; then
    echo -e "\n${RED}Issues Found:${NC}"
    for issue in "${ISSUES[@]}"; do
        echo -e "${RED}  - $issue${NC}"
    done
else
    echo -e "\n${GREEN}No issues found!${NC}"
fi

echo -e "\n${YELLOW}Note: Some operations may fail due to:${NC}"
echo "  - Missing OAuth authentication (connect Google account first)"
echo "  - Invalid message/thread/draft IDs (expected for test operations)"
echo "  - Missing required fields (expected for some test operations)"
echo ""
echo "The important thing is that the operation is recognized and the node structure is correct."

exit $FAILED

