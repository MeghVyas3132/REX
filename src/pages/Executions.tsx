import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Play, 
  Search, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Filter,
  Download,
  Eye
} from 'lucide-react';

interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowName?: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled';
  input: any;
  output?: any;
  error?: string;
  nodeResults?: Record<string, any>;
  executionOrder?: string[];
  nodeOutputs?: Record<string, any>;
  runOptions?: any;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  userId?: string;
  createdAt: string;
}

interface ExecutionFilters {
  workflowId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

import { API_CONFIG } from '../lib/config';
import { ApiService } from '../lib/errorService';
import { useAuth } from '../contexts/AuthContext';

// Simple logger for error handling
const logger = {
  error: (message: string, error?: Error) => {
    console.error(message, error);
  }
};

const API_BASE = API_CONFIG.baseUrl;

export const Executions: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [executions, setExecutions] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [workflowFilter, setWorkflowFilter] = useState<string>('all');
  const [workflows, setWorkflows] = useState<Array<{id: string, name: string}>>([]);

  const loadExecutions = async () => {
    try {
      setLoading(true);
      const filters: ExecutionFilters = {
        limit: 100,
        offset: 0
      };

      if (workflowFilter !== 'all') {
        filters.workflowId = workflowFilter;
      }

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });

      // Use ApiService which automatically includes auth token
      // Backend will automatically filter by authenticated user
      const data = await ApiService.get<{success: boolean, data: WorkflowRun[]}>(`/api/executions?${queryParams}`);
      setExecutions(data?.data || []);
    } catch (error) {
      logger.error('Failed to load executions:', error as Error);
      setExecutions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflows = async () => {
    try {
      const data = await ApiService.get<{success: boolean, data: Array<{id: string, name: string}>}>(`/api/workflows`);
      if (data?.data) {
        const workflowList = Array.isArray(data.data) ? data.data : [];
        setWorkflows(workflowList.map((w: any) => ({ id: w.id, name: w.name })));
      }
    } catch (error) {
      logger.error('Failed to load workflows:', error as Error);
    }
  };

  useEffect(() => {
    loadWorkflows();
    loadExecutions();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadExecutions().finally(() => {
      setRefreshing(false);
    });
  };

  const filteredExecutions = executions.filter(execution => {
    const matchesSearch = !searchTerm || 
      execution.workflowName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      execution.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || execution.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'error': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'running': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'cancelled': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      case 'running': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${(duration / 60000).toFixed(1)}m`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading executions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-background">
      {/* Header */}
      <header className="border-b border-border bg-surface-elevated">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-foreground">Executions</h1>
              <Badge variant="outline" className="text-xs">
                {filteredExecutions.length} executions
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search executions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Workflow Filter */}
            <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by workflow" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workflows</SelectItem>
                {workflows.map(workflow => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Executions List */}
        {filteredExecutions.length === 0 ? (
          <div className="text-center py-12">
            <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchTerm || statusFilter !== 'all' || workflowFilter !== 'all' 
                ? 'No executions found' 
                : 'No executions yet'
              }
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || statusFilter !== 'all' || workflowFilter !== 'all'
                ? 'Try adjusting your filters' 
                : 'Run a workflow to see execution history'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && workflowFilter === 'all' && (
              <Link to="/studio">
                <Button>
                  <Play className="h-4 w-4 mr-2" />
                  Create Workflow
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExecutions.map((execution) => (
              <Card key={execution.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground">
                        {execution.workflowName || `Workflow ${execution.workflowId}`}
                      </h3>
                      <Badge 
                        variant="outline" 
                        className={`${getStatusColor(execution.status)} flex items-center gap-1`}
                      >
                        {getStatusIcon(execution.status)}
                        {execution.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Execution ID: {execution.id}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Started: {formatDate(execution.startedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Duration: {formatDuration(execution.duration)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Created: {formatDate(execution.createdAt)}</span>
                  </div>
                </div>

                {execution.error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                    <p className="text-sm text-red-500 font-medium">Error:</p>
                    <p className="text-sm text-red-500">{execution.error}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Link to={`/studio?id=${execution.workflowId}`}>
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      View Workflow
                    </Button>
                  </Link>
                  {execution.output && (
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      Download Output
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
