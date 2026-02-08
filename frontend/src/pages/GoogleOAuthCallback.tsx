import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiService } from '@/lib/errorService';

const GoogleOAuthCallback: React.FC = () => {
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
      
      // Provide helpful guidance for access_denied error
      if (err === 'access_denied') {
        errorMessage = `Access Denied: Your Google account cannot access this app because it's in "Testing" mode.\n\n` +
          `To fix this issue:\n\n` +
          `1. Go to Google Cloud Console (https://console.cloud.google.com/)\n` +
          `2. Navigate to: APIs & Services → OAuth consent screen\n` +
          `3. Scroll down to "Test users" section\n` +
          `4. Click "+ ADD USERS"\n` +
          `5. Add your email address: ${localStorage.getItem('user_email') || 'your email'}\n` +
          `6. Click "SAVE"\n` +
          `7. Try connecting again\n\n` +
          `Alternatively, if you're the app owner, you can publish the app (requires verification) or change the app type to "Internal" if it's for your organization only.`;
      } else if (errorDescription) {
        errorMessage = `Authentication failed: ${err}\n\n${errorDescription}`;
      }
      
      setError(errorMessage);
      setLoading(false);
      return;
    }

    if (!code) {
      setError('No authorization code received from Google');
      setLoading(false);
      return;
    }

    // IMPORTANT: State parameter contains userId and is required for token storage
    if (!state) {
      setError('No state parameter received. OAuth flow may have been interrupted.');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const callbackParams = new URLSearchParams({ code, state });
        const data = await ApiService.get<any>(`/api/auth/oauth/google/callback?${callbackParams.toString()}`, { silent: true, toastTitle: 'Google OAuth' });
        if (!data) {
          setError('Token exchange failed');
          setLoading(false);
          return;
        }
        if (data?.success) {
          setConnected(true);
          setLoading(false);
          
          // If opened in a new tab/window, notify parent window about successful connection
          if (window.opener) {
            try {
              window.opener.postMessage({ 
                type: 'oauth_success', 
                provider: 'google',
                timestamp: Date.now()
              }, window.location.origin);
            } catch (e) {
              // Ignore if postMessage fails
            }
          }
          
          // Also store a flag in localStorage to trigger status check when user returns
          localStorage.setItem('oauth_just_connected', 'true');
          localStorage.setItem('oauth_just_connected_time', String(Date.now()));
          
          // Don't redirect automatically - let user manually return to workflow
          // Just show success message
        } else {
          setError(data?.error || 'Token exchange failed');
          setLoading(false);
          
          // If popup, close it after showing error
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
      }
    })();
  }, [location, navigate]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl py-8 px-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4">Processing your Google authorization...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="mb-6">
        <Link to="/" className="text-blue-500 hover:underline">&larr; Back to Workflow Studio</Link>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        {error ? (
          <>
            <h1 className="text-2xl font-bold mb-4 text-red-500">Authentication Error</h1>
            <div className="mb-4">
              {error.includes('Access Denied') || error.includes('access_denied') ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">⚠️ App in Testing Mode</h3>
                  <p className="text-sm text-yellow-700 mb-3">
                    Your Google OAuth app is currently in "Testing" mode, which means only approved test users can access it.
                  </p>
                  <div className="bg-white rounded p-3 text-sm text-gray-800 whitespace-pre-line">
                    {error}
                  </div>
                  <div className="mt-4">
                    <a 
                      href="https://console.cloud.google.com/apis/credentials/consent" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm font-medium"
                    >
                      Open Google Cloud Console →
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 whitespace-pre-line">{error}</p>
              )}
            </div>
            <div className="mt-4">
              <button
                onClick={() => window.history.back()}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Go Back
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-4 text-green-500">✅ Authentication Successful</h1>
            <p className="mb-2">Your Google account is now connected.</p>
            {connected && (
              <>
                <div className="text-sm text-gray-600 mb-4">You can now use Google nodes in your workflows.</div>
                <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800 mb-4">
                  ✅ Connection successful! You can close this tab and return to your workflow.
                </div>
                <div className="mt-4">
                  <Link 
                    to="/studio" 
                    className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Go to Workflow Studio
                  </Link>
                </div>
              </>
            )}
            {!connected && (
              <div className="mt-4">
                <Link 
                  to="/studio" 
                  className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Go to Workflow Studio
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleOAuthCallback;