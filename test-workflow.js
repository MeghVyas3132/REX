#!/usr/bin/env node

/**
 * Workflow Testing Script
 * Tests: File Upload → Code → Text Analyzer Workflow
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3003';
const API_KEY = process.env.OPENAI_API_KEY || 'your-openai-api-key';
const TEST_DIR = './test-files';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Create test files
function createTestFiles() {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  const testFiles = {
    'positive.txt': `I love this product! It's amazing and works perfectly. 
The quality is outstanding and I would definitely recommend it to others.
The customer service was excellent and the delivery was fast.`,

    'negative.txt': `I hate this product. It's terrible and doesn't work at all. 
Very disappointed with the quality and customer service.
Would not recommend to anyone.`,

    'neutral.txt': `The product arrived on time. It functions as described. 
No complaints, but nothing exceptional either.`
  };

  Object.entries(testFiles).forEach(([filename, content]) => {
    const filePath = path.join(TEST_DIR, filename);
    fs.writeFileSync(filePath, content);
    log(`✓ Created ${filename}`, 'green');
  });
}

// Make HTTP request
function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = protocol.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test workflow with a file
async function testWorkflow(filePath) {
  const fileName = path.basename(filePath);
  log(`\nTesting with: ${fileName}`, 'yellow');

  const workflow = {
    nodes: [
      {
        id: 'file-upload-1',
        type: 'trigger',
        subtype: 'file-upload',
        data: {
          config: {
            source: 'local',
            uploadPath: './uploads',
            allowedTypes: ['text/plain'],
            maxSize: 10485760
          }
        },
        position: { x: 100, y: 100 }
      },
      {
        id: 'code-1',
        type: 'action',
        subtype: 'code',
        data: {
          config: {
            language: 'javascript',
            code: `const fs = require('fs');
const filePath = input.filePath || input.fileInfo?.path;
let textContent = '';
if (filePath && fs.existsSync(filePath)) {
  textContent = fs.readFileSync(filePath, 'utf8');
} else if (input.fileContent) {
  textContent = input.fileContent;
} else if (input.text) {
  textContent = input.text;
}
return { text: textContent, filePath: filePath, originalInput: input };`,
            timeout: 30,
            allowImports: true
          }
        },
        position: { x: 300, y: 100 }
      },
      {
        id: 'text-analyzer-1',
        type: 'action',
        subtype: 'text-analyzer',
        data: {
          config: {
            apiKey: API_KEY,
            analysisType: 'sentiment',
            model: 'gpt-3.5-turbo',
            language: 'en',
            includeConfidence: true
          }
        },
        position: { x: 500, y: 100 }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'file-upload-1',
        target: 'code-1',
        sourceHandle: 'output',
        targetHandle: 'input'
      },
      {
        id: 'edge-2',
        source: 'code-1',
        target: 'text-analyzer-1',
        sourceHandle: 'output',
        targetHandle: 'input'
      }
    ],
    input: {
      filePath: filePath
    }
  };

  try {
    const startTime = Date.now();
    const response = await makeRequest(
      `${BACKEND_URL}/api/workflows/test/execute`,
      { method: 'POST' },
      workflow
    );

    const duration = Date.now() - startTime;

    if (response.status === 200 && response.data.success) {
      log(`✓ Workflow executed successfully (${duration}ms)`, 'green');
      
      // Extract results
      const result = response.data.data?.result || response.data.result || {};
      const output = result.output || {};
      const nodeResults = output.nodeResults || result.nodeResults || {};

      // Display file upload results
      if (nodeResults['file-upload-1']) {
        const fileResult = nodeResults['file-upload-1'];
        log(`  File: ${fileResult.filePath || fileResult.fileInfo?.name || 'N/A'}`, 'blue');
      }

      // Display code results
      if (nodeResults['code-1']) {
        const codeResult = nodeResults['code-1'];
        const textPreview = codeResult.text ? 
          codeResult.text.substring(0, 50) + '...' : 'N/A';
        log(`  Text extracted: ${textPreview}`, 'blue');
      }

      // Display sentiment analysis results
      if (nodeResults['text-analyzer-1']) {
        const analyzerResult = nodeResults['text-analyzer-1'];
        const sentiment = analyzerResult.sentiment || analyzerResult.output?.sentiment || 'N/A';
        const confidence = analyzerResult.confidence || analyzerResult.output?.confidence || 'N/A';
        log(`  Sentiment: ${sentiment}`, 'green');
        log(`  Confidence: ${confidence}`, 'green');
      } else if (output.sentiment) {
        log(`  Sentiment: ${output.sentiment}`, 'green');
        log(`  Confidence: ${output.confidence || 'N/A'}`, 'green');
      }

      return { success: true, response };
    } else {
      log(`✗ Workflow execution failed`, 'red');
      log(`  Status: ${response.status}`, 'red');
      log(`  Error: ${JSON.stringify(response.data.error || response.data, null, 2)}`, 'red');
      return { success: false, response };
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return { success: false, error };
  }
}

// Main function
async function main() {
  log('=== Workflow Testing Script ===', 'green');
  log(`Backend URL: ${BACKEND_URL}`, 'blue');
  log(`API Key: ${API_KEY.substring(0, 10)}...`, 'blue');
  log('');

  // Create test files
  log('Creating test files...', 'yellow');
  createTestFiles();
  log('');

  // Test each file
  const testFiles = [
    path.join(TEST_DIR, 'positive.txt'),
    path.join(TEST_DIR, 'negative.txt'),
    path.join(TEST_DIR, 'neutral.txt')
  ];

  const results = [];
  for (const filePath of testFiles) {
    if (fs.existsSync(filePath)) {
      const result = await testWorkflow(filePath);
      results.push({ file: path.basename(filePath), ...result });
    } else {
      log(`✗ File not found: ${filePath}`, 'red');
    }
  }

  // Summary
  log('\n=== Test Summary ===', 'green');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  log(`Successful: ${successful}`, successful > 0 ? 'green' : 'red');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');

  // Cleanup option
  if (process.argv.includes('--cleanup')) {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
      log('\n✓ Test files cleaned up', 'green');
    }
  } else {
    log('\nTip: Run with --cleanup flag to remove test files', 'yellow');
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testWorkflow, createTestFiles };

