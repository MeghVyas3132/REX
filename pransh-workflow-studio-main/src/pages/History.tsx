import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  History as HistoryIcon, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  BarChart3,
  Calendar,
  Search,
  Plus,
  Edit,
  Trash2,
  FileText
} from 'lucide-react';
import { ApiService } from '../lib/errorService';
import { useAuth } from '../contexts/AuthContext';
import { workflowStorage, SavedWorkflow } from '../lib/workflowStorage';
import { API_CONFIG } from '../lib/config';

interface UserStats {
  totalExecutions: number;
  statusBreakdown: Record<string, number>;
  averageDuration: number;
}

export const History: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
      loadWorkflows();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadWorkflows = async () => {
    try {
      const backendUrl = API_CONFIG.baseUrl;
      
      // Try to fetch from backend first
      try {
        const response = await fetch(`${backendUrl}/api/workflows`);
        if (response.ok) {
          const data = await response.json();
          if (data?.data) {
            // Normalize and ensure nodes/edges are parsed
            const normalized = data.data.map((w: any) => workflowStorage._normalize(w));
            setWorkflows(normalized);
            // Update localStorage for offline access
            localStorage.setItem('workflow_studio_workflows', JSON.stringify(normalized));
            return;
          }
        }
      } catch (error) {
        console.warn('Backend fetch failed, using localStorage', error);
      }

      // Fallback to localStorage
      const savedWorkflows = workflowStorage.getAllWorkflows();
      setWorkflows(savedWorkflows);
    } catch (error) {
      console.error('Error loading workflows:', error);
      setWorkflows([]);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      try {
        await workflowStorage.deleteWorkflow(workflowId);
        loadWorkflows(); // Reload the list
      } catch (error) {
        console.error('Error deleting workflow:', error);
        alert('Failed to delete workflow. Please try again.');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'paused': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'draft': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workflow.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await ApiService.get<{success: boolean, data: UserStats, error?: string}>(`/api/executions/stats/user`);
      if (data?.success && data?.data) {
        setStats(data.data);
      } else if (data?.error) {
        console.error('Failed to load stats:', data.error);
        // Set default empty stats if there's an error
        setStats({
          totalExecutions: 0,
          statusBreakdown: {},
          averageDuration: 0
        });
      } else {
        // No data returned, set empty stats
        setStats({
          totalExecutions: 0,
          statusBreakdown: {},
          averageDuration: 0
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Set default empty stats on error
      setStats({
        totalExecutions: 0,
        statusBreakdown: {},
        averageDuration: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-canvas-background flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center">
          <HistoryIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">
            Please log in to view your workflow history and statistics.
          </p>
          <Link to="/login">
            <Button>Log In</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your history...</p>
        </div>
      </div>
    );
  }

  const completed = stats?.statusBreakdown?.completed || 0;
  const failed = stats?.statusBreakdown?.failed || 0;
  const running = stats?.statusBreakdown?.running || 0;
  const pending = stats?.statusBreakdown?.pending || 0;
  const successRate = stats?.totalExecutions && stats.totalExecutions > 0
    ? ((completed / stats.totalExecutions) * 100).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-canvas-background">
      {/* Header */}
      <header className="border-b border-border bg-surface-elevated">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <HistoryIcon className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">My Workflow History</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/executions">
                <Button variant="outline">
                  View All Executions
                </Button>
              </Link>
              <Link to="/studio">
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Workflow
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Welcome back, {user?.name || user?.email}!
          </h2>
          <p className="text-muted-foreground">
            Here's an overview of your workflow execution history.
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Executions */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Executions</h3>
            <p className="text-3xl font-bold text-foreground">{stats?.totalExecutions || 0}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {stats?.totalExecutions === 0 
                ? 'No workflows tested yet' 
                : 'Workflows you\'ve tested'}
            </p>
          </Card>

          {/* Success Rate */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Success Rate</h3>
            <p className="text-3xl font-bold text-foreground">{successRate}%</p>
            <p className="text-xs text-muted-foreground mt-2">
              {completed} completed successfully
            </p>
          </Card>

          {/* Average Duration */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Avg Duration</h3>
            <p className="text-3xl font-bold text-foreground">
              {stats?.averageDuration 
                ? stats.averageDuration < 1000 
                  ? `${stats.averageDuration}ms`
                  : `${(stats.averageDuration / 1000).toFixed(1)}s`
                : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Average execution time
            </p>
          </Card>

          {/* Status Breakdown */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-500" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Status Breakdown</h3>
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  {completed}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Failed</span>
                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                  {failed}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Running</span>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                  {running}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pending</span>
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                  {pending}
                </Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Empty State */}
        {stats?.totalExecutions === 0 && (
          <Card className="p-12 text-center">
            <Play className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No workflow history yet
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              You haven't tested any workflows yet. Start by creating and running a workflow to see your execution history here.
            </p>
            <Link to="/studio">
              <Button>
                <Play className="h-4 w-4 mr-2" />
                Create Your First Workflow
              </Button>
            </Link>
          </Card>
        )}

        {/* Workflows Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">All Workflows</h3>
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredWorkflows.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchTerm ? 'No workflows found' : 'No workflows yet'}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : 'Create your first workflow to get started. All workflows (executed or created) will appear here.'
                }
              </p>
              {!searchTerm && (
                <Link to="/studio">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Workflow
                  </Button>
                </Link>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorkflows.map((workflow) => (
                <Card key={workflow.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-1 truncate">
                        {workflow.name}
                      </h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {workflow.description || 'No description'}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={`${getStatusColor(workflow.status)}`}
                      >
                        {workflow.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <span>{workflow.nodes_count || workflow.nodes?.length || 0} nodes</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(workflow.updated_at).toLocaleDateString()}
                    </span>
                  </div>

                  {workflow.last_run && (
                    <div className="text-xs text-muted-foreground mb-4">
                      Last run: {new Date(workflow.last_run).toLocaleString()}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link to={`/studio?id=${workflow.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Edit className="h-3 w-3 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-1"
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

