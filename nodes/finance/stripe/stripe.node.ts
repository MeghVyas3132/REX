import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
import { logger } from '../../lib/logger.js';

export class StripeNode {
  getNodeDefinition() {
    return {
      id: 'stripe',
      type: 'action',
      name: 'Stripe',
      description: 'Process payments and manage Stripe operations',
      category: 'finance',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'apiKey',
          type: 'string',
          displayName: 'API Key',
          description: 'Stripe Secret API Key',
          required: true,
          placeholder: 'sk_test_xxxxxxxxxxxx',
          credentialType: 'stripe_api_key'
        },
        {
          name: 'operation',
          type: 'options',
          displayName: 'Operation',
          description: 'Stripe operation to perform',
          required: true,
          default: 'createPaymentIntent',
          options: [
            { name: 'Create Payment Intent', value: 'createPaymentIntent' },
            { name: 'Create Customer', value: 'createCustomer' },
            { name: 'Create Product', value: 'createProduct' },
            { name: 'Create Price', value: 'createPrice' },
            { name: 'Create Subscription', value: 'createSubscription' },
            { name: 'Create Invoice', value: 'createInvoice' },
            { name: 'Create Refund', value: 'createRefund' },
            { name: 'List Customers', value: 'listCustomers' },
            { name: 'List Products', value: 'listProducts' },
            { name: 'List Invoices', value: 'listInvoices' },
            { name: 'Get Customer', value: 'getCustomer' },
            { name: 'Get Product', value: 'getProduct' },
            { name: 'Update Customer', value: 'updateCustomer' },
            { name: 'Cancel Subscription', value: 'cancelSubscription' }
          ]
        },
        {
          name: 'amount',
          type: 'string',
          displayName: 'Amount',
          description: 'Amount in cents (e.g., 2000 for $20.00)',
          required: false,
          placeholder: '2000'
        },
        {
          name: 'currency',
          type: 'string',
          displayName: 'Currency',
          description: 'Currency code',
          required: false,
          placeholder: 'usd',
          default: 'usd'
        },
        {
          name: 'customerEmail',
          type: 'string',
          displayName: 'Customer Email',
          description: 'Customer email address',
          required: false,
          placeholder: 'customer@example.com'
        },
        {
          name: 'customerName',
          type: 'string',
          displayName: 'Customer Name',
          description: 'Customer full name',
          required: false,
          placeholder: 'John Doe'
        },
        {
          name: 'productName',
          type: 'string',
          displayName: 'Product Name',
          description: 'Product name',
          required: false,
          placeholder: 'Premium Plan'
        },
        {
          name: 'productDescription',
          type: 'string',
          displayName: 'Product Description',
          description: 'Product description',
          required: false,
          placeholder: 'Premium subscription plan'
        },
        {
          name: 'priceAmount',
          type: 'string',
          displayName: 'Price Amount',
          description: 'Price amount in cents',
          required: false,
          placeholder: '999'
        },
        {
          name: 'priceInterval',
          type: 'options',
          displayName: 'Price Interval',
          description: 'Billing interval for recurring prices',
          required: false,
          default: 'month',
          options: [
            { name: 'Day', value: 'day' },
            { name: 'Week', value: 'week' },
            { name: 'Month', value: 'month' },
            { name: 'Year', value: 'year' }
          ]
        },
        {
          name: 'customerId',
          type: 'string',
          displayName: 'Customer ID',
          description: 'Stripe Customer ID',
          required: false,
          placeholder: 'cus_xxxxxxxxxxxx'
        },
        {
          name: 'productId',
          type: 'string',
          displayName: 'Product ID',
          description: 'Stripe Product ID',
          required: false,
          placeholder: 'prod_xxxxxxxxxxxx'
        },
        {
          name: 'subscriptionId',
          type: 'string',
          displayName: 'Subscription ID',
          description: 'Stripe Subscription ID',
          required: false,
          placeholder: 'sub_xxxxxxxxxxxx'
        },
        {
          name: 'paymentIntentId',
          type: 'string',
          displayName: 'Payment Intent ID',
          description: 'Stripe Payment Intent ID',
          required: false,
          placeholder: 'pi_xxxxxxxxxxxx'
        },
        {
          name: 'limit',
          type: 'string',
          displayName: 'Limit',
          description: 'Number of items to return',
          required: false,
          placeholder: '10',
          default: '10'
        }
      ],
      inputs: [
        { name: 'amount', type: 'number', description: 'Amount from previous node', required: false },
        { name: 'customerEmail', type: 'string', description: 'Customer email from previous node', required: false },
        { name: 'customerId', type: 'string', description: 'Customer ID from previous node', required: false }
      ],
      outputs: [
        { name: 'id', type: 'string', description: 'Stripe object ID' },
        { name: 'status', type: 'string', description: 'Operation status' },
        { name: 'data', type: 'object', description: 'Stripe object data' },
        { name: 'url', type: 'string', description: 'Stripe dashboard URL' }
      ]
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.apiKey && !context.input?.apiKey) {
      throw new Error('Required parameter "apiKey" is missing');
    }
    if (!config.operation && !context.input?.operation) {
      throw new Error('Required parameter "operation" is missing');
    }

    
    try {

      const { 
        apiKey, 
        operation,
        amount,
        currency,
        customerEmail,
        customerName,
        productName,
        productDescription,
        priceAmount,
        priceInterval,
        customerId,
        productId,
        subscriptionId,
        paymentIntentId,
        limit
      } = config;
      
      const inputAmount = context.input?.amount || amount;
      const inputCustomerEmail = context.input?.customerEmail || customerEmail;
      const inputCustomerId = context.input?.customerId || customerId;

      if (!apiKey) {
        throw new Error('Stripe API Key is required');
      }

      let result: any = {};

      switch (operation) {
        case 'createPaymentIntent':
          result = await this.createPaymentIntent(apiKey, inputAmount, currency, inputCustomerId);
          break;
        case 'createCustomer':
          result = await this.createCustomer(apiKey, inputCustomerEmail, customerName);
          break;
        case 'createProduct':
          result = await this.createProduct(apiKey, productName, productDescription);
          break;
        case 'createPrice':
          result = await this.createPrice(apiKey, productId, priceAmount, currency, priceInterval);
          break;
        case 'createSubscription':
          result = await this.createSubscription(apiKey, inputCustomerId, productId);
          break;
        case 'createInvoice':
          result = await this.createInvoice(apiKey, inputCustomerId);
          break;
        case 'createRefund':
          result = await this.createRefund(apiKey, paymentIntentId, inputAmount);
          break;
        case 'listCustomers':
          result = await this.listCustomers(apiKey, limit);
          break;
        case 'listProducts':
          result = await this.listProducts(apiKey, limit);
          break;
        case 'listInvoices':
          result = await this.listInvoices(apiKey, limit);
          break;
        case 'getCustomer':
          result = await this.getCustomer(apiKey, inputCustomerId);
          break;
        case 'getProduct':
          result = await this.getProduct(apiKey, productId);
          break;
        case 'updateCustomer':
          result = await this.updateCustomer(apiKey, inputCustomerId, inputCustomerEmail, customerName);
          break;
        case 'cancelSubscription':
          result = await this.cancelSubscription(apiKey, subscriptionId);
          break;
        default:
          throw new Error(`Unsupported Stripe operation: ${operation}`);
      }

      const duration = Date.now() - startTime;
      
      logger.info('Stripe node executed successfully', {
        operation,
        duration
      });

      return {
        success: true,
        output: {
          id: result.id,
          status: result.status || 'success',
          output: result,
          url: this.getStripeUrl(operation, result.id),
          operation,
          timestamp: new Date().toISOString(),
          duration
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Stripe node execution failed', {
        error: error.message,
        operation: config.operation,
        duration
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private async createPaymentIntent(apiKey: string, amount: string, currency: string, customerId?: string) {
    const url = 'https://api.stripe.com/v1/payment_intents';
    
    const payload: any = {
      amount: parseInt(amount || '0'),
      currency: currency || 'usd'
    };

    if (customerId) payload.customer = customerId;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async createCustomer(apiKey: string, email?: string, name?: string) {
    const url = 'https://api.stripe.com/v1/customers';
    
    const payload: any = {};
    if (email) payload.email = email;
    if (name) payload.name = name;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async createProduct(apiKey: string, name?: string, description?: string) {
    const url = 'https://api.stripe.com/v1/products';
    
    const payload: any = {};
    if (name) payload.name = name;
    if (description) payload.description = description;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async createPrice(apiKey: string, productId?: string, amount?: string, currency?: string, interval?: string) {
    const url = 'https://api.stripe.com/v1/prices';
    
    const payload: any = {
      unit_amount: parseInt(amount || '0'),
      currency: currency || 'usd'
    };

    if (productId) payload.product = productId;
    if (interval) payload.recurring = JSON.stringify({ interval });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async createSubscription(apiKey: string, customerId?: string, priceId?: string) {
    const url = 'https://api.stripe.com/v1/subscriptions';
    
    const payload: any = {};
    if (customerId) payload.customer = customerId;
    if (priceId) payload.items = JSON.stringify([{ price: priceId }]);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async createInvoice(apiKey: string, customerId?: string) {
    const url = 'https://api.stripe.com/v1/invoices';
    
    const payload: any = {};
    if (customerId) payload.customer = customerId;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async createRefund(apiKey: string, paymentIntentId?: string, amount?: string) {
    const url = 'https://api.stripe.com/v1/refunds';
    
    const payload: any = {};
    if (paymentIntentId) payload.payment_intent = paymentIntentId;
    if (amount) payload.amount = parseInt(amount);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async listCustomers(apiKey: string, limit?: string) {
    const url = `https://api.stripe.com/v1/customers?limit=${limit || '10'}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async listProducts(apiKey: string, limit?: string) {
    const url = `https://api.stripe.com/v1/products?limit=${limit || '10'}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async listInvoices(apiKey: string, limit?: string) {
    const url = `https://api.stripe.com/v1/invoices?limit=${limit || '10'}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async getCustomer(apiKey: string, customerId?: string) {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    const url = `https://api.stripe.com/v1/customers/${customerId}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async getProduct(apiKey: string, productId?: string) {
    if (!productId) {
      throw new Error('Product ID is required');
    }

    const url = `https://api.stripe.com/v1/products/${productId}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async updateCustomer(apiKey: string, customerId?: string, email?: string, name?: string) {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    const url = `https://api.stripe.com/v1/customers/${customerId}`;
    
    const payload: any = {};
    if (email) payload.email = email;
    if (name) payload.name = name;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async cancelSubscription(apiKey: string, subscriptionId?: string) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }

    const url = `https://api.stripe.com/v1/subscriptions/${subscriptionId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({})
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private getStripeUrl(operation: string, id: string): string {
    const baseUrl = 'https://dashboard.stripe.com';
    
    switch (operation) {
      case 'createCustomer':
      case 'getCustomer':
      case 'updateCustomer':
        return `${baseUrl}/customers/${id}`;
      case 'createProduct':
      case 'getProduct':
        return `${baseUrl}/products/${id}`;
      case 'createSubscription':
      case 'cancelSubscription':
        return `${baseUrl}/subscriptions/${id}`;
      case 'createPaymentIntent':
        return `${baseUrl}/payments/${id}`;
      case 'createInvoice':
        return `${baseUrl}/invoices/${id}`;
      default:
        return baseUrl;
    }
  }}


export default StripeNode;