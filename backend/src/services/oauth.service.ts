import { prisma } from '../db/prisma';
import { encryptionService } from '../utils/encryption';
const logger = require('../utils/logger');

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scope: string[];
  provider: string;
  userId: string;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface MicrosoftOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tenantId?: string;
  scopes: string[];
}

export class OAuthService {
  private googleConfig: GoogleOAuthConfig;
  private microsoftConfig: MicrosoftOAuthConfig;

  constructor() {
    this.googleConfig = {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3003'}/api/auth/oauth/google/callback`,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file', // Required for file uploads
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send', // Required for sending emails
        'https://mail.google.com/', // Required by nodemailer for Gmail OAuth2
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/analytics.readonly', // Google Analytics read access
        'https://www.googleapis.com/auth/analytics', // Google Analytics full access
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ]
    };
    
    this.microsoftConfig = {
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
      redirectUri: process.env.MICROSOFT_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3003'}/api/auth/oauth/microsoft/callback`,
      scopes: [
        'https://graph.microsoft.com/User.Read',
        'https://graph.microsoft.com/Team.ReadBasic.All',
        'https://graph.microsoft.com/Channel.ReadBasic.All',
        'https://graph.microsoft.com/Chat.ReadWrite',
        'https://graph.microsoft.com/ChannelMessage.Send',
        'https://graph.microsoft.com/TeamMember.ReadWrite.All'
      ]
    };
  }

  // Generate Google OAuth URL
  generateGoogleAuthUrl(userId: string, state?: string): string {
    if (!this.googleConfig.clientId) {
      throw new Error('Google OAuth not configured. Please set GOOGLE_CLIENT_ID environment variable.');
    }

    const params = new URLSearchParams({
      client_id: this.googleConfig.clientId,
      redirect_uri: this.googleConfig.redirectUri,
      response_type: 'code',
      scope: this.googleConfig.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: state || `user_${userId}_${Date.now()}`
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // Handle Google OAuth callback
  async handleGoogleCallback(code: string, state: string): Promise<OAuthToken> {
    if (!this.googleConfig.clientId || !this.googleConfig.clientSecret) {
      throw new Error('Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
    }

    try {
      // Exchange authorization code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: this.googleConfig.clientId,
          client_secret: this.googleConfig.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.googleConfig.redirectUri
        })
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        throw new Error(`Google OAuth error: ${error.error_description || error.error}`);
      }

      const tokenData = await tokenResponse.json();
      
      // Get user info
      const userInfo = await this.getGoogleUserInfo(tokenData.access_token);
      
      // Extract user ID from state parameter (must match authenticated user's ID)
      // State format: user_${userId}_${timestamp}
      const rawExtractedUserId = this.extractUserIdFromState(state);
      
      if (!rawExtractedUserId) {
        logger.error('Failed to extract userId from OAuth state', { 
          state,
          stateLength: state?.length 
        });
        throw new Error('Invalid OAuth state: userId not found. Please ensure you are authenticated and initiated OAuth from the workflow platform.');
      }
      
      // Normalize userId (trim, ensure string)
      const userId = String(rawExtractedUserId).trim();
      
      logger.info('✅ OAuth State Extraction', {
        step: '1. OAuth State Extraction',
        rawState: state,
        rawExtractedUserId,
        normalizedUserId: userId,
        userIdType: typeof userId,
        userIdLength: userId?.length,
        note: 'This userId will be stored in database'
      });

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      const oauthToken: OAuthToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        scope: tokenData.scope ? tokenData.scope.split(' ') : this.googleConfig.scopes,
        provider: 'google',
        userId
      };
      
      logger.info('OAuth callback - extracted userId', {
        userId,
        state,
        provider: 'google'
      });

      // Store tokens securely
      logger.info('Storing OAuth tokens', {
        userId,
        provider: 'google',
        userIdType: typeof userId,
        userIdLength: userId?.length,
        expiresAt: oauthToken.expiresAt
      });
      
      await this.storeTokens(oauthToken);

      logger.info('Google OAuth tokens stored successfully', {
        userId,
        provider: 'google',
        expiresAt: oauthToken.expiresAt,
        hasAccessToken: !!oauthToken.accessToken,
        hasRefreshToken: !!oauthToken.refreshToken
      });

      return oauthToken;

    } catch (error: any) {
      logger.error('Google OAuth callback failed', error);
      throw error;
    }
  }

  // Refresh Google access token
  async refreshGoogleToken(userId: string): Promise<OAuthToken> {
    if (!this.googleConfig.clientId || !this.googleConfig.clientSecret) {
      throw new Error('Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
    }

    try {
      const storedToken = await this.getStoredTokens(userId, 'google');
      
      if (!storedToken || !storedToken.refreshToken) {
        throw new Error('No refresh token available for user');
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: this.googleConfig.clientId,
          client_secret: this.googleConfig.clientSecret,
          refresh_token: storedToken.refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
      }

      const tokenData = await response.json();
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      const refreshedToken: OAuthToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || storedToken.refreshToken,
        expiresAt,
        scope: storedToken.scope,
        provider: 'google',
        userId
      };

      // Update stored tokens
      await this.storeTokens(refreshedToken);

      logger.info('Google token refreshed', {
        userId,
        provider: 'google',
        expiresAt: refreshedToken.expiresAt
      });

      return refreshedToken;

    } catch (error: any) {
      logger.error('Google token refresh failed', error);
      throw error;
    }
  }

  // Generate Microsoft OAuth URL
  generateMicrosoftAuthUrl(userId: string, state?: string): string {
    if (!this.microsoftConfig.clientId) {
      throw new Error('Microsoft OAuth not configured. Please set MICROSOFT_CLIENT_ID environment variable.');
    }

    const tenant = this.microsoftConfig.tenantId || 'common';
    const params = new URLSearchParams({
      client_id: this.microsoftConfig.clientId,
      redirect_uri: this.microsoftConfig.redirectUri,
      response_type: 'code',
      scope: this.microsoftConfig.scopes.join(' '),
      response_mode: 'query',
      state: state || `user_${userId}_${Date.now()}`
    });

    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  // Handle Microsoft OAuth callback
  async handleMicrosoftCallback(code: string, state: string): Promise<OAuthToken> {
    if (!this.microsoftConfig.clientId || !this.microsoftConfig.clientSecret) {
      throw new Error('Microsoft OAuth not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET environment variables.');
    }

    try {
      const tenant = this.microsoftConfig.tenantId || 'common';
      const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
      
      // Exchange authorization code for tokens
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: this.microsoftConfig.clientId,
          client_secret: this.microsoftConfig.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.microsoftConfig.redirectUri,
          scope: this.microsoftConfig.scopes.join(' ')
        })
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Microsoft OAuth error: ${error.error_description || error.error}`);
      }

      const tokenData = await tokenResponse.json();
      
      // Extract user ID from state parameter
      const rawExtractedUserId = this.extractUserIdFromState(state);
      
      if (!rawExtractedUserId) {
        logger.error('Failed to extract userId from OAuth state', { 
          state,
          stateLength: state?.length 
        });
        throw new Error('Invalid OAuth state: userId not found. Please ensure you are authenticated and initiated OAuth from the workflow platform.');
      }
      
      const userId = String(rawExtractedUserId).trim();

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      const oauthToken: OAuthToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        scope: tokenData.scope ? tokenData.scope.split(' ') : this.microsoftConfig.scopes,
        provider: 'microsoft',
        userId
      };
      
      await this.storeTokens(oauthToken);

      logger.info('Microsoft OAuth callback successful', {
        userId,
        provider: 'microsoft',
        expiresAt: oauthToken.expiresAt
      });

      return oauthToken;

    } catch (error: any) {
      logger.error('Microsoft OAuth callback failed', error);
      throw error;
    }
  }

  // Refresh Microsoft token
  async refreshMicrosoftToken(userId: string): Promise<OAuthToken> {
    try {
      const storedToken = await this.getStoredTokens(userId, 'microsoft');
      
      if (!storedToken || !storedToken.refreshToken) {
        throw new Error('No refresh token available for Microsoft. Please reconnect your account.');
      }

      const tenant = this.microsoftConfig.tenantId || 'common';
      const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: this.microsoftConfig.clientId,
          client_secret: this.microsoftConfig.clientSecret,
          refresh_token: storedToken.refreshToken,
          grant_type: 'refresh_token',
          scope: this.microsoftConfig.scopes.join(' ')
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
      }

      const tokenData = await response.json();
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      const refreshedToken: OAuthToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || storedToken.refreshToken,
        expiresAt,
        scope: storedToken.scope,
        provider: 'microsoft',
        userId
      };

      await this.storeTokens(refreshedToken);

      logger.info('Microsoft token refreshed', {
        userId,
        provider: 'microsoft',
        expiresAt: refreshedToken.expiresAt
      });

      return refreshedToken;

    } catch (error: any) {
      logger.error('Microsoft token refresh failed', error);
      throw error;
    }
  }

  // Get valid access token (refresh if needed)
  async getValidAccessToken(userId: string, provider: string = 'google'): Promise<string> {
    try {
      logger.info('Getting valid access token', {
        userId,
        provider,
        userIdType: typeof userId,
        userIdLength: userId?.length
      });
      
      // Ensure userId is clean
      const cleanUserId = String(userId || '').trim();
      
      if (!cleanUserId) {
        throw new Error('Invalid userId - cannot get access token');
      }
      
      const storedToken = await this.getStoredTokens(cleanUserId, provider);
      
      if (!storedToken) {
        logger.error('No OAuth tokens found for user', {
          userId: cleanUserId,
          provider,
          userIdType: typeof userId,
          userIdLength: userId?.length,
          message: 'Please connect your Google account via OAuth first'
        });
        throw new Error('No OAuth tokens found for user. Please connect your Google account via OAuth.');
      }
      
      logger.info('Found stored OAuth token', {
        userId: cleanUserId,
        provider,
        expiresAt: storedToken.expiresAt,
        now: new Date(),
        expiresAtISO: storedToken.expiresAt.toISOString(),
        nowISO: new Date().toISOString()
      });

      // Check if token is expired (with 5 minute buffer)
      const bufferTime = 5 * 60 * 1000; // 5 minutes
      const expiresAtWithBuffer = new Date(storedToken.expiresAt.getTime() - bufferTime);
      const now = new Date();
      const isStillValid = now < expiresAtWithBuffer;
      
      logger.info('Checking token expiration', {
        userId: cleanUserId,
        provider,
        now: now.toISOString(),
        expiresAt: storedToken.expiresAt.toISOString(),
        expiresAtWithBuffer: expiresAtWithBuffer.toISOString(),
        isStillValid,
        bufferMinutes: 5
      });
      
      if (isStillValid) {
        logger.info('Token is still valid, returning stored token', {
          userId: cleanUserId,
          provider
        });
        return storedToken.accessToken;
      }

      // Token is expired, refresh it
      logger.info('Token expired or expiring soon, refreshing', {
        userId: cleanUserId,
        provider
      });
      
      if (provider === 'google') {
        const refreshedToken = await this.refreshGoogleToken(cleanUserId);
        logger.info('Token refreshed successfully', {
          userId: cleanUserId,
          provider,
          newExpiresAt: refreshedToken.expiresAt.toISOString()
        });
        return refreshedToken.accessToken;
      }
      
      if (provider === 'microsoft' || provider === 'microsoft-teams') {
        const refreshedToken = await this.refreshMicrosoftToken(cleanUserId);
        logger.info('Token refreshed successfully', {
          userId: cleanUserId,
          provider,
          newExpiresAt: refreshedToken.expiresAt.toISOString()
        });
        return refreshedToken.accessToken;
      }

      throw new Error(`Token refresh not supported for provider: ${provider}`);

    } catch (error: any) {
      logger.error('Failed to get valid access token', {
        userId,
        provider,
        error: error?.message || String(error),
        errorName: error?.name,
        stack: error?.stack
      });
      throw error;
    }
  }

  // Store OAuth tokens securely
  private async storeTokens(token: OAuthToken): Promise<void> {
    try {
      const encryptedData = encryptionService.encrypt(JSON.stringify({
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt.toISOString(),
        scope: token.scope
      }));

      // Ensure userId is clean and valid
      const cleanUserId = String(token.userId || '').trim();
      
      if (!cleanUserId) {
        throw new Error('Invalid userId - cannot store OAuth tokens');
      }
      
      logger.info('Storing OAuth tokens in database', {
        userId: cleanUserId,
        provider: token.provider,
        credentialType: `oauth_${token.provider}`
      });

      // Check if token already exists
      const existing = await prisma.credential.findFirst({
        where: {
          userId: cleanUserId,
          type: `oauth_${token.provider}`
        }
      });

      if (existing) {
        // Update existing token
        logger.info('Updating existing OAuth credential', {
          credentialId: existing.id,
          userId: cleanUserId,
          provider: token.provider
        });
        
        await prisma.credential.update({
          where: { id: existing.id },
          data: {
            encryptedData,
            updatedAt: new Date()
          }
        });
        
        logger.info('OAuth credential updated successfully', {
          credentialId: existing.id,
          userId: cleanUserId
        });
      } else {
        // Create new token (let Prisma auto-generate UUID)
        logger.info('Creating new OAuth credential', {
          userId: cleanUserId,
          provider: token.provider
        });
        
        const newCredential = await prisma.credential.create({
          data: {
            name: `${token.provider} OAuth Token`,
            type: `oauth_${token.provider}`,
            encryptedData,
            userId: cleanUserId
          }
        });
        
        logger.info('OAuth credential created successfully', {
          credentialId: newCredential.id,
          userId: cleanUserId,
          provider: token.provider
        });
      }
      
      // Log what was actually stored
      const storedCredential = await prisma.credential.findFirst({
        where: {
          userId: cleanUserId,
          type: `oauth_${token.provider}`
        }
      });
      
      logger.info('✅ OAuth Token Storage', {
        step: '2. OAuth Token Storage',
        userIdFromToken: token.userId,
        normalizedUserId: cleanUserId,
        storedUserId: storedCredential?.userId,
        credentialId: storedCredential?.id,
        userIdsMatch: storedCredential?.userId === cleanUserId,
        note: 'This userId is stored in database and will be used for retrieval'
      });

    } catch (error: any) {
      logger.error('Failed to store OAuth tokens', error);
      throw error;
    }
  }

  // Get stored OAuth tokens
  public async getStoredTokens(userId: string, provider: string): Promise<OAuthToken | null> {
    try {
      const credentialType = `oauth_${provider}`;
      
      logger.info('Retrieving stored OAuth tokens', {
        userId,
        provider,
        credentialType,
        userIdType: typeof userId,
        userIdLength: userId?.length
      });
      
      // Ensure userId is a string and trim any whitespace
      const cleanUserId = String(userId || '').trim();
      
      if (!cleanUserId) {
        logger.error('Invalid userId provided', {
          userId,
          provider,
          credentialType
        });
        return null;
      }
      
      const credential = await prisma.credential.findFirst({
        where: {
          userId: cleanUserId,
          type: credentialType
        }
      });
      
      logger.info('Credential lookup result', {
        userId: cleanUserId,
        provider,
        credentialType,
        found: !!credential,
        credentialId: credential?.id || null,
        credentialUserId: credential?.userId || null,
        userIdsMatch: credential ? credential.userId === cleanUserId : false
      });
      
      // Comprehensive comparison log
      logger.info('✅ OAuth Token Retrieval', {
        step: '3. OAuth Token Retrieval (Workflow Execution)',
        requestedUserId: userId,
        normalizedRequestedUserId: cleanUserId,
        foundCredentialUserId: credential?.userId || null,
        userIdsMatch: credential ? credential.userId === cleanUserId : false,
        found: !!credential,
        provider,
        note: credential?.userId !== cleanUserId 
          ? `⚠️ MISMATCH: Requested "${cleanUserId}" but found "${credential?.userId}"`
          : '✅ userId matches - token will be retrieved successfully'
      });

      if (!credential) {
        logger.warn('No OAuth credential found', {
          userId,
          provider,
          credentialType,
          message: `No OAuth tokens found for user ${userId} with provider ${provider}. Please connect your Google account via OAuth.`
        });
        return null;
      }

      // Prisma returns String fields as strings - ensure we have a clean string
      // Remove any potential whitespace or encoding issues
      let encryptedDataString = String(credential.encryptedData || '').trim();
      
      if (!encryptedDataString) {
        logger.error('Encrypted data is empty', {
          userId,
          provider,
          credentialId: credential.id
        });
        return null;
      }

      logger.info('OAuth credential found', {
        userId,
        provider,
        credentialType,
        credentialId: credential.id,
        createdAt: credential.createdAt,
        encryptedDataLength: encryptedDataString.length
      });

      // Decrypt the stored OAuth tokens
      let decryptedData: any;
      try {
        const decrypted = encryptionService.decrypt(encryptedDataString);
        decryptedData = JSON.parse(decrypted);
      } catch (decryptError: any) {
        logger.error('Failed to decrypt OAuth tokens', {
          userId,
          provider,
          credentialId: credential.id,
          error: decryptError.message,
          errorName: decryptError.name
        });
        // If decryption fails, delete the corrupted credential and return null
        // This forces the user to reconnect OAuth with fresh tokens
        try {
          await prisma.credential.delete({
            where: { id: credential.id }
          });
          logger.warn('Deleted corrupted OAuth credential', {
            userId,
            provider,
            credentialId: credential.id
          });
        } catch (deleteError: any) {
          logger.error('Failed to delete corrupted credential', {
            error: deleteError.message
          });
        }
        return null;
      }
      
      return {
        accessToken: decryptedData.accessToken,
        refreshToken: decryptedData.refreshToken,
        expiresAt: new Date(decryptedData.expiresAt),
        scope: decryptedData.scope,
        provider,
        userId
      };

    } catch (error: any) {
      logger.error('Failed to get stored OAuth tokens', {
        error: error.message,
        stack: error.stack,
        userId,
        provider
      });
      return null;
    }
  }

  // Get Google user info
  private async getGoogleUserInfo(accessToken: string): Promise<any> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get Google user info');
    }

    return await response.json();
  }

  // Extract user ID from OAuth state
  // State format: user_${userId}_${timestamp}
  // We need to extract userId, which might contain dashes (UUIDs) but not underscores before the timestamp
  private extractUserIdFromState(state: string): string | null {
    try {
      // More robust extraction: match "user_" followed by anything until the last underscore before timestamp
      // This handles UUIDs and other formats that might contain dashes
      const match = state.match(/^user_(.+?)_(\d+)$/);
      if (match && match[1]) {
        const extractedUserId = match[1];
        logger.info('Extracted userId from state', {
          state,
          extractedUserId,
          timestamp: match[2]
        });
        return extractedUserId;
      }
      
      // Fallback: try the old method for backwards compatibility
      const fallbackMatch = state.match(/user_([^_]+)_/);
      if (fallbackMatch && fallbackMatch[1]) {
        logger.warn('Using fallback state extraction', {
          state,
          extractedUserId: fallbackMatch[1]
        });
        return fallbackMatch[1];
      }
      
      logger.error('Failed to extract userId from state', {
        state,
        stateLength: state.length
      });
      return null;
    } catch (error: any) {
      logger.error('Error extracting userId from state', {
        state,
        error: error?.message || String(error)
      });
      return null;
    }
  }

  // Revoke OAuth tokens
  async revokeTokens(userId: string, provider: string = 'google'): Promise<void> {
    try {
      const storedToken = await this.getStoredTokens(userId, provider);
      
      if (storedToken) {
        // Revoke token with Google
        if (provider === 'google') {
          await fetch('https://oauth2.googleapis.com/revoke', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              token: storedToken.accessToken
            })
          });
        }

        // Delete from database
        await prisma.credential.deleteMany({
          where: {
            userId,
            type: `oauth_${provider}`
          }
        });

        logger.info('OAuth tokens revoked', {
          userId,
          provider
        });
      }

    } catch (error: any) {
      logger.error('Failed to revoke OAuth tokens', error);
      throw error;
    }
  }

  // Check if user has valid OAuth connection
  async hasValidConnection(userId: string, provider: string = 'google'): Promise<boolean> {
    try {
      const token = await this.getStoredTokens(userId, provider);
      return token !== null && new Date() < token.expiresAt;
    } catch {
      return false;
    }
  }

  // Get OAuth connection status
  async getConnectionStatus(userId: string, provider: string = 'google'): Promise<{
    connected: boolean;
    expiresAt?: Date;
    scopes?: string[];
  }> {
    try {
      // Ensure userId is clean and valid
      const cleanUserId = String(userId || '').trim();
      
      if (!cleanUserId) {
        logger.info('OAuth connection status: NOT CONNECTED', {
          userId,
          provider,
          reason: 'Invalid or empty userId'
        });
        return { connected: false };
      }
      
      const token = await this.getStoredTokens(cleanUserId, provider);
      
      if (!token) {
        logger.info('OAuth connection status: NOT CONNECTED', {
          userId: cleanUserId,
          provider,
          reason: 'No token found in database'
        });
        return { connected: false };
      }

      // Verify token is not expired (with 1 minute buffer for safety)
      const now = new Date();
      const bufferTime = 60 * 1000; // 1 minute buffer
      const expiresAtWithBuffer = new Date(token.expiresAt.getTime() - bufferTime);
      const isExpired = now >= expiresAtWithBuffer;
      
      if (isExpired) {
        logger.info('OAuth connection status: NOT CONNECTED (expired or expiring soon)', {
          userId: cleanUserId,
          provider,
          expiresAt: token.expiresAt,
          expiresAtWithBuffer: expiresAtWithBuffer,
          now: now,
          isExpired: true
        });
        return { connected: false };
      }

      // Verify token has valid access token
      if (!token.accessToken || token.accessToken.trim().length === 0) {
        logger.info('OAuth connection status: NOT CONNECTED', {
          userId: cleanUserId,
          provider,
          reason: 'Token has no access token'
        });
        return { connected: false };
      }

      logger.info('OAuth connection status: CONNECTED', {
        userId: cleanUserId,
        provider,
        expiresAt: token.expiresAt,
        scopes: token.scope
      });

      return {
        connected: true,
        expiresAt: token.expiresAt,
        scopes: token.scope
      };

    } catch (error: any) {
      logger.error('Failed to get connection status', {
        error: error?.message || String(error),
        userId,
        provider
      });
      return { connected: false };
    }
  }
}

// Initialize OAuth service only if credentials are available
let oauthService: OAuthService | null = null;

try {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    oauthService = new OAuthService();
    logger.info('OAuth service initialized with Google credentials');
  } else {
    logger.warn('OAuth service not initialized - Google credentials not found');
  }
} catch (error: any) {
  logger.warn('OAuth service initialization failed', { 
    error: error?.message || error?.toString() || String(error) 
  });
}

export { oauthService };
