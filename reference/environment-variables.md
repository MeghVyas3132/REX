# Environment Variables Setup

## Required Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# Server Configuration
PORT=3003
NODE_ENV=development
BASE_URL=http://localhost:3003

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/workflow_studio

# Redis
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ENCRYPTION_KEY=your-encryption-key-change-in-production

# AI Provider API Keys
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENROUTER_API_KEY=your-openrouter-api-key
GOOGLE_API_KEY=your-google-api-key

# Google OAuth Configuration (Required for OAuth system)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Microsoft OAuth Configuration (Required for Microsoft Teams integration)
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:3003/api/auth/oauth/microsoft/callback

# Other API Keys
SLACK_BOT_TOKEN=your-slack-bot-token
DISCORD_BOT_TOKEN=your-discord-bot-token
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Optional: Disable authentication for testing
AUTH_DISABLED=false
```

## Google OAuth Setup

To enable Google OAuth functionality:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Drive API and Gmail API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set authorized redirect URI: `http://localhost:3003/api/auth/oauth/google/callback`

## Microsoft OAuth Setup

To enable Microsoft Teams OAuth functionality:

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in:
   - **Name**: Your app name (e.g., "Workflow Studio")
   - **Supported account types**: 
     - **IMPORTANT**: Select **"Accounts in any organizational directory and personal Microsoft accounts"** (multi-tenant) OR **"Accounts in any organizational directory (Any Azure AD directory - Multitenant)"**
     - If you select single-tenant, you'll need to use your specific Tenant ID instead of "common"
   - **Redirect URI**: 
     - Platform: Web
     - URI: `http://localhost:3003/api/auth/oauth/microsoft/callback`
5. Click **Register**
6. After registration:
   - Go to **Certificates & secrets** → Create a new **Client secret**
   - Copy the **Application (client) ID** → This is your `MICROSOFT_CLIENT_ID`
   - Copy the **Client secret value** → This is your `MICROSOFT_CLIENT_SECRET`
7. Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**
8. Add these permissions:
   - `User.Read`
   - `Team.ReadBasic.All`
   - `Channel.ReadBasic.All`
   - `Chat.ReadWrite`
   - `ChannelMessage.Send`
   - `TeamMember.ReadWrite.All`
9. Click **Add permissions** and then **Grant admin consent** (if you're an admin)

### If you get "AADSTS50194" error (single-tenant app):

**Option A - Make app multi-tenant (Recommended):**
1. In Azure Portal, go to your app registration → **Authentication**
2. Under **Supported account types**, change to:
   - "Accounts in any organizational directory and personal Microsoft accounts" OR
   - "Accounts in any organizational directory (Any Azure AD directory - Multitenant)"
3. Click **Save**
4. Keep `MICROSOFT_TENANT_ID=common` in your `.env` file

**Option B - Use your Tenant ID:**
1. In Azure Portal, go to **Azure Active Directory** → **Overview**
2. Copy the **Tenant ID** (also called Directory ID)
3. Update your `.env` file:
   ```
   MICROSOFT_TENANT_ID=your-tenant-id-here
   ```
   (Replace `common` with your actual Tenant ID)

10. Add the environment variables to your `.env` file:
    ```
    MICROSOFT_CLIENT_ID=your-client-id-here
    MICROSOFT_CLIENT_SECRET=your-client-secret-here
    MICROSOFT_TENANT_ID=common
    MICROSOFT_REDIRECT_URI=http://localhost:3003/api/auth/oauth/microsoft/callback
    ```

## Testing OAuth

After setting up the environment variables:

1. Start the server: `npm start`
2. Test OAuth status: `curl http://localhost:3003/oauth/test`
3. Check if Google OAuth is configured properly

## Security Notes

- Never commit `.env` files to version control
- Use strong, unique secrets in production
- Rotate API keys regularly
- Use environment-specific configurations
