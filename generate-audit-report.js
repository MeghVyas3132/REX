const fs = require('fs');
const path = require('path');

// Find the latest audit report
const files = fs.readdirSync('.').filter(f => f.startsWith('NODE_AUDIT_REPORT_NEW_') && f.endsWith('.json')).sort().reverse();
const latestReport = files[0];

if (!latestReport) {
  console.error('No audit report found');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(latestReport, 'utf8'));

// Generate markdown report
let markdown = `# Node Audit Report - ${new Date().toISOString()}\n\n`;
markdown += `## Summary\n\n`;
markdown += `- **Total Nodes Audited:** ${data.summary.totalNodes}\n`;
markdown += `- **Total Issues Found:** ${data.summary.totalIssues}\n\n`;

markdown += `### By Severity\n\n`;
Object.entries(data.summary.bySeverity || {}).forEach(([severity, count]) => {
  markdown += `- **${severity}:** ${count}\n`;
});

markdown += `\n### By Category\n\n`;
Object.entries(data.summary.byCategory || {}).forEach(([category, count]) => {
  markdown += `- **${category}:** ${count}\n`;
});

markdown += `\n## Issues by Severity\n\n`;

// Group issues by severity
const issuesBySeverity = {};
data.issues.forEach(issue => {
  if (!issuesBySeverity[issue.severity]) {
    issuesBySeverity[issue.severity] = [];
  }
  issuesBySeverity[issue.severity].push(issue);
});

// Output issues by severity
['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
  if (issuesBySeverity[severity] && issuesBySeverity[severity].length > 0) {
    markdown += `### ${severity} Issues (${issuesBySeverity[severity].length})\n\n`;
    
    issuesBySeverity[severity].forEach((issue, idx) => {
      markdown += `${idx + 1}. **${issue.file}**\n`;
      markdown += `   - **Type:** ${issue.type}\n`;
      markdown += `   - **Description:** ${issue.description}\n`;
      if (issue.line) {
        markdown += `   - **Line:** ${issue.line}\n`;
      }
      if (issue.code) {
        markdown += `   - **Code:** \`${issue.code.substring(0, 100)}...\`\n`;
      }
      markdown += `\n`;
    });
  }
});

// Save markdown report
const markdownFile = latestReport.replace('.json', '.md');
fs.writeFileSync(markdownFile, markdown);
console.log(`Markdown report saved to: ${markdownFile}`);

// Also save a summary
const summaryFile = latestReport.replace('.json', '_SUMMARY.txt');
let summary = `NODE AUDIT SUMMARY - ${new Date().toISOString()}\n`;
summary += `==========================================\n\n`;
summary += `Total Nodes: ${data.summary.totalNodes}\n`;
summary += `Total Issues: ${data.summary.totalIssues}\n\n`;
summary += `By Severity:\n`;
Object.entries(data.summary.bySeverity || {}).forEach(([severity, count]) => {
  summary += `  ${severity}: ${count}\n`;
});
summary += `\nBy Category:\n`;
Object.entries(data.summary.byCategory || {}).forEach(([category, count]) => {
  summary += `  ${category}: ${count}\n`;
});
fs.writeFileSync(summaryFile, summary);
console.log(`Summary saved to: ${summaryFile}`);

