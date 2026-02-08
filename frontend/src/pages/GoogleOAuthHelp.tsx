import React from 'react';
import { Link } from 'react-router-dom';

const GoogleOAuthHelp: React.FC = () => {
  // The redirect URI that should be used in Google Cloud Console
  const redirectUri = window.location.origin + '/google-oauth-callback';

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="mb-6">
        <Link to="/" className="text-blue-500 hover:underline">&larr; Back to Workflow Studio</Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-6">Google OAuth Setup Guide</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Redirect URI</h2>
        <div className="bg-gray-100 p-4 rounded-md mb-4">
          <code className="text-sm break-all">{redirectUri}</code>
        </div>
        <p className="text-sm text-gray-600 mb-2">
          Copy this URL and add it to your Google Cloud Console project under:
        </p>
        <p className="text-sm text-gray-600 mb-4">
          <strong>APIs & Services</strong> &rarr; <strong>Credentials</strong> &rarr; <strong>OAuth 2.0 Client IDs</strong> &rarr; <strong>Authorized redirect URIs</strong>
        </p>
        <a 
          href="https://console.cloud.google.com/apis/credentials" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline text-sm"
        >
          Open Google Cloud Console
        </a>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>
        
        <ol className="list-decimal list-inside space-y-4 text-sm text-gray-700">
          <li>
            <strong>Create a Google Cloud Project</strong>
            <p className="ml-6 mt-1">If you don't have one already, create a new project in Google Cloud Console.</p>
          </li>
          
          <li>
            <strong>Enable the Google Drive API</strong>
            <p className="ml-6 mt-1">Go to <strong>APIs & Services</strong> &rarr; <strong>Library</strong>, search for "Google Drive API" and enable it.</p>
          </li>
          
          <li>
            <strong>Create OAuth Credentials</strong>
            <p className="ml-6 mt-1">Go to <strong>APIs & Services</strong> &rarr; <strong>Credentials</strong> &rarr; <strong>Create Credentials</strong> &rarr; <strong>OAuth client ID</strong></p>
            <ul className="list-disc list-inside ml-6 mt-1">
              <li>Application type: Web application</li>
              <li>Name: Workflow Studio (or your preferred name)</li>
              <li>Authorized JavaScript origins: <code>{window.location.origin}</code></li>
              <li>Authorized redirect URIs: <code>{redirectUri}</code></li>
            </ul>
          </li>
          
          <li>
            <strong>Get Your Client ID and Secret</strong>
            <p className="ml-6 mt-1">After creating the OAuth client, you'll receive a Client ID and Client Secret. Copy these values to use in Workflow Studio.</p>
          </li>
          
          <li>
            <strong>Configure OAuth Consent Screen</strong>
            <p className="ml-6 mt-1">Go to <strong>APIs & Services</strong> &rarr; <strong>OAuth consent screen</strong> and configure the required information.</p>
            <ul className="list-disc list-inside ml-6 mt-1">
              <li>User Type: External (or Internal if using Google Workspace)</li>
              <li>App name: Workflow Studio (or your preferred name)</li>
              <li>User support email: Your email</li>
              <li>Developer contact information: Your email</li>
              <li>Authorized domains: Add your domain if applicable</li>
            </ul>
          </li>
        </ol>
      </div>
    </div>
  );
};

export default GoogleOAuthHelp;