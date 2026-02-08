// Test file to demonstrate real-time API integrations
// This file shows how to test all the implemented API services

import { 
  SlackService, 
  EmailService, 
  DatabaseService, 
  StorageService, 
  GitHubService, 
  StripeService, 
  TelegramService, 
  DiscordService, 
  WhatsAppService 
} from './apiServices';
import { AuthService } from './authService';
import { ErrorService } from './errorService';
import { logger } from '@/lib/logger';

export class IntegrationTester {
  // Test Slack integration
  static async testSlack(): Promise<void> {
    logger.debug('🧪 Testing Slack Integration...');
    
    const config = {
      botToken: 'xoxb-your-bot-token', // Replace with real token
      webhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL', // Replace with real webhook
      channel: '#general',
    };
    
    const result = await SlackService.sendMessage(config, 'Hello from Workflow Studio! 🚀');
    
    if (result.success) {
      logger.debug('✅ Slack message sent successfully:', result.data);
    } else {
      logger.debug('❌ Slack message failed:', result.error);
    }
  }

  // Test Email integration
  static async testEmail(): Promise<void> {
    logger.debug('🧪 Testing Email Integration...');
    
    const config = {
      apiKey: 'SG.your-sendgrid-key', // Replace with real SendGrid key
      fromEmail: 'test@yourdomain.com',
      toEmail: 'recipient@example.com',
      subject: 'Test from Workflow Studio',
      textContent: 'This is a test email from Workflow Studio! 🚀',
      htmlContent: '<h1>Test Email</h1><p>This is a test email from Workflow Studio! 🚀</p>',
    };
    
    const result = await EmailService.sendEmail(config);
    
    if (result.success) {
      logger.debug('✅ Email sent successfully:', result.data);
    } else {
      logger.debug('❌ Email sending failed:', result.error);
    }
  }

  // Test Telegram integration
  static async testTelegram(): Promise<void> {
    logger.debug('🧪 Testing Telegram Integration...');
    
    const config = {
      botToken: '1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ', // Replace with real bot token
      chatId: '123456789', // Replace with real chat ID
    };
    
    const result = await TelegramService.sendMessage(config, 'Hello from Workflow Studio! 🚀');
    
    if (result.success) {
      logger.debug('✅ Telegram message sent successfully:', result.data);
    } else {
      logger.debug('❌ Telegram message failed:', result.error);
    }
  }

  // Test Discord integration
  static async testDiscord(): Promise<void> {
    logger.debug('🧪 Testing Discord Integration...');
    
    const config = {
      webhookUrl: 'https://discord.com/api/webhooks/YOUR/WEBHOOK/URL', // Replace with real webhook
    };
    
    const result = await DiscordService.sendMessage(config, 'Hello from Workflow Studio! 🚀');
    
    if (result.success) {
      logger.debug('✅ Discord message sent successfully:', result.data);
    } else {
      logger.debug('❌ Discord message failed:', result.error);
    }
  }

  // Test GitHub integration
  static async testGitHub(): Promise<void> {
    logger.debug('🧪 Testing GitHub Integration...');
    
    const config = {
      token: 'ghp_your-github-token', // Replace with real token
      owner: 'your-username',
      repo: 'your-repo',
    };
    
    const result = await GitHubService.createIssue(config, {
      title: 'Test Issue from Workflow Studio',
      body: 'This is a test issue created by Workflow Studio! 🚀',
      labels: ['test', 'workflow'],
    });
    
    if (result.success) {
      logger.debug('✅ GitHub issue created successfully:', result.data);
    } else {
      logger.debug('❌ GitHub issue creation failed:', result.error);
    }
  }

  // Test Stripe integration
  static async testStripe(): Promise<void> {
    logger.debug('🧪 Testing Stripe Integration...');
    
    const config = {
      secretKey: 'sk_test_your-stripe-secret-key', // Replace with real key
    };
    
    const result = await StripeService.createPaymentIntent(config, 10.00, 'usd');
    
    if (result.success) {
      logger.debug('✅ Stripe payment intent created successfully:', result.data);
    } else {
      logger.debug('❌ Stripe payment intent creation failed:', result.error);
    }
  }

  // Test WhatsApp integration
  static async testWhatsApp(): Promise<void> {
    logger.debug('🧪 Testing WhatsApp Integration...');
    
    const config = {
      accessToken: 'your-whatsapp-access-token', // Replace with real token
      phoneNumberId: '123456789012345', // Replace with real phone number ID
    };
    
    const result = await WhatsAppService.sendMessage(config, '1234567890', 'Hello from Workflow Studio! 🚀');
    
    if (result.success) {
      logger.debug('✅ WhatsApp message sent successfully:', result.data);
    } else {
      logger.debug('❌ WhatsApp message failed:', result.error);
    }
  }

  // Test Database integration
  static async testDatabase(): Promise<void> {
    logger.debug('🧪 Testing Database Integration...');
    
    const config = {
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      username: 'testuser',
      password: 'testpass',
    };
    
    const result = await DatabaseService.executeQuery(config, 'SELECT 1 as test');
    
    if (result.success) {
      logger.debug('✅ Database query executed successfully:', result.data);
    } else {
      logger.debug('❌ Database query failed:', result.error);
    }
  }

  // Test Storage integration
  static async testStorage(): Promise<void> {
    logger.debug('🧪 Testing Storage Integration...');
    
    const config = {
      accessKeyId: 'your-access-key',
      secretAccessKey: 'your-secret-key',
      bucket: 'your-bucket',
      region: 'us-east-1',
    };
    
    const testFile = new Blob(['Test file content'], { type: 'text/plain' });
    
    const result = await StorageService.uploadFile(config, testFile, 'test-file.txt');
    
    if (result.success) {
      logger.debug('✅ File uploaded successfully:', result.data);
    } else {
      logger.debug('❌ File upload failed:', result.error);
    }
  }

  // Test Authentication service
  static async testAuthentication(): Promise<void> {
    logger.debug('🧪 Testing Authentication Service...');
    
    try {
      // Test storing credentials
      const credentialId = await AuthService.storeCredentials({
        type: 'apiKey',
        name: 'Test API Key',
        provider: 'openai',
        credentials: {
          api_key: 'sk-test-key',
        },
      });
      
      logger.debug('✅ Credentials stored successfully:', credentialId);
      
      // Test retrieving credentials
      const credentials = await AuthService.getCredentials(credentialId);
      logger.debug('✅ Credentials retrieved successfully:', credentials);
      
      // Test OAuth URL generation
      const oauthUrl = AuthService.generateOAuthUrl('github', {
        clientId: 'your-client-id',
        scope: ['repo', 'user'],
      });
      
      logger.debug('✅ OAuth URL generated:', oauthUrl);
      
    } catch (error: any) {
      logger.debug('❌ Authentication test failed:', error.message);
    }
  }

  // Test Error handling
  static async testErrorHandling(): Promise<void> {
    logger.debug('🧪 Testing Error Handling...');
    
    try {
      // Test API error handling
      const apiError = ErrorService.handleApiError(
        { response: { status: 401, data: { message: 'Unauthorized' } } },
        'test-node',
        'slack'
      );
      
      logger.debug('✅ API error handled:', apiError.userMessage);
      
      // Test validation error
      const validationError = ErrorService.handleValidationError(
        'message',
        '',
        'required',
        'test-node',
        'slack'
      );
      
      logger.debug('✅ Validation error handled:', validationError.userMessage);
      
      // Test retry logic
      let attempt = 0;
      await ErrorService.executeWithRetry(
        async () => {
          attempt++;
          if (attempt < 3) {
            throw new Error('Simulated failure');
          }
          return 'Success!';
        },
        'test-node',
        'test'
      );
      
      logger.debug('✅ Retry logic worked, attempt:', attempt);
      
    } catch (error: any) {
      logger.debug('❌ Error handling test failed:', error.message);
    }
  }

  // Run all tests
  static async runAllTests(): Promise<void> {
    logger.debug('🚀 Starting Integration Tests...\n');
    
    await this.testAuthentication();
    logger.debug('');
    
    await this.testErrorHandling();
    logger.debug('');
    
    await this.testSlack();
    logger.debug('');
    
    await this.testEmail();
    logger.debug('');
    
    await this.testTelegram();
    logger.debug('');
    
    await this.testDiscord();
    logger.debug('');
    
    await this.testGitHub();
    logger.debug('');
    
    await this.testStripe();
    logger.debug('');
    
    await this.testWhatsApp();
    logger.debug('');
    
    await this.testDatabase();
    logger.debug('');
    
    await this.testStorage();
    logger.debug('');
    
    logger.debug('✅ All integration tests completed!');
  }
}

// Example usage in browser console:
// IntegrationTester.runAllTests();
