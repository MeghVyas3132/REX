#!/usr/bin/env node

/**
 * Comprehensive Node Audit Script
 * Checks all nodes for:
 * 1. Configuration structure issues
 * 2. Data structure compatibility
 * 3. Backend-frontend integration
 * 4. Required vs optional parameters
 * 5. Input/output schema consistency
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, 'backend 2', 'src', 'nodes');
const ISSUES = [];

// Helper to find all node files
function findNodeFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules') {
      findNodeFiles(filePath, fileList);
    } else if (file.endsWith('.node.ts') || file.endsWith('.node.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Audit a single node file
function auditNode(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(BACKEND_DIR, filePath);
  const category = path.dirname(relativePath).split(path.sep)[0] || 'root';
  const nodeName = path.basename(filePath, '.node.ts');
  
  const issues = [];
  
  // Check 1: Node class definition
  if (!content.includes('getNodeDefinition()')) {
    issues.push({
      type: 'MISSING_DEFINITION',
      severity: 'CRITICAL',
      message: 'Node does not have getNodeDefinition() method'
    });
  }
  
  // Check 2: Execute method
  if (!content.includes('async execute(')) {
    issues.push({
      type: 'MISSING_EXECUTE',
      severity: 'CRITICAL',
      message: 'Node does not have execute() method'
    });
  }
  
  // Check 3: Config access pattern
  const configAccessPatterns = [
    /node\.config\s*[!=]/g,
    /node\.data\?\.config/g,
    /node\.data\.config/g
  ];
  
  const hasDirectConfigAccess = /node\.config\s*[!=]/g.test(content);
  const hasDataConfigAccess = /node\.data\?\.config|node\.data\.config/g.test(content);
  
  if (hasDirectConfigAccess && !hasDataConfigAccess) {
    issues.push({
      type: 'CONFIG_ACCESS',
      severity: 'HIGH',
      message: 'Node accesses node.config directly instead of node.data?.config'
    });
  }
  
  // Check 4: Required parameters validation
  const hasRequiredCheck = content.includes('required: true');
  const hasValidation = content.includes('validate') || content.includes('Validation');
  
  if (hasRequiredCheck && !hasValidation) {
    issues.push({
      type: 'VALIDATION',
      severity: 'MEDIUM',
      message: 'Node has required parameters but may lack validation in execute()'
    });
  }
  
  // Check 5: Input access pattern
  const inputAccessPatterns = [
    /context\.input\?\./g,
    /context\.input\./g,
    /context\.input\[/g
  ];
  
  const hasSafeInputAccess = /context\.input\?\./g.test(content);
  const hasUnsafeInputAccess = /context\.input\.[^?]/g.test(content);
  
  if (hasUnsafeInputAccess && !hasSafeInputAccess) {
    issues.push({
      type: 'INPUT_ACCESS',
      severity: 'MEDIUM',
      message: 'Node may access context.input without optional chaining'
    });
  }
  
  // Check 6: Error handling
  const hasTryCatch = content.includes('try {') && content.includes('catch');
  if (!hasTryCatch) {
    issues.push({
      type: 'ERROR_HANDLING',
      severity: 'HIGH',
      message: 'Node execute() method may lack error handling'
    });
  }
  
  // Check 7: Return structure
  const hasSuccessReturn = content.includes('success: true') || content.includes('success: false');
  const hasDurationReturn = content.includes('duration:');
  
  if (!hasSuccessReturn) {
    issues.push({
      type: 'RETURN_STRUCTURE',
      severity: 'MEDIUM',
      message: 'Node may not return standard ExecutionResult structure'
    });
  }
  
  if (!hasDurationReturn) {
    issues.push({
      type: 'DURATION',
      severity: 'LOW',
      message: 'Node may not return duration in result'
    });
  }
  
  // Check 8: Logger usage
  const hasLogger = content.includes('logger.') || content.includes('require.*logger');
  if (!hasLogger) {
    issues.push({
      type: 'LOGGING',
      severity: 'LOW',
      message: 'Node may not use logger for debugging'
    });
  }
  
  // Check 9: TypeScript types
  const hasTypes = content.includes(': ExecutionContext') || content.includes(': ExecutionResult');
  if (!hasTypes) {
    issues.push({
      type: 'TYPES',
      severity: 'LOW',
      message: 'Node may not use proper TypeScript types'
    });
  }
  
  // Check 10: Node ID consistency
  const nodeIdMatch = content.match(/id:\s*['"]([^'"]+)['"]/);
  if (nodeIdMatch) {
    const nodeId = nodeIdMatch[1];
    const fileNameId = nodeName.replace(/-/g, '.');
    
    // Check if ID matches naming convention
    if (!nodeId.includes(nodeName.replace(/-node$/, '').replace(/-/g, '.'))) {
      issues.push({
        type: 'ID_CONSISTENCY',
        severity: 'LOW',
        message: `Node ID "${nodeId}" may not match naming convention`
      });
    }
  }
  
  // Check 11: Parameters definition
  const hasParameters = content.includes('parameters:');
  const hasInputs = content.includes('inputs:');
  const hasOutputs = content.includes('outputs:');
  
  if (!hasParameters) {
    issues.push({
      type: 'PARAMETERS',
      severity: 'MEDIUM',
      message: 'Node definition may not have parameters array'
    });
  }
  
  if (!hasInputs) {
    issues.push({
      type: 'INPUTS',
      severity: 'MEDIUM',
      message: 'Node definition may not have inputs array'
    });
  }
  
  if (!hasOutputs) {
    issues.push({
      type: 'OUTPUTS',
      severity: 'MEDIUM',
      message: 'Node definition may not have outputs array'
    });
  }
  
  // Check 12: Specific known issues
  if (content.includes('context.input.csvString') && !content.includes('context.input?.csvString')) {
    issues.push({
      type: 'CSV_INPUT',
      severity: 'HIGH',
      message: 'CSV node accesses context.input.csvString without optional chaining'
    });
  }
  
  if (content.includes('node.config') && !content.includes('node.data?.config')) {
    issues.push({
      type: 'MATH_CONFIG',
      severity: 'HIGH',
      message: 'Node accesses node.config directly - should use node.data?.config'
    });
  }
  
  if (content.includes('Unsupported transformation mode: map')) {
    issues.push({
      type: 'DATA_TRANSFORM_MODE',
      severity: 'HIGH',
      message: 'Data Transform node does not support "map" mode - only javascript, template, jsonpath, xpath'
    });
  }
  
  return {
    file: relativePath,
    category,
    nodeName,
    issues,
    lineCount: content.split('\n').length
  };
}

// Main audit function
function auditAllNodes() {
  console.log('🔍 Starting comprehensive node audit...\n');
  
  const nodeFiles = findNodeFiles(BACKEND_DIR);
  console.log(`Found ${nodeFiles.length} node files\n`);
  
  const results = [];
  let totalIssues = 0;
  
  nodeFiles.forEach(filePath => {
    const result = auditNode(filePath);
    if (result.issues.length > 0) {
      results.push(result);
      totalIssues += result.issues.length;
    }
  });
  
  // Generate report
  console.log('='.repeat(80));
  console.log('NODE AUDIT REPORT');
  console.log('='.repeat(80));
  console.log(`\nTotal Nodes Audited: ${nodeFiles.length}`);
  console.log(`Nodes with Issues: ${results.length}`);
  console.log(`Total Issues Found: ${totalIssues}\n`);
  
  // Group by severity
  const bySeverity = {
    CRITICAL: [],
    HIGH: [],
    MEDIUM: [],
    LOW: []
  };
  
  results.forEach(result => {
    result.issues.forEach(issue => {
      bySeverity[issue.severity].push({
        node: result.nodeName,
        file: result.file,
        ...issue
      });
    });
  });
  
  // Print by severity
  Object.keys(bySeverity).forEach(severity => {
    const issues = bySeverity[severity];
    if (issues.length > 0) {
      console.log(`\n${severity} ISSUES (${issues.length}):`);
      console.log('-'.repeat(80));
      issues.forEach(issue => {
        console.log(`\n  [${issue.node}] ${issue.type}`);
        console.log(`  File: ${issue.file}`);
        console.log(`  Issue: ${issue.message}`);
      });
    }
  });
  
  // Print by category
  console.log('\n\n' + '='.repeat(80));
  console.log('ISSUES BY CATEGORY');
  console.log('='.repeat(80));
  
  const byCategory = {};
  results.forEach(result => {
    if (!byCategory[result.category]) {
      byCategory[result.category] = [];
    }
    byCategory[result.category].push(result);
  });
  
  Object.keys(byCategory).sort().forEach(category => {
    const categoryResults = byCategory[category];
    const categoryIssues = categoryResults.reduce((sum, r) => sum + r.issues.length, 0);
    console.log(`\n${category.toUpperCase()} (${categoryResults.length} nodes, ${categoryIssues} issues):`);
    categoryResults.forEach(result => {
      if (result.issues.length > 0) {
        console.log(`  - ${result.nodeName}: ${result.issues.length} issues`);
        result.issues.forEach(issue => {
          console.log(`    [${issue.severity}] ${issue.type}: ${issue.message}`);
        });
      }
    });
  });
  
  // Save detailed report
  const report = {
    summary: {
      totalNodes: nodeFiles.length,
      nodesWithIssues: results.length,
      totalIssues: totalIssues,
      bySeverity: {
        CRITICAL: bySeverity.CRITICAL.length,
        HIGH: bySeverity.HIGH.length,
        MEDIUM: bySeverity.MEDIUM.length,
        LOW: bySeverity.LOW.length
      }
    },
    results: results.map(r => ({
      file: r.file,
      category: r.category,
      nodeName: r.nodeName,
      issues: r.issues
    }))
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'NODE_AUDIT_REPORT.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n\n' + '='.repeat(80));
  console.log('Detailed report saved to: NODE_AUDIT_REPORT.json');
  console.log('='.repeat(80));
  
  return report;
}

// Run audit
if (require.main === module) {
  try {
    const report = auditAllNodes();
    process.exit(report.summary.totalIssues > 0 ? 1 : 0);
  } catch (error) {
    console.error('Audit failed:', error);
    process.exit(1);
  }
}

module.exports = { auditAllNodes, auditNode };

