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

