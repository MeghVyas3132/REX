import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Square, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Download
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';

interface ExecutionStep {
  id: string;
  nodeId: string;
  nodeName: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  startTime?: string;
  endTime?: string;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
}

interface WorkflowExecution {
  id: string;
  status: 'running' | 'success' | 'error' | 'stopped';
  startTime: string;
  endTime?: string;
  duration?: number;
  steps: ExecutionStep[];
}

interface OutputPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  execution?: WorkflowExecution;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({ 
  isOpen, 
  onToggle, 
  execution 
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const downloadFile = (filename: string, data: string, mime: string = 'text/plain;charset=utf-8') => {
    try {
      // If data is a URL (starts with http), open it directly for download
      if (data.startsWith('http://') || data.startsWith('https://')) {
        window.open(data, '_blank');
        return;
      }
      
      // Add BOM for CSV so Excel opens UTF-8 correctly
      const needsBom = mime.startsWith('text/csv');
      const payload = needsBom ? `\uFEFF${data}` : data;
      const blob = new Blob([payload], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      logger.error('Download failed', e as Error);
      try {
        // Fallback: open in a new tab
        const blob = new Blob([data], { type: mime });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // No revoke here; user tab will clean it up on close
      } catch {}
    }
  };

  const toCsv = (table: { headers: string[]; rows: Record<string, any>[] } | undefined, fallbackText?: string) => {
    if (table && Array.isArray(table.headers) && Array.isArray(table.rows)) {
      const headers = table.headers.join(',');
      const rows = table.rows
        .map((row: Record<string, any>) => table.headers.map(h => `"${row?.[h] ?? ''}"`).join(','))
        .join('\n');
      return `${headers}\n${rows}`;
    }
    return String(fallbackText ?? '');
  };

  // Helper to check if output is a Gmail message
  const isGmailMessage = (output: any): boolean => {
    return output && typeof output === 'object' && (
      (output.messageId && output.threadId) ||
      (output.id && output.threadId && (output.from || output.subject)) ||
      (output.messageId && (output.from || output.subject))
    );
  };

  // Helper to check if output contains Gmail messages array
  const hasGmailMessages = (output: any): boolean => {
    return output && typeof output === 'object' && (
      (Array.isArray(output.messages) && output.messages.length > 0 && isGmailMessage(output.messages[0])) ||
      (Array.isArray(output) && output.length > 0 && isGmailMessage(output[0]))
    );
  };

  // Helper to clean Gmail output for display (remove raw data, large HTML)
  const cleanGmailOutput = (output: any): any => {
    if (!output || typeof output !== 'object') return output;
    
    // Handle arrays of messages
    if (Array.isArray(output)) {
      return output.map(item => cleanGmailOutput(item));
    }
    
    // Handle objects with messages array
    if (output.messages && Array.isArray(output.messages)) {
      return {
        ...output,
        messages: output.messages.map((msg: any) => cleanGmailOutput(msg))
      };
    }
    
    // Handle single Gmail message
    if (isGmailMessage(output)) {
      const cleaned: any = { ...output };
      
      // Remove raw field if it exists (contains massive payload data)
      if (cleaned.raw) {
        delete cleaned.raw;
      }
      
      // Remove HTML by default from display (it's usually massive and not needed)
      // Users can still access it in the full JSON if needed
      if (cleaned.html) {
        // Only keep a small preview if HTML exists
        if (cleaned.html.length > 200) {
          cleaned.html = cleaned.html.substring(0, 200) + '... (HTML truncated for display)';
        }
      }
      
      // Truncate body if it's too long
      if (cleaned.body && cleaned.body.length > 1000) {
        cleaned.body = cleaned.body.substring(0, 1000) + '... (truncated)';
      }
      
      return cleaned;
    }
    
    // For other Gmail outputs (labels, drafts list, etc.), just remove raw if present
    const cleaned: any = { ...output };
    if (cleaned.raw) {
      delete cleaned.raw;
    }
    if (cleaned.thread && cleaned.thread.raw) {
      delete cleaned.thread.raw;
    }
    if (cleaned.message && cleaned.message.raw) {
      delete cleaned.message.raw;
    }
    if (cleaned.draft && cleaned.draft.raw) {
      delete cleaned.draft.raw;
    }
    
    return cleaned;
  };

  const pickCsvFromExecution = (execution?: WorkflowExecution) => {
    if (!execution) return null;
    const stepsRev = [...execution.steps].reverse();
    // 1) Prefer an explicit export step with CSV
    const exportStep = stepsRev.find(s => Array.isArray(s.output?.exports) && s.output.exports.length > 0);
    if (exportStep) {
      const exportsArr = exportStep.output.exports as any[];
      const csv = exportsArr.find(e => String(e.format).toLowerCase() === 'csv');
      if (csv) return { filename: csv.filename || 'processed.csv', data: String(csv.data ?? '') };
      // If no CSV but there is some export, take the first and turn to text
      const first = exportsArr[0];
      return { filename: first.filename || 'export.txt', data: String(first.data ?? '') };
    }
    // 2) Look for a data-cleaning step with table or cleanedContent
    const cleaningStep = stepsRev.find(s => s.output && (s.output.table || s.output.cleanedContent || s.output.processedData));
    if (cleaningStep?.output) {
      const out: any = cleaningStep.output;
      const csvText = toCsv(out.table, out.processedData || out.cleanedContent || out.text);
      if (csvText && csvText.length > 0) return { filename: 'processed.csv', data: csvText };
    }
    // 3) As a last resort, if some step contains input from a trigger with file.text CSV
    for (const step of stepsRev) {
      const inp: any = step.output?.input || step.output; // some steps store pass-through as output.input
      if (inp && typeof inp === 'object') {
        // scan nested objects for file.text
        const scan = (obj: any): string | null => {
          if (!obj || typeof obj !== 'object') return null;
          if (obj.file?.text && String(obj.file.text).includes(',')) return String(obj.file.text);
          for (const key of Object.keys(obj)) {
            const found = scan(obj[key]);
            if (found) return found;
          }
          return null;
        };
        const csvFromTrigger = scan(inp);
        if (csvFromTrigger) return { filename: 'uploaded.csv', data: csvFromTrigger };
      }
    }
    return null;
  };

  const pickBestExportFromExecution = (execution?: WorkflowExecution): { filename: string; data: string; mime: string } | null => {
    if (!execution) return null;

    const stepsRev = [...execution.steps].reverse();
    const mimeFor = (ext: string) => {
      const e = ext.toLowerCase();
      if (e === 'csv') return 'text/csv;charset=utf-8';
      if (e === 'json') return 'application/json;charset=utf-8';
      if (e === 'txt') return 'text/plain;charset=utf-8';
      if (e === 'pdf') return 'application/pdf';
      if (e === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      if (e === 'png') return 'image/png';
      if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
      return 'application/octet-stream';
    };

    // First: strictly prefer plain content only if present anywhere
    for (const step of stepsRev) {
      const out: any = step.output || {};
      const text = typeof out.content === 'string' ? out.content
        : typeof out.result === 'string' ? out.result
        : typeof out.data?.text === 'string' ? out.data.text
        : (out?.choices?.[0]?.message?.content);
      if (typeof text === 'string' && text.trim().length > 0) {
        return { filename: 'content.txt', data: text, mime: 'text/plain;charset=utf-8' };
      }
    }

    // Next: file-export node output (downloadUrl/fileName)
    const fileExportStep = stepsRev.find(s => s.output && (s.output.downloadUrl || s.output.filePath || s.output.fileName));
    if (fileExportStep?.output) {
      const out = fileExportStep.output;
      const fileName = out.fileName || 'export';
      const ext = fileName.split('.').pop()?.toLowerCase() || 'txt';
      if (out.downloadUrl) {
        return { filename: fileName, data: out.downloadUrl, mime: mimeFor(ext) };
      }
    }

    // Next: explicit exports array (csv/xlsx/txt/json)
    const exportStep = stepsRev.find(s => Array.isArray(s.output?.exports) && s.output.exports.length > 0);
    if (exportStep) {
      const exportsArr = exportStep.output.exports as any[];
      const preferred = exportsArr[0];
      const ext = String(preferred.format || 'txt').toLowerCase();
      return { filename: preferred.filename || `export.${ext}`, data: String(preferred.data ?? ''), mime: mimeFor(ext) };
    }

    // If no explicit exports, try deriving a CSV from cleaning step/last output
    const csv = pickCsvFromExecution(execution);
    if (csv) return { filename: csv.filename, data: csv.data, mime: 'text/csv;charset=utf-8' };

    // Derive plain text from backend-style results (social/newsletter server runs)
    // Heuristics: prefer AI result → data.text → choices[0].message.content → JSON of last step
    const last = stepsRev[0];
    const out: any = last?.output || {};
    const textCandidate = out.result || out.data?.text || out?.choices?.[0]?.message?.content;
    if (typeof textCandidate === 'string' && textCandidate.trim().length > 0) {
      return { filename: 'content.txt', data: textCandidate, mime: 'text/plain;charset=utf-8' };
    }
    // Fallback to JSON dump if present
    if (Object.keys(out).length > 0) {
      return { filename: 'result.json', data: JSON.stringify(out, null, 2), mime: 'application/json;charset=utf-8' };
    }
    return null;
  };

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <Play className="h-4 w-4 text-blue-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-gray-400" />;
      case 'skipped': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'error': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'running': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'pending': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'stopped': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-surface-elevated border-t border-border z-50"
      data-testid="output-panel"
    >
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-foreground">Workflow Execution</h3>
          {execution && (
            <Badge variant="outline" className={getStatusColor(execution.status)}>
              {execution.status}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onToggle}>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-80">
        {!execution ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No execution data available</p>
              <p className="text-sm">Run your workflow to see results here</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="steps" className="h-full">
            <TabsList className="w-full justify-start border-b rounded-none">
              <TabsTrigger value="steps">Execution Steps</TabsTrigger>
              <TabsTrigger value="output">Final Output</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="debug">Debug</TabsTrigger>
            </TabsList>

            <TabsContent value="steps" className="h-full m-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-3">
                  {execution.steps.map((step, index) => (
                    <Card key={step.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getStatusIcon(step.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 hover:bg-transparent"
                              onClick={() => toggleStepExpansion(step.id)}
                            >
                              {expandedSteps.has(step.id) ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </Button>
                            <span className="font-medium text-sm">
                              {index + 1}. {step.nodeName}
                            </span>
                            <Badge variant="outline" className={`ml-auto ${getStatusColor(step.status)}`}>
                              {step.status}
                            </Badge>
                          </div>

                          {step.duration && (
                            <p className="text-xs text-muted-foreground mb-2">
                              Duration: {step.duration}ms
                            </p>
                          )}

                          {step.error && (
                            <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                              <p className="text-sm text-red-700">{step.error}</p>
                            </div>
                          )}

                          {expandedSteps.has(step.id) && (
                            <div className="space-y-3 mt-3">
                              {step.input && (
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-xs font-medium text-muted-foreground">Input:</h4>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-auto p-0"
                                      onClick={() => copyToClipboard(JSON.stringify(step.input, null, 2))}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <pre className="text-xs text-white bg-muted p-2 rounded overflow-auto max-h-32">
                                    {JSON.stringify(step.input, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {step.output && (
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-xs font-medium text-muted-foreground">Output:</h4>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-auto p-0"
                                      onClick={() => copyToClipboard(JSON.stringify(step.output, null, 2))}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  
                                  {/* Special handling for AI node outputs */}
                                  {step.output.result ? (
                                    <div className="space-y-2">
                                      <div className="bg-gray-800 border border-gray-700 rounded p-2">
                                        <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">
                                          {step.output.result}
                                        </p>
                                      </div>
                                      {step.output.provider && (
                                        <div className="text-xs text-white">
                                          Provider: {step.output.provider}
                                        </div>
                                      )}
                                      {step.output.model && (
                                        <div className="text-xs text-white">
                                          Model: {step.output.model}
                                        </div>
                                      )}
                                      {step.output.timestamp && (
                                        <div className="text-xs text-white">
                                          Generated: {new Date(step.output.timestamp).toLocaleTimeString()}
                                        </div>
                                      )}
                                    </div>
                                  ) : hasGmailMessages(step.output) ? (
                                    /* Special handling for Gmail messages array (getManyMessages, getThread) */
                                    <div className="space-y-3">
                                      <div className="text-xs text-gray-400 mb-2">
                                        {Array.isArray(step.output.messages) 
                                          ? `${step.output.messages.length} message(s)`
                                          : Array.isArray(step.output)
                                          ? `${step.output.length} message(s)`
                                          : 'Messages'}
                                        {step.output.count && ` (Total: ${step.output.count})`}
                                        {step.output.messageCount && ` (Total: ${step.output.messageCount})`}
                                      </div>
                                      {(Array.isArray(step.output.messages) ? step.output.messages : Array.isArray(step.output) ? step.output : []).slice(0, 3).map((msg: any, idx: number) => (
                                        <div key={idx} className="bg-gray-800 border border-gray-700 rounded p-3">
                                          <div className="space-y-2 text-sm">
                                            {msg.subject && (
                                              <div>
                                                <span className="text-gray-400">Subject:</span>{' '}
                                                <span className="text-white font-semibold">{msg.subject}</span>
                                              </div>
                                            )}
                                            {msg.from && (
                                              <div>
                                                <span className="text-gray-400">From:</span>{' '}
                                                <span className="text-white">{msg.from}</span>
                                              </div>
                                            )}
                                            {msg.snippet && (
                                              <div className="mt-2 pt-2 border-t border-gray-700">
                                                <span className="text-gray-400">Snippet:</span>
                                                <p className="text-white mt-1">{msg.snippet}</p>
                                              </div>
                                            )}
                                            {msg.messageId && (
                                              <div className="text-xs mt-2 pt-2 border-t border-gray-700">
                                                <span className="text-gray-400">Message ID:</span>{' '}
                                                <span className="text-white font-mono">{msg.messageId}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                      {((Array.isArray(step.output.messages) ? step.output.messages.length : Array.isArray(step.output) ? step.output.length : 0) > 3) && (
                                        <div className="text-xs text-gray-400">
                                          ... and {((Array.isArray(step.output.messages) ? step.output.messages.length : Array.isArray(step.output) ? step.output.length : 0) - 3)} more message(s)
                                        </div>
                                      )}
                                      <details className="text-xs">
                                        <summary className="cursor-pointer text-gray-400 hover:text-white">
                                          View full JSON output
                                        </summary>
                                        <pre className="mt-2 bg-gray-800 text-white p-2 rounded overflow-auto max-h-64">
                                          {JSON.stringify(cleanGmailOutput(step.output), null, 2)}
                                        </pre>
                                      </details>
                                    </div>
                                  ) : isGmailMessage(step.output) ? (
                                    /* Special handling for single Gmail message outputs */
                                    <div className="space-y-3">
                                      <div className="bg-gray-800 border border-gray-700 rounded p-3">
                                        <div className="space-y-2 text-sm">
                                          {step.output.subject && (
                                            <div>
                                              <span className="text-gray-400">Subject:</span>{' '}
                                              <span className="text-white font-semibold">{step.output.subject}</span>
                                            </div>
                                          )}
                                          {step.output.from && (
                                            <div>
                                              <span className="text-gray-400">From:</span>{' '}
                                              <span className="text-white">{step.output.from}</span>
                                            </div>
                                          )}
                                          {step.output.to && (
                                            <div>
                                              <span className="text-gray-400">To:</span>{' '}
                                              <span className="text-white">{step.output.to}</span>
                                            </div>
                                          )}
                                          {step.output.date && (
                                            <div>
                                              <span className="text-gray-400">Date:</span>{' '}
                                              <span className="text-white">{step.output.date}</span>
                                            </div>
                                          )}
                                          {step.output.snippet && (
                                            <div className="mt-2 pt-2 border-t border-gray-700">
                                              <span className="text-gray-400">Snippet:</span>
                                              <p className="text-white mt-1">{step.output.snippet}</p>
                                            </div>
                                          )}
                                          {step.output.text && (
                                            <div className="mt-2 pt-2 border-t border-gray-700">
                                              <span className="text-gray-400">Text:</span>
                                              <p className="text-white mt-1 whitespace-pre-wrap">{step.output.text}</p>
                                            </div>
                                          )}
                                          {step.output.messageId && (
                                            <div className="mt-2 pt-2 border-t border-gray-700 text-xs">
                                              <span className="text-gray-400">Message ID:</span>{' '}
                                              <span className="text-white font-mono">{step.output.messageId}</span>
                                            </div>
                                          )}
                                          {step.output.threadId && (
                                            <div className="text-xs">
                                              <span className="text-gray-400">Thread ID:</span>{' '}
                                              <span className="text-white font-mono">{step.output.threadId}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <details className="text-xs">
                                        <summary className="cursor-pointer text-gray-400 hover:text-white">
                                          View full JSON output
                                        </summary>
                                        <pre className="mt-2 bg-gray-800 text-white p-2 rounded overflow-auto max-h-64">
                                          {JSON.stringify(cleanGmailOutput(step.output), null, 2)}
                                        </pre>
                                      </details>
                                    </div>
                                  ) : (
                                    <pre className="text-xs bg-gray-800 text-white p-2 rounded overflow-auto max-h-32">
                                      {JSON.stringify(step.output, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="output" className="h-full m-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Final Workflow Output</h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (!execution) {
                          logger.warn('No execution data available');
                          return;
                        }
                        logger.debug('Export button clicked', { execution });
                        const file = pickBestExportFromExecution(execution);
                        logger.debug('Picked file for export', { file });
                        if (file) {
                          logger.debug('Downloading file', { filename: file.filename, size: file.data.length });
                          downloadFile(file.filename, file.data, file.mime);
                          return;
                        }
                        logger.warn('No downloadable export found in execution outputs');
                        logger.debug('Available steps', {
                          steps: execution.steps.map((s) => ({
                            nodeName: s.nodeName,
                            hasOutput: !!s.output,
                            outputKeys: s.output ? Object.keys(s.output) : [],
                            hasExports: !!s.output?.exports,
                            exportsCount: s.output?.exports?.length || 0,
                          })),
                        });
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  
                  {execution.steps.length > 0 && execution.steps[execution.steps.length - 1]?.output ? (
                    <Card className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium text-sm">Workflow Results:</h5>
                        </div>
                        
                        {/* Show Math node results if available */}
                        {execution.steps.find(step => step.output?.result !== undefined && step.output?.operation) && (
                          <div className="space-y-2">
                            <h6 className="text-sm font-medium text-green-400">🔢 Math Operation Result:</h6>
                            <div className="bg-gray-800 border border-gray-700 rounded p-3">
                              <div className="text-sm text-white space-y-1">
                                <div><strong>Result:</strong> {execution.steps.find(step => step.output?.result !== undefined && step.output?.operation)?.output?.result}</div>
                                <div><strong>Operation:</strong> {execution.steps.find(step => step.output?.result !== undefined && step.output?.operation)?.output?.operation}</div>
                                {execution.steps.find(step => step.output?.result !== undefined && step.output?.operation)?.output?.inputs && (
                                  <div><strong>Inputs:</strong> {JSON.stringify(execution.steps.find(step => step.output?.result !== undefined && step.output?.operation)?.output?.inputs)}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Show AI output if available */}
                        {execution.steps.find(step => step.output?.provider === 'OpenRouter') && (
                          <div className="space-y-2">
                            <h6 className="text-sm font-medium text-blue-400">🤖 AI Generated Content:</h6>
                            <div className="bg-gray-800 border border-gray-700 rounded p-3">
                              <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">
                                {execution.steps.find(step => step.output?.provider === 'OpenRouter')?.output?.result}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Show Google Drive results if available */}
                        {execution.steps.find(step => step.output?.action === 'google-drive-upload') && (
                          <div className="space-y-2">
                            <h6 className="text-sm font-medium text-green-400">📁 Google Drive Upload:</h6>
                            <div className="bg-gray-800 border border-gray-700 rounded p-3">
                              <div className="text-sm text-white space-y-1">
                                <div><strong>File ID:</strong> {execution.steps.find(step => step.output?.action === 'google-drive-upload')?.output?.fileId}</div>
                                <div><strong>File Name:</strong> {execution.steps.find(step => step.output?.action === 'google-drive-upload')?.output?.fileName}</div>
                                <div><strong>Status:</strong> {execution.steps.find(step => step.output?.action === 'google-drive-upload')?.output?.status}</div>
                                {execution.steps.find(step => step.output?.action === 'google-drive-upload')?.output?.webViewLink && (
                                  <div>
                                    <strong>View File:</strong> 
                                    <a 
                                      href={execution.steps.find(step => step.output?.action === 'google-drive-upload')?.output?.webViewLink} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300 underline ml-1"
                                    >
                                      Open in Drive
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          Workflow completed at: {execution.steps[execution.steps.length - 1]?.output?.timestamp || 'Unknown'}
                        </div>
                        
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
                            View Raw Output
                          </summary>
                          <pre className="mt-2 bg-gray-800 text-white p-2 rounded overflow-auto max-h-32">
                            {JSON.stringify(
                              execution.steps[execution.steps.length - 1]?.output || {},
                              null,
                              2
                            )}
                          </pre>
                        </details>
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-4">
                      <div className="text-center text-muted-foreground">
                        <p>No output available yet</p>
                        <p className="text-xs">Run the workflow to see AI-generated content and data flow</p>
                      </div>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="logs" className="h-full m-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-2 font-mono text-xs">
                  <div className="text-green-600">
                    [{execution.startTime}] Workflow execution started
                  </div>
                  {execution.steps.map((step, index) => (
                    <div key={step.id}>
                      <div className="text-blue-600">
                        [{step.startTime}] Starting step {index + 1}: {step.nodeName}
                      </div>
                      {step.endTime && (
                        <div className={step.status === 'error' ? 'text-red-600' : 'text-green-600'}>
                          [{step.endTime}] Step {index + 1} {step.status === 'error' ? 'failed' : 'completed'} 
                          {step.duration && ` in ${step.duration}ms`}
                        </div>
                      )}
                      {step.error && (
                        <div className="text-red-600">
                          Error: {step.error}
                        </div>
                      )}
                    </div>
                  ))}
                  {execution.endTime && (
                    <div className={execution.status === 'error' ? 'text-red-600' : 'text-green-600'}>
                      [{execution.endTime}] Workflow execution {execution.status}
                      {execution.duration && ` (Total: ${execution.duration}ms)`}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="debug" className="h-full m-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Debug Information</h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        logger.debug('Workflow Execution Debug Info', { execution });
                        logger.debug('Raw Executions', { steps: execution?.steps });
                      }}
                    >
                      Log to Console
                    </Button>
                  </div>
                  
                  <Card className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium text-sm mb-2">Execution Summary</h5>
                        <div className="text-xs space-y-1">
                          <div>Total Steps: {execution?.steps?.length || 0}</div>
                          <div>Status: {execution?.status || 'Unknown'}</div>
                          <div>Duration: {execution?.duration || 'Unknown'}ms</div>
                          <div>Start Time: {execution?.startTime || 'Unknown'}</div>
                          <div>End Time: {execution?.endTime || 'Unknown'}</div>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-sm mb-2">Step Details</h5>
                        <div className="space-y-2">
                          {execution?.steps?.map((step, index) => (
                            <div key={step.id} className="text-xs border rounded p-2">
                              <div className="font-medium">Step {index + 1}: {step.nodeName}</div>
                              <div>Status: {step.status}</div>
                              <div>Duration: {step.duration || 'Unknown'}ms</div>
                              {step.error && (
                                <div className="text-red-600">Error: {step.error}</div>
                              )}
                              {step.output && (
                                <div>
                                  <div>Has Output: Yes</div>
                                  <div>Output Keys: {Object.keys(step.output).join(', ')}</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-sm">Raw Data</h5>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 hover:bg-muted"
                            onClick={() => {
                              const rawData = JSON.stringify(execution, null, 2);
                              copyToClipboard(rawData);
                              toast({
                                title: "Copied!",
                                description: "Raw execution data copied to clipboard",
                              });
                            }}
                            title="Copy raw data"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            View Raw Execution Data
                          </summary>
                          <pre className="mt-2 text-white bg-muted p-2 rounded overflow-auto max-h-32">
                            {JSON.stringify(execution, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};