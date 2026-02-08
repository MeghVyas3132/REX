import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from "../../utils/logger";

export interface ExecutionEvent {
  runId: string;
  workflowId: string;
  eventType: 'started' | 'node_started' | 'node_completed' | 'node_failed' | 'completed' | 'failed' | 'cancelled';
  nodeId?: string;
  data?: any;
  timestamp: number;
}

export class ExecutionMonitor {
  private static instance: ExecutionMonitor;
  private io: SocketIOServer;
  private activeExecutions: Map<string, Set<string>> = new Map(); // runId -> Set of socketIds
  private runEmitters: Map<string, any> = new Map(); // runId -> SSE emitter

  private constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST']
      }
    });

    this.setupSocketHandlers();
  }

  public static getInstance(server?: HTTPServer): ExecutionMonitor {
    if (!ExecutionMonitor.instance && server) {
      ExecutionMonitor.instance = new ExecutionMonitor(server);
    }
    return ExecutionMonitor.instance;
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info('Client connected to execution monitor', { socketId: socket.id });

      // Join execution room
      socket.on('join_execution', (runId: string) => {
        socket.join(`execution_${runId}`);
        
        // Track active connections
        if (!this.activeExecutions.has(runId)) {
          this.activeExecutions.set(runId, new Set());
        }
        this.activeExecutions.get(runId)!.add(socket.id);
        
        logger.info('Client joined execution room', { runId, socketId: socket.id });
      });

      // Leave execution room
      socket.on('leave_execution', (runId: string) => {
        socket.leave(`execution_${runId}`);
        
        const connections = this.activeExecutions.get(runId);
        if (connections) {
          connections.delete(socket.id);
          if (connections.size === 0) {
            this.activeExecutions.delete(runId);
          }
        }
        
        logger.info('Client left execution room', { runId, socketId: socket.id });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info('Client disconnected from execution monitor', { socketId: socket.id });
        
        // Clean up connections
        for (const [runId, connections] of this.activeExecutions.entries()) {
          connections.delete(socket.id);
          if (connections.size === 0) {
            this.activeExecutions.delete(runId);
          }
        }
      });
    });
  }

  public emitExecutionEvent(event: ExecutionEvent) {
    const room = `execution_${event.runId}`;
    
    logger.debug('Emitting execution event', {
      runId: event.runId,
      eventType: event.eventType,
      nodeId: event.nodeId,
      room
    });

    // Emit to Socket.IO clients
    this.io.to(room).emit('execution_event', event);

    // Emit to SSE clients
    const sseEmitter = this.runEmitters.get(event.runId);
    if (sseEmitter) {
      const sseEventType = this.mapEventTypeToSSE(event.eventType);
      sseEmitter.emit(sseEventType, {
        runId: event.runId,
        nodeId: event.nodeId,
        data: event.data,
        timestamp: event.timestamp
      });
    }
  }

  // Map internal event types to SSE event types
  private mapEventTypeToSSE(eventType: string): string {
    const mapping: Record<string, string> = {
      'started': 'workflow:start',
      'node_started': 'node:start',
      'node_completed': 'node:success',
      'node_failed': 'node:error',
      'completed': 'workflow:complete',
      'failed': 'workflow:error',
      'cancelled': 'workflow:cancelled'
    };
    return mapping[eventType] || 'execution:event';
  }

  // Register SSE emitter for a runId
  public registerSSEEmitter(runId: string, emitter: any) {
    this.runEmitters.set(runId, emitter);
  }

  // Unregister SSE emitter for a runId
  public unregisterSSEEmitter(runId: string) {
    this.runEmitters.delete(runId);
  }

  public emitWorkflowStarted(runId: string, workflowId: string, data?: any) {
    this.emitExecutionEvent({
      runId,
      workflowId,
      eventType: 'started',
      data,
      timestamp: Date.now()
    });
  }

  public emitNodeStarted(runId: string, workflowId: string, nodeId: string, data?: any) {
    this.emitExecutionEvent({
      runId,
      workflowId,
      eventType: 'node_started',
      nodeId,
      data,
      timestamp: Date.now()
    });
  }

  public emitNodeCompleted(runId: string, workflowId: string, nodeId: string, data?: any) {
    this.emitExecutionEvent({
      runId,
      workflowId,
      eventType: 'node_completed',
      nodeId,
      data,
      timestamp: Date.now()
    });
  }

  public emitNodeFailed(runId: string, workflowId: string, nodeId: string, error: string, data?: any) {
    this.emitExecutionEvent({
      runId,
      workflowId,
      eventType: 'node_failed',
      nodeId,
      data: { ...data, error },
      timestamp: Date.now()
    });
  }

  public emitWorkflowCompleted(runId: string, workflowId: string, data?: any) {
    this.emitExecutionEvent({
      runId,
      workflowId,
      eventType: 'completed',
      data,
      timestamp: Date.now()
    });
  }

  public emitWorkflowFailed(runId: string, workflowId: string, error: string, data?: any) {
    this.emitExecutionEvent({
      runId,
      workflowId,
      eventType: 'failed',
      data: { ...data, error },
      timestamp: Date.now()
    });
  }

  public emitWorkflowCancelled(runId: string, workflowId: string, data?: any) {
    this.emitExecutionEvent({
      runId,
      workflowId,
      eventType: 'cancelled',
      data,
      timestamp: Date.now()
    });
  }

  public getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  public getExecutionConnections(runId: string): number {
    return this.activeExecutions.get(runId)?.size || 0;
  }

  public broadcastSystemMessage(message: string, data?: any) {
    this.io.emit('system_message', {
      message,
      data,
      timestamp: Date.now()
    });
  }
}

export const executionMonitor = ExecutionMonitor.getInstance();
