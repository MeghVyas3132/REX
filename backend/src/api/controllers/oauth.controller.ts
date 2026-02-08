import { Request, Response } from 'express';
import { oauthService } from '../../services/oauth.service';
import { logger } from '../../utils/logger';
import { ValidationError, UnauthorizedError } from '../../utils/error-handler';

export class OAuthController {
  // Initiate Google OAuth flow
  async initiateGoogleAuth(req: Request, res: Response): Promise<void> {
    try {
      if (!oauthService) {
        throw new Error('OAuth service not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }

      const state = req.query.state as string;
      const authUrl = oauthService.generateGoogleAuthUrl(userId, state);

      logger.info('Google OAuth initiated', {
        userId,
        state
      });

      res.json({
        success: true,
        authUrl,
        message: 'Redirect user to this URL to authorize Google access'
      });

    } catch (error: any) {
      logger.error('Google OAuth initiation failed', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Handle Google OAuth callback
  async handleGoogleCallback(req: Request, res: Response): Promise<void> {
    try {
      if (!oauthService) {
        throw new Error('OAuth service not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
      }

      const { code, state, error, error_description } = req.query;

      if (error) {
        // Redirect to frontend callback page with error parameters for better UX
        const frontendBaseUrl = process.env.FRONTEND_URL || process.env.BASE_URL?.replace(':3003', ':8080') || 'http://localhost:8080';
        const redirectUrl = new URL(`${frontendBaseUrl}/google-oauth-callback`);
        redirectUrl.searchParams.set('error', error as string);
        if (error_description) {
          redirectUrl.searchParams.set('error_description', error_description as string);
        }
        if (state) {
          redirectUrl.searchParams.set('state', state as string);
        }
        
        logger.warn('Google OAuth error - redirecting to frontend', {
          error,
          error_description,
          redirectUrl: redirectUrl.toString()
        });
        
        return res.redirect(redirectUrl.toString());
      }

      if (!code) {
        throw new ValidationError('Authorization code is required', [{
          message: 'Authorization code is required',
          errors: [],
          statusCode: 400,
          isOperational: true,
          name: 'ValidationError'
        }]);
      }

      // State parameter is required to extract userId
      if (!state) {
        throw new ValidationError('State parameter is required', [{
          message: 'State parameter is required to identify the user',
          errors: [],
          statusCode: 400,
          isOperational: true,
          name: 'ValidationError'
        }]);
      }

      logger.info('OAuth callback received', {
        hasCode: !!code,
        hasState: !!state,
        statePreview: state ? (state as string).substring(0, 50) : null
      });

      // Check if this is a direct redirect from Google (browser request) or API call
      const isBrowserRequest = req.headers.accept?.includes('text/html');
      
      if (isBrowserRequest) {
        // Direct redirect from Google - redirect to frontend callback page
        const frontendBaseUrl = process.env.FRONTEND_URL || process.env.BASE_URL?.replace(':3003', ':8080') || 'http://localhost:8080';
        const redirectUrl = new URL(`${frontendBaseUrl}/google-oauth-callback`);
        redirectUrl.searchParams.set('code', code as string);
        if (state) {
          redirectUrl.searchParams.set('state', state as string);
        }
        
        logger.info('Google OAuth callback - redirecting to frontend', {
          hasCode: !!code,
          redirectUrl: redirectUrl.toString()
        });
        
        return res.redirect(redirectUrl.toString());
      }
      
      // API call from frontend - process and return JSON
      const token = await oauthService.handleGoogleCallback(code as string, state as string);

      logger.info('Google OAuth callback successful', {
        userId: token.userId,
        provider: token.provider
      });

      res.json({
        success: true,
        message: 'Google account connected successfully',
        token: {
          provider: token.provider,
          expiresAt: token.expiresAt,
          scopes: token.scope
        }
      });

    } catch (error: any) {
      logger.error('Google OAuth callback failed', error);
      
      // Check if this is a browser request - redirect to frontend with error
      const isBrowserRequest = req.headers.accept?.includes('text/html');
      if (isBrowserRequest) {
        const frontendBaseUrl = process.env.FRONTEND_URL || process.env.BASE_URL?.replace(':3003', ':8080') || 'http://localhost:8080';
        const redirectUrl = new URL(`${frontendBaseUrl}/google-oauth-callback`);
        redirectUrl.searchParams.set('error', 'callback_failed');
        redirectUrl.searchParams.set('error_description', error.message || 'Failed to process OAuth callback');
        if (req.query.state) {
          redirectUrl.searchParams.set('state', req.query.state as string);
        }
        return res.redirect(redirectUrl.toString());
      }
      
      // API call - return JSON error
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Initiate Microsoft OAuth flow
  async initiateMicrosoftAuth(req: Request, res: Response): Promise<void> {
    try {
      if (!oauthService) {
        throw new Error('OAuth service not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET environment variables.');
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }

      const state = req.query.state as string;
      const authUrl = oauthService.generateMicrosoftAuthUrl(userId, state);

      logger.info('Microsoft OAuth initiated', {
        userId,
        state
      });

      res.json({
        success: true,
        authUrl,
        message: 'Redirect user to this URL to authorize Microsoft Teams access'
      });

    } catch (error: any) {
      logger.error('Microsoft OAuth initiation failed', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Handle Microsoft OAuth callback
  async handleMicrosoftCallback(req: Request, res: Response): Promise<void> {
    try {
      if (!oauthService) {
        throw new Error('OAuth service not configured');
      }

      const code = req.query.code as string;
      const state = req.query.state as string;
      const error = req.query.error as string;
      const errorDescription = req.query.error_description as string;

      if (error) {
        logger.error('Microsoft OAuth error', new Error(errorDescription || error));
        res.status(400).json({
          success: false,
          error: errorDescription || (error as string)
        });
        return;
      }

      if (!code || !state) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: code and state are required'
        });
        return;
      }

      logger.info('Microsoft OAuth callback received', {
        hasCode: !!code,
        hasState: !!state
      });

      const isBrowserRequest = req.headers.accept?.includes('text/html');
      
      if (isBrowserRequest) {
        const frontendBaseUrl = process.env.FRONTEND_URL || process.env.BASE_URL?.replace(':3003', ':8080') || 'http://localhost:8080';
        const redirectUrl = new URL(`${frontendBaseUrl}/microsoft-oauth-callback`);
        redirectUrl.searchParams.set('code', code);
        if (state) {
          redirectUrl.searchParams.set('state', state);
        }
        
        logger.info('Microsoft OAuth callback - redirecting to frontend', {
          hasCode: !!code,
          redirectUrl: redirectUrl.toString()
        });
        
        return res.redirect(redirectUrl.toString());
      }
      
      const token = await oauthService.handleMicrosoftCallback(code, state);

      logger.info('Microsoft OAuth callback successful', {
        userId: token.userId,
        provider: token.provider
      });

      res.json({
        success: true,
        message: 'Microsoft Teams account connected successfully',
        token: {
          provider: token.provider,
          expiresAt: token.expiresAt,
          scopes: token.scope
        }
      });

    } catch (error: any) {
      logger.error('Microsoft OAuth callback failed', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Refresh Google tokens
  async refreshGoogleTokens(req: Request, res: Response): Promise<void> {
    try {
      if (!oauthService) {
        throw new Error('OAuth service not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }

      const token = await oauthService.refreshGoogleToken(userId);

      logger.info('Google tokens refreshed', {
        userId,
        expiresAt: token.expiresAt
      });

      res.json({
        success: true,
        message: 'Tokens refreshed successfully',
        token: {
          provider: token.provider,
          expiresAt: token.expiresAt,
          scopes: token.scope
        }
      });

    } catch (error: any) {
      logger.error('Google token refresh failed', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get valid access token
  async getAccessToken(req: Request, res: Response): Promise<void> {
    try {
      if (!oauthService) {
        throw new Error('OAuth service not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }

      const provider = req.query.provider as string || 'google';
      const accessToken = await oauthService.getValidAccessToken(userId, provider);

      res.json({
        success: true,
        accessToken,
        provider
      });

    } catch (error: any) {
      logger.error('Failed to get access token', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get connection status
  async getConnectionStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!oauthService) {
        throw new Error('OAuth service not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }

      const provider = req.query.provider as string || 'google';
      const status = await oauthService.getConnectionStatus(userId, provider);

      res.json({
        success: true,
        status
      });

    } catch (error: any) {
      logger.error('Failed to get connection status', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Revoke OAuth connection
  async revokeConnection(req: Request, res: Response): Promise<void> {
    try {
      if (!oauthService) {
        throw new Error('OAuth service not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }

      const provider = req.body.provider || 'google';
      await oauthService.revokeTokens(userId, provider);

      logger.info('OAuth connection revoked', {
        userId,
        provider
      });

      res.json({
        success: true,
        message: `${provider} connection revoked successfully`
      });

    } catch (error: any) {
      logger.error('Failed to revoke OAuth connection', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // List all OAuth connections
  async listConnections(req: Request, res: Response): Promise<void> {
    try {
      if (!oauthService) {
        throw new Error('OAuth service not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }

      const providers = ['google'];
      const connections = [];

      for (const provider of providers) {
        const status = await oauthService.getConnectionStatus(userId, provider);
        connections.push({
          provider,
          ...status
        });
      }

      res.json({
        success: true,
        connections
      });

    } catch (error: any) {
      logger.error('Failed to list OAuth connections', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}
