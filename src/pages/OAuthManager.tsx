import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  AlertCircle,
  Settings,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OAuthConnection {
  provider: string;
  status: 'connected' | 'disconnected' | 'expired' | 'error';
  expiresAt?: string;
  scopes?: string[];
  lastConnected?: string;
}

interface OAuthStatus {
  connections: OAuthConnection[];
  totalConnections: number;
  activeConnections: number;
}

import { API_CONFIG } from '../lib/config';

const API_BASE = API_CONFIG.baseUrl;

export const OAuthManager: React.FC = () => {
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initiating, setInitiating] = useState<string | null>(null);
  const { toast } = useToast();

  const loadOAuthStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/oauth/status`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setOauthStatus(data?.data || data);
    } catch (error) {
      logger.error('Failed to load OAuth status:', error as Error);
      setOauthStatus({
        connections: [],
        totalConnections: 0,
        activeConnections: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const initiateOAuth = async (provider: string) => {
    try {
      setInitiating(provider);
      const response = await fetch(`${API_BASE}/api/oauth/${provider}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (data?.authUrl) {
        // Redirect to OAuth provider
        window.location.href = data.authUrl;
      } else {
        throw new Error('No auth URL received');
      }
    } catch (error: any) {
      toast({
        title: "OAuth Initiation Failed",
        description: error.message || 'Failed to initiate OAuth flow',
        variant: "destructive"
      });
    } finally {
      setInitiating(null);
    }
  };

  const revokeConnection = async (provider: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/oauth/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({ provider })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      toast({
        title: "Connection Revoked",
        description: `${provider} connection has been revoked successfully`,
      });
      
      // Refresh status
      loadOAuthStatus();
    } catch (error: any) {
      toast({
        title: "Revoke Failed",
        description: error.message || 'Failed to revoke connection',
        variant: "destructive"
      });
    }
  };

  const refreshToken = async (provider: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/oauth/${provider}/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      toast({
        title: "Token Refreshed",
        description: `${provider} token has been refreshed successfully`,
      });
      
      // Refresh status
      loadOAuthStatus();
    } catch (error: any) {
      toast({
        title: "Refresh Failed",
        description: error.message || 'Failed to refresh token',
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadOAuthStatus();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'disconnected': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'expired': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'error': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4" />;
      case 'disconnected': return <XCircle className="h-4 w-4" />;
      case 'expired': return <AlertCircle className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      default: return <XCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const supportedProviders = [
    { id: 'google', name: 'Google', description: 'Gmail, Drive, Sheets, Calendar' },
    { id: 'github', name: 'GitHub', description: 'Repositories, Issues, Actions' },
    { id: 'slack', name: 'Slack', description: 'Messages, Channels, Files' },
    { id: 'discord', name: 'Discord', description: 'Messages, Servers, Voice' },
    { id: 'microsoft', name: 'Microsoft', description: 'Outlook, OneDrive, Teams' },
    { id: 'dropbox', name: 'Dropbox', description: 'Files, Folders, Sharing' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading OAuth connections...</p>
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
              <h1 className="text-2xl font-bold text-foreground">OAuth Connections</h1>
              <Badge variant="outline" className="text-xs">
                {oauthStatus?.activeConnections || 0} active connections
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setRefreshing(true);
                  loadOAuthStatus().finally(() => setRefreshing(false));
                }}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {supportedProviders.map((provider) => {
            const connection = oauthStatus?.connections?.find(c => c.provider === provider.id);
            const status = connection?.status || 'disconnected';
            const expired = isExpired(connection?.expiresAt);
            
            return (
              <Card key={provider.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">
                      {provider.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {provider.description}
                    </p>
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(status)} flex items-center gap-1 w-fit`}
                    >
                      {getStatusIcon(status)}
                      {expired ? 'Expired' : status}
                    </Badge>
                  </div>
                </div>

                {connection && (
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    {connection.lastConnected && (
                      <div>
                        <span className="font-medium">Last connected:</span> {formatDate(connection.lastConnected)}
                      </div>
                    )}
                    {connection.expiresAt && (
                      <div>
                        <span className="font-medium">Expires:</span> {formatDate(connection.expiresAt)}
                      </div>
                    )}
                    {connection.scopes && connection.scopes.length > 0 && (
                      <div>
                        <span className="font-medium">Scopes:</span> {connection.scopes.join(', ')}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {status === 'connected' ? (
                    <>
                      {expired && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => refreshToken(provider.id)}
                          className="flex items-center gap-1"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Refresh
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => revokeConnection(provider.id)}
                        className="flex items-center gap-1 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                        Revoke
                      </Button>
                    </>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={() => initiateOAuth(provider.id)}
                      disabled={initiating === provider.id}
                      className="flex items-center gap-1"
                    >
                      {initiating === provider.id ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <ExternalLink className="h-3 w-3" />
                      )}
                      {initiating === provider.id ? 'Connecting...' : 'Connect'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Help Section */}
        <div className="mt-12">
          <Card className="p-6">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              OAuth Setup Help
            </h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                OAuth connections allow workflows to access external services securely. 
                Each connection is encrypted and stored securely on our servers.
              </p>
              <p>
                <strong>Google:</strong> Required for Gmail, Google Drive, Sheets, and Calendar integrations.
              </p>
              <p>
                <strong>GitHub:</strong> Required for repository access, issue management, and Actions.
              </p>
              <p>
                <strong>Slack/Discord:</strong> Required for sending messages and notifications.
              </p>
              <p>
                Connections expire periodically for security. You'll be notified when refresh is needed.
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};
