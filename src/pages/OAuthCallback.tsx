import React, { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthService } from '@/lib/authService';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          setStatus('error');
          setMessage(errorDescription || error);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received');
          return;
        }

        // Get provider from state or localStorage
        const provider = state || localStorage.getItem('oauth_provider') || 'unknown';
        const config = JSON.parse(localStorage.getItem('oauth_config') || '{}');

        // Exchange code for token
        const tokenResponse = await AuthService.exchangeCodeForToken(provider, code, config);

        // Store credentials
        const credentialId = await AuthService.storeCredentials({
          type: 'oauth2',
          name: `${provider} OAuth`,
          provider,
          credentials: {
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            expires_at: tokenResponse.expires_in 
              ? Date.now() + (tokenResponse.expires_in * 1000)
              : undefined,
            scope: tokenResponse.scope,
          },
        });

        setStatus('success');
        setMessage(`Successfully connected to ${provider}`);
        
        // Clean up temporary data
        localStorage.removeItem('oauth_provider');
        localStorage.removeItem('oauth_config');

        // Redirect back to workflow studio
        setTimeout(() => {
          navigate('/workflow-studio');
        }, 2000);

      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'OAuth callback failed');
        logger.error('OAuth callback error:', error as Error);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate]);

  const handleRetry = () => {
    navigate('/workflow-studio');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
            OAuth Authentication
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Processing your authentication...'}
            {status === 'success' && 'Authentication successful!'}
            {status === 'error' && 'Authentication failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'loading' && (
            <div className="space-y-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mt-2"></div>
              </div>
              <p className="text-sm text-gray-600">Please wait while we complete the authentication...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="text-green-600">
                <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                <p className="font-medium">Connected Successfully!</p>
              </div>
              <p className="text-sm text-gray-600">{message}</p>
              <p className="text-xs text-gray-500">Redirecting you back to the workflow studio...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="text-red-600">
                <XCircle className="h-12 w-12 mx-auto mb-2" />
                <p className="font-medium">Authentication Failed</p>
              </div>
              <p className="text-sm text-gray-600">{message}</p>
              <Button onClick={handleRetry} className="w-full">
                Return to Workflow Studio
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
