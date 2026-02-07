# WhatsApp API Credentials Setup Guide

Complete step-by-step guide to get your WhatsApp Access Token and Phone Number ID from Meta Business Manager.

---

## Prerequisites

Before you start, make sure you have:
- ✅ A Meta Business Account (create at [business.facebook.com](https://business.facebook.com))
- ✅ A WhatsApp Business Account (can be created during setup)
- ✅ A verified phone number for your business
- ✅ Admin access to the Meta Business Account

---

## Step 1: Access Meta Business Manager

1. Go to [https://business.facebook.com](https://business.facebook.com)
2. Log in with your Facebook account
3. Select your Business Account (or create one if you don't have it)

---

## Step 2: Navigate to WhatsApp Manager

### Option A: Direct Navigation
1. In the left sidebar, look for **"WhatsApp"** or **"WhatsApp Accounts"**
2. Click on it to open WhatsApp Manager

### Option B: Through Business Settings
1. Click the **Settings** icon (gear) in the bottom left
2. Go to **Business Settings**
3. In the left menu, find **"WhatsApp Accounts"** or **"WhatsApp"**
4. Click on it

---

## Step 3: Set Up WhatsApp Business API

### If you don't have WhatsApp Business API set up yet:

1. **Click "Add Phone Number"** or **"Get Started"**
2. **Choose your phone number:**
   - Use an existing number, OR
   - Get a new number from Meta (if available in your region)
3. **Verify your phone number** (you'll receive a verification code via SMS)
4. **Complete the setup wizard**

---

## Step 4: Get Your Phone Number ID

The Phone Number ID is usually displayed right after setup, but here's how to find it:

### Method 1: From WhatsApp Manager Dashboard
1. In **WhatsApp Manager**, you'll see your phone number listed
2. Click on your **phone number**
3. Look for **"Phone Number ID"** in the details
   - It's a long numeric string (e.g., `56784976247895`)
   - Copy this value

### Method 2: From API Setup Page
1. In WhatsApp Manager, click **"API Setup"** or **"Getting Started"**
2. Scroll down to find **"Phone Number ID"**
3. It will be displayed as: `Phone Number ID: 56784976247895`
4. Copy this number

### Method 3: From Graph API Explorer (Advanced)
1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app
3. Make a GET request to: `/me/phone_numbers`
4. The response will show your Phone Number ID

**📝 Note:** The Phone Number ID is a numeric string, typically 10-15 digits long.

---

## Step 5: Get Your Access Token

### Option A: Temporary Access Token (Quick Testing - Expires in 24 hours)

1. **In WhatsApp Manager**, go to **"API Setup"** or **"Getting Started"**
2. Scroll down to **"Temporary access token"** section
3. You'll see a token that looks like: `EAAxxxxxxxxxxxxx...`
4. Click **"Copy"** or manually copy the token
5. ⚠️ **Important:** This token expires in 24 hours!

### Option B: Permanent Access Token (Recommended for Production)

#### Step 5.1: Create a Meta App
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Choose **"Business"** as the app type
4. Fill in:
   - **App Name:** e.g., "My WhatsApp Business App"
   - **App Contact Email:** Your email
5. Click **"Create App"**

#### Step 5.2: Add WhatsApp Product
1. In your app dashboard, find **"Add Product"** or **"Products"** in the left menu
2. Find **"WhatsApp"** and click **"Set Up"**
3. Follow the setup wizard

#### Step 5.3: Generate System User Token
1. Go to **Meta Business Manager** → **Business Settings**
2. Click **"Users"** → **"System Users"** (in left menu)
3. Click **"Add"** to create a new system user
4. Fill in:
   - **Name:** e.g., "WhatsApp API User"
   - **System User Role:** Admin
5. Click **"Create System User"**

#### Step 5.4: Assign Assets to System User
1. Still in **System Users**, click on the user you just created
2. Click **"Assign Assets"**
3. Select:
   - ✅ Your **WhatsApp Business Account**
   - ✅ Your **App** (created in Step 5.1)
4. Click **"Save Changes"**

#### Step 5.5: Generate Access Token
1. Still viewing your System User, click **"Generate New Token"**
2. Select your **App** from the dropdown
3. Select scopes/permissions:
   - ✅ `whatsapp_business_messaging`
   - ✅ `whatsapp_business_management`
   - ✅ `whatsapp_business_phone_number_id` (if available)
4. Set **Token Expiration:**
   - **Never** (for permanent token) OR
   - **Custom** (e.g., 60 days)
5. Click **"Generate Token"**
6. **⚠️ IMPORTANT:** Copy the token immediately! You won't be able to see it again.
7. Store it securely (password manager, environment variables, etc.)

---

## Step 6: Get Your Business Account ID (Optional)

Only needed if you're using template messages:

1. Go to **Meta Business Manager** → **Business Settings**
2. Click **"Business Info"** in the left menu
3. Find **"Business ID"** or **"ID"**
4. It's a long numeric string (e.g., `123456789012345`)
5. Copy this value

---

## Step 7: Verify Your Credentials

### Quick Test Using Graph API Explorer

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app
3. Paste your **Access Token** in the "Access Token" field
4. Make a test request:
   ```
   GET /v18.0/{your-phone-number-id}
   ```
   Replace `{your-phone-number-id}` with your actual Phone Number ID
5. If you get a response with phone number details, your credentials are valid!

### Test Using cURL

```bash
curl -X GET "https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}"
```

Replace:
- `{PHONE_NUMBER_ID}` with your Phone Number ID
- `{YOUR_ACCESS_TOKEN}` with your Access Token

---

## Common Issues & Solutions

### ❌ "Invalid Access Token"
- **Solution:** Token may have expired (if temporary). Generate a new one.
- **Solution:** Make sure you copied the entire token (they're very long).
- **Solution:** Check that the token has WhatsApp permissions.

### ❌ "Phone Number ID not found"
- **Solution:** Make sure you're using the Phone Number ID, not the phone number itself.
- **Solution:** Verify the number is set up in WhatsApp Business API.
- **Solution:** Check you're using the correct Business Account.

### ❌ "Token expires too quickly"
- **Solution:** Use a System User token with "Never" expiration instead of temporary token.
- **Solution:** Set up token refresh mechanism in your application.

### ❌ "Permission denied"
- **Solution:** Make sure your System User has admin permissions.
- **Solution:** Verify assets (WhatsApp account, App) are assigned to the System User.
- **Solution:** Check that required scopes are selected when generating token.

---

## Security Best Practices

1. **Never commit tokens to code repositories**
   - Use environment variables
   - Use secret management services (AWS Secrets Manager, Azure Key Vault, etc.)

2. **Use permanent tokens for production**
   - Temporary tokens are only for quick testing
   - Set up proper token rotation if needed

3. **Limit token permissions**
   - Only grant necessary scopes
   - Use least privilege principle

4. **Monitor token usage**
   - Set up alerts for unusual activity
   - Rotate tokens periodically

5. **Store securely**
   - Use encrypted storage
   - Restrict access to credentials

---

## Quick Reference: Where to Find Each Credential

| Credential | Location | Format |
|------------|----------|--------|
| **Phone Number ID** | WhatsApp Manager → API Setup | Numeric (10-15 digits) |
| **Access Token** | WhatsApp Manager → API Setup (temp) OR System User → Generate Token (permanent) | String (starts with "EAA") |
| **Business Account ID** | Business Settings → Business Info | Numeric (15 digits) |

---

## Next Steps

Once you have your credentials:

1. ✅ Copy them to your WhatsApp node configuration
2. ✅ Test with a simple text message
3. ✅ Verify the message is received
4. ✅ Set up proper credential storage (environment variables, secrets manager)
5. ✅ Document where credentials are stored for your team

---

## Additional Resources

- [Meta Business Manager](https://business.facebook.com)
- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [WhatsApp Business API Setup Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)

---

## Support

If you encounter issues:
1. Check Meta Business Manager status
2. Review WhatsApp API documentation
3. Check Meta Developer Community forums
4. Contact Meta Business Support (if you have a paid account)


