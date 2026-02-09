import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
import { logger } from '../../lib/logger.js';
import * as fs from 'fs';
import * as pathModule from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

// File watcher using native fs.watch or chokidar
let chokidar: any;
try {
  chokidar = require('chokidar');
} catch (e) {
  logger.warn('chokidar not installed, using native fs.watch');
}

// Map to store active watchers
const activeWatchers = new Map<string, any>();

export class FileTriggerNode {
  getNodeDefinition() {
    return {
      id: 'file-trigger',
      type: 'trigger',
      name: 'File Trigger',
      description: 'Trigger workflow when files are created, modified, or deleted in a directory',
      category: 'trigger',
      version: '1.0.0',
      author: 'Workflow Studio',
      
      parameters: [
        {
          name: 'watchPath',
          type: 'string',
          displayName: 'Watch Path',
          description: 'Directory or file path to watch for changes',
          required: true,
          placeholder: '/path/to/watch or /path/to/file.txt'
        },
        {
          name: 'events',
          type: 'options',
          displayName: 'Watch Events',
          description: 'File system events to watch for',
          required: false,
          default: ['add', 'change'],
          multiple: true,
          options: [
            { name: 'File Added', value: 'add' },
            { name: 'File Changed', value: 'change' },
            { name: 'File Deleted', value: 'unlink' },
            { name: 'File Renamed', value: 'rename' }
          ]
        },
        {
          name: 'recursive',
          type: 'boolean',
          displayName: 'Recursive',
          description: 'Watch subdirectories recursively',
          required: false,
          default: true
        },
        {
          name: 'extensions',
          type: 'array',
          displayName: 'File Extensions',
          description: 'File extensions to filter (leave empty for all files). Example: [".txt", ".json", ".csv"]',
          required: false,
          placeholder: '.txt, .json, .csv'
        },
        {
          name: 'ignorePatterns',
          type: 'array',
          displayName: 'Ignore Patterns',
          description: 'Patterns to ignore (supports glob patterns). Example: ["*.tmp", ".git/*", "node_modules/*"]',
          required: false,
          placeholder: '*.tmp, .git/*, node_modules/*'
        },
        {
          name: 'pollInterval',
          type: 'number',
          displayName: 'Poll Interval (ms)',
          description: 'Polling interval in milliseconds (for native fs.watch fallback)',
          required: false,
          default: 1000,
          min: 100,
          max: 60000
        },
        {
          name: 'debounceMs',
          type: 'number',
          displayName: 'Debounce (ms)',
          description: 'Delay before triggering (prevents multiple triggers)',
          required: false,
          default: 1000,
          min: 0,
          max: 10000
        },
        {
          name: 'readContent',
          type: 'boolean',
          displayName: 'Read File Content',
          description: 'Read and include file content in output',
          required: false,
          default: true
        },
        {
          name: 'maxFileSize',
          type: 'number',
          displayName: 'Max File Size (bytes)',
          description: 'Maximum file size to read content (0 = unlimited)',
          required: false,
          default: 10485760, // 10MB
          min: 0
        }
      ],
      inputs: [
        {
          name: 'watchPath',
          type: 'string',
          displayName: 'Watch Path',
          description: 'Directory or file path from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'events',
          type: 'array',
          displayName: 'Events',
          description: 'File system events from previous node',
          required: false,
          dataType: 'array'
        }
      ],
      outputs: [
        {
          name: 'filePath',
          type: 'string',
          displayName: 'File Path',
          description: 'Full path of the file that triggered the event',
          dataType: 'text'
        },
        {
          name: 'fileName',
          type: 'string',
          displayName: 'File Name',
          description: 'Name of the file (without path)',
          dataType: 'text'
        },
        {
          name: 'fileExtension',
          type: 'string',
          displayName: 'File Extension',
          description: 'Extension of the file',
          dataType: 'text'
        },
        {
          name: 'event',
          type: 'string',
          displayName: 'Event Type',
          description: 'Type of file system event (add, change, unlink, rename)',
          dataType: 'text'
        },
        {
          name: 'fileSize',
          type: 'number',
          displayName: 'File Size',
          description: 'Size of the file in bytes',
          dataType: 'number'
        },
        {
          name: 'modifiedTime',
          type: 'string',
          displayName: 'Modified Time',
          description: 'ISO timestamp of file modification',
          dataType: 'text'
        },
        {
          name: 'content',
          type: 'string',
          displayName: 'File Content',
          description: 'Content of the file (if readContent is true and file is text)',
          dataType: 'text'
        },
        {
          name: 'stats',
          type: 'object',
          displayName: 'File Stats',
          description: 'File system stats (size, mtime, etc.)',
          dataType: 'object'
        },
        {
          name: 'triggerTime',
          type: 'string',
          displayName: 'Trigger Time',
          description: 'ISO timestamp when the file event occurred',
          dataType: 'text'
        }
      ],

      configSchema: {
        type: 'object',
        properties: {
          watchPath: { type: 'string' },
          events: { type: 'array', items: { type: 'string' } },
          recursive: { type: 'boolean' },
          extensions: { type: 'array', items: { type: 'string' } },
          ignorePatterns: { type: 'array', items: { type: 'string' } },
          pollInterval: { type: 'number' },
          debounceMs: { type: 'number' },
          readContent: { type: 'boolean' },
          maxFileSize: { type: 'number' }
        },
        required: ['watchPath']
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.watchPath && !context.input?.watchPath) {
      throw new Error('Required parameter "watchPath" is missing');
    }

    const startTime = Date.now();
    
    try {
      const watchPath = config.watchPath || context.input?.filePath;
      const events = config.events || ['add', 'change'];
      const recursive = config.recursive !== false;
      const extensions = config.extensions || [];
      const ignorePatterns = config.ignorePatterns || [];
      const readContent = config.readContent !== false;
      const maxFileSize = config.maxFileSize || 10485760; // 10MB default
      const debounceMs = config.debounceMs || 1000;

      if (!watchPath) {
        throw new Error('Watch path is required for file trigger');
      }

      // Check if path exists
      let fileStats: fs.Stats;
      try {
        fileStats = await stat(watchPath);
      } catch (error: any) {
        throw new Error(`Watch path does not exist: ${watchPath}`);
      }

      // Get file information
      const filePath = fileStats.isFile() ? watchPath : pathModule.join(watchPath, '*');
      const fileName = pathModule.basename(watchPath);
      const fileExtension = pathModule.extname(watchPath);

      logger.info('File trigger executed', {
        nodeId: node.id,
        watchPath,
        isFile: fileStats.isFile(),
        isDirectory: fileStats.isDirectory(),
        events,
        recursive,
        runId: context.runId
      });

      // Read file content if it's a file and readContent is true
      let content: string | undefined;
      if (fileStats.isFile() && readContent) {
        // Check extension for text files
        const textExtensions = ['.txt', '.json', '.csv', '.md', '.html', '.xml', '.yaml', '.yml', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.sql', '.sh', '.bash', '.zsh', '.ps1', '.bat', '.log'];
        
        // Check if file is text-based
        const isTextFile = textExtensions.includes(fileExtension.toLowerCase()) || 
                          extensions.length === 0 || 
                          extensions.some(ext => fileExtension.toLowerCase() === ext.toLowerCase());

        if (isTextFile && fileStats.size <= maxFileSize) {
          try {
            const fileContent = await readFile(watchPath, 'utf-8');
            content = fileContent;
          } catch (error: any) {
            logger.warn('Failed to read file content', {
              nodeId: node.id,
              filePath: watchPath,
              error: error.message
            });
            content = undefined;
          }
        } else if (fileStats.size > maxFileSize) {
          logger.info('File too large to read content', {
            nodeId: node.id,
            filePath: watchPath,
            size: fileStats.size,
            maxSize: maxFileSize
          });
        }
      }

      // Build output with real file stats
      const output = {
        filePath,
        fileName,
        fileExtension,
        event: context.input?.event || 'change',
        fileSize: fileStats.size,
        modifiedTime: fileStats.mtime.toISOString(),
        content,
        stats: {
          size: fileStats.size,
          mtime: fileStats.mtime.toISOString(),
          ctime: fileStats.ctime.toISOString(),
          isFile: fileStats.isFile(),
          isDirectory: fileStats.isDirectory(),
          mode: fileStats.mode,
          uid: fileStats.uid,
          gid: fileStats.gid
        },
        triggerTime: new Date().toISOString()
      };

      return {
        success: true,
        output,
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('File trigger failed', error, {
        nodeId: node.id,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  // Start watching a path (called by trigger system)
  async startWatching(workflowId: string, node: WorkflowNode, onEvent: (event: any) => void): Promise<void> {
    const config = node.data?.config || {};
    const watchPath = config.watchPath;
    const events = config.events || ['add', 'change'];
    const recursive = config.recursive !== false;
    const extensions = config.extensions || [];
    const ignorePatterns = config.ignorePatterns || [];
    const pollInterval = config.pollInterval || 1000;
    const debounceMs = config.debounceMs || 1000;

    if (!watchPath) {
      throw new Error('Watch path is required');
    }

    const watcherKey = `${workflowId}-${node.id}`;

    // Stop existing watcher if any
    if (activeWatchers.has(watcherKey)) {
      await this.stopWatching(workflowId, node.id);
    }

    // Use chokidar if available, otherwise fall back to native fs.watch
    if (chokidar) {
      const watcher = chokidar.watch(watchPath, {
        ignored: ignorePatterns.length > 0 ? ignorePatterns : undefined,
        persistent: true,
        ignoreInitial: true,
        followSymlinks: false,
        depth: recursive ? undefined : 0
      });

      // Debounce map
      const debounceMap = new Map<string, NodeJS.Timeout>();

      watcher.on('add', (filePath: string) => {
        if (events.includes('add') && this.matchesExtension(filePath, extensions)) {
          this.debounceTrigger(debounceMap, filePath, () => {
            onEvent({
              filePath,
              event: 'add',
              nodeId: node.id,
              workflowId
            });
          }, debounceMs);
        }
      });

      watcher.on('change', (filePath: string) => {
        if (events.includes('change') && this.matchesExtension(filePath, extensions)) {
          this.debounceTrigger(debounceMap, filePath, () => {
            onEvent({
              filePath,
              event: 'change',
              nodeId: node.id,
              workflowId
            });
          }, debounceMs);
        }
      });

      watcher.on('unlink', (filePath: string) => {
        if (events.includes('unlink') && this.matchesExtension(filePath, extensions)) {
          this.debounceTrigger(debounceMap, filePath, () => {
            onEvent({
              filePath,
              event: 'unlink',
              nodeId: node.id,
              workflowId
            });
          }, debounceMs);
        }
      });

      watcher.on('error', (error: Error) => {
        logger.error('File watcher error', error, {
          nodeId: node.id,
          workflowId,
          watchPath
        });
      });

      activeWatchers.set(watcherKey, watcher);
      logger.info('File watcher started', {
        nodeId: node.id,
        workflowId,
        watchPath,
        events,
        recursive
      });

    } else {
      // Fallback to native fs.watch with polling
      logger.warn('Using native fs.watch (chokidar recommended for better performance)');
      
      const debounceMap = new Map<string, NodeJS.Timeout>();
      const watcher = fs.watch(watchPath, { recursive }, async (eventType, filename) => {
        if (!filename) return;

        const filePath = pathModule.join(watchPath, filename);
        
        if (this.matchesExtension(filePath, extensions)) {
          const debounceKey = filePath;
          const existingTimeout = debounceMap.get(debounceKey);
          
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          const timeout = setTimeout(async () => {
            try {
              const fileStats = await stat(filePath).catch(() => null);
              const event = eventType === 'rename' ? (fileStats ? 'add' : 'unlink') : 'change';
              
              onEvent({
                filePath,
                event,
                nodeId: node.id,
                workflowId
              });
            } catch (error: any) {
              logger.error('Error handling file event', error, { workflowId, nodeId: node.id, filePath });
            }
            debounceMap.delete(debounceKey);
          }, debounceMs);

          debounceMap.set(debounceKey, timeout);
        }
      });

      activeWatchers.set(watcherKey, { watcher, debounceMap });
    }
  }

  async stopWatching(workflowId: string, nodeId: string): Promise<void> {
    const watcherKey = `${workflowId}-${nodeId}`;
    const watcher = activeWatchers.get(watcherKey);

    if (watcher) {
      if (chokidar && watcher.close) {
        await watcher.close();
      } else if (watcher.watcher && watcher.watcher.close) {
        watcher.watcher.close();
      }
      activeWatchers.delete(watcherKey);
      logger.info('File watcher stopped', { workflowId, nodeId });
    }
  }

  private matchesExtension(filePath: string, extensions: string[]): boolean {
    if (extensions.length === 0) return true;
    const ext = pathModule.extname(filePath).toLowerCase();
    return extensions.some(e => e.toLowerCase() === ext || `.${e.toLowerCase()}` === ext);
  }

  private debounceTrigger(map: Map<string, NodeJS.Timeout>, key: string, callback: () => void, delay: number): void {
    const existing = map.get(key);
    if (existing) {
      clearTimeout(existing);
    }
    const timeout = setTimeout(() => {
      callback();
      map.delete(key);
    }, delay);
    map.set(key, timeout);
  }}


export default FileTriggerNode;

