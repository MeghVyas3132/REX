import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiService } from '@/lib/errorService';

const MicrosoftOAuthCallback: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const err = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (err) {
      let errorMessage = `Authentication failed: ${err}`;
      
      if (err === 'access_denied') {
        errorMessage = `Access Denied: Your Microsoft account cannot access this app.\n\n` +
          `To fix this issue:\n\n` +
          `1. Go to Azure Portal (https://portal.azure.com/)\n` +
          `2. Navigate to: Azure Active Directory → App registrations\n` +
          `3. Find your app and go to "API permissions"\n` +
          `4. Ensure required permissions are granted\n` +
          `5. Try connecting again\n\n`;
      } else if (errorDescription) {
        errorMessage = `Authentication failed: ${err}\n\n${errorDescription}`;
      }
      
      setError(errorMessage);
      setLoading(false);
      return;
    }

    if (!code) {
      setError('No authorization code received from Microsoft');
      setLoading(false);
      return;
    }

    if (!state) {
      setError('No state parameter received. OAuth flow may have been interrupted.');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const callbackParams = new URLSearchParams({ code, state });
        const data = await ApiService.get<any>(`/api/auth/oauth/microsoft/callback?${callbackParams.toString()}`, { silent: true, toastTitle: 'Microsoft OAuth' });
        if (!data) {
          setError('Token exchange failed');
          setLoading(false);
          return;
        }
        if (data?.success) {
          setConnected(true);
          setLoading(false);
          
          if (window.opener) {
            try {
              window.opener.postMessage({ 
                type: 'oauth_success', 
                provider: 'microsoft',
                timestamp: Date.now()
              }, window.location.origin);
            } catch (e) {
              // Ignore if postMessage fails
            }
          }
          
          localStorage.setItem('oauth_just_connected', 'true');
          localStorage.setItem('oauth_just_connected_time', String(Date.now()));
        } else {
          setError(data?.error || 'Token exchange failed');
          setLoading(false);
          
          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'oauth_error', error: data?.error || 'Token exchange failed' }, window.location.origin);
            } catch (e) {
              // Ignore
            }
          }
        }
      } catch (e: any) {
        setError(e?.message || String(e));
        setLoading(false);
        
        if (window.opener) {
          try {
            window.opener.postMessage({ type: 'oauth_error', error: e?.message || String(e) }, window.location.origin);
          } catch (postError) {
            // Ignore
          }
        }
      }
    })();
  }, [location, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Connecting to Microsoft Teams...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas-background p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 text-center">
          <div className="text-red-500 text-4xl mb-4">❌</div>
          <h1 className="text-xl font-semibold mb-4">Connection Failed</h1>
          <p className="text-sm text-muted-foreground mb-6 whitespace-pre-line">{error}</p>
          <div className="flex gap-3 justify-center">
            <Link to="/workflow-studio" className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              Back to Workflow Studio
            </Link>
            {window.opener && (
              <button
                onClick={() => window.close()}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas-background p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 text-center">
          <div className="text-green-500 text-4xl mb-4">✅</div>
          <h1 className="text-xl font-semibold mb-4">Successfully Connected!</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your Microsoft Teams account has been connected. You can now use Microsoft Teams in your workflows.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/workflow-studio" className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              Back to Workflow Studio
            </Link>
            {window.opener && (
              <button
                onClick={() => window.close()}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MicrosoftOAuthCallback;

