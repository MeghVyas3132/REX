import { WorkflowNode, ExecutionContext, ExecutionResult } from '../utils/types';

// ==================== AGENT NODES ====================
import { DecisionNode } from './agent/decision.node';
import { ReasoningNode } from './agent/reasoning.node';
import { ContextNode } from './agent/context.node';
import { GoalNode } from './agent/goal.node';
import { StateNode } from './agent/state.node';

// ==================== AI NODES ====================
import { DataAnalyzerNode } from './ai/data-analyzer.node';
import { TextAnalyzerNode } from './ai/text-analyzer.node';
import { ImageGeneratorNode } from './ai/image-generator.node';
import { EmailAnalyzerNode } from './ai/email-analyzer.node';
import { AudioProcessorNode } from './ai/audio-processor.node';
// Removed CodeGeneratorNode
import { DocumentProcessorNode } from './ai/document-processor.node';
import { HuggingFaceNode } from './ai/huggingface.node';
import { VectorSearchNode } from './ai/vector-search.node';
import { SpeechToTextNode } from './ai/speech-to-text.node';
import { TextToSpeechNode } from './ai/text-to-speech.node';
import { MemoryNode } from '../core/memory/memory-node';

// ==================== CLOUD NODES ====================
import { AWSS3Node } from './cloud/aws-s3.node';
import { AWSS3RealNode } from './cloud/aws-s3-real.node';
import { AWSLambdaNode } from './cloud/aws-lambda.node';
import { AWSLambdaRealNode } from './cloud/aws-lambda-real.node';
import { AzureBlobNode } from './cloud/azure-blob.node';
import { AzureBlobRealNode } from './cloud/azure-blob-real.node';
import { CloudWatchNode } from './cloud/cloudwatch.node';
import { DockerNode } from './cloud/docker.node';
import { DockerRealNode } from './cloud/docker-real.node';
import { GoogleCloudStorageNode } from './cloud/google-cloud-storage.node';
import { GoogleCloudStorageRealNode } from './cloud/google-cloud-storage-real.node';
// Removed TerraformNode

// ==================== COMMUNICATION NODES ====================
import { SlackNode } from './communication/slack.node';
import { DiscordNode } from './communication/discord.node';
import { EmailNode } from './communication/email.node';
import { TelegramNode } from './communication/telegram.node';
// WhatsApp node is auto-loaded from subdirectory, skip manual registration
// import WhatsAppNodeModule from './communication/whatsapp/whatsapp.node';
import { MicrosoftTeamsNode } from './communication/microsoft-teams.node';
import { ZoomNode } from './communication/zoom.node';
// Removed WeChatNode
import { InstagramNode } from './communication/instagram.node';
import { TwitterDMNode } from './communication/twitter-dm.node';
import { LinkedInMessageNode } from './communication/linkedin-message.node';

// ==================== CORE NODES ====================
import { CodeNode } from './core/code.node';
import { SignatureValidationNode } from './core/signature-validation.node';
import { AuditLogNode } from './core/audit-log.node';
import { WebhookTriggerNode } from './core/webhook-trigger.node';
import { HttpRequestNode } from './core/http-request.node';
import { SchedulerNode } from './core/scheduler.node';
import { DateTimeNode } from './core/date-time.node';
// Removed JsonTransformNode
// Removed DelayNode

// ==================== DATA NODES ====================
import { DatabaseNode } from './data/database.node';
// Removed CsvNode, JsonNode
import { PostgreSQLNode } from './data/postgresql.node';
import { PostgreSQLRealNode } from './data/postgresql-real.node';
import { MySQLNode } from './data/mysql.node';
import { MySQLRealNode } from './data/mysql-real.node';
import { MongoDBRealNode } from './data/mongodb-real.node';
import { RedisNode } from './data/redis.node';

// ==================== DEVELOPMENT NODES ====================
import { GitHubNode } from './development/github.node';
import { WebhookCallNode } from './development/webhook-call.node';
// Removed GraphQLNode
import { RestApiNode } from './development/rest-api.node';
// Removed SoapNode

// ==================== FILE PROCESSING NODES ====================
// Note: Some file processing nodes may need export added to their classes
import { DataCleaningNode } from './file-processing/data-cleaning.node';
import { DataTransformationNode } from './file-processing/data-transformation.node';
import { FileExportNode } from './file-processing/file-export.node';
import { FileUploadNode } from './file-processing/file-upload.node';
// Removed QualityAssuranceNode

// ==================== FINANCE NODES ====================
import { StripeNode } from './finance/stripe.node';

// ==================== INTEGRATIONS NODES ====================
import { GoogleDriveNode } from './integrations/google-drive.node';
import { GoogleDriveRealNode } from './integrations/google-drive-real.node';
import { OneDriveNode } from './integrations/onedrive.node';
import { GmailNode } from './integrations/gmail.node';
// Removed EmailNode (IntegrationEmailNode)
import { SlackNode as IntegrationSlackNode } from './integrations/slack.node';
import { DiscordNode as IntegrationDiscordNode } from './integrations/discord.node';

// ==================== ANALYTICS NODES ====================
import { GoogleAnalyticsNode } from './analytics/google-analytics.node';
import { SegmentNode } from './analytics/segment.node';
import { AnalyticsNode } from './analytics/analytics.node';

// ==================== LLM NODES ====================
import { OpenAINode } from './llm/openai.node';
// Removed Anthropic/Claude nodes
import { GeminiNode } from './llm/gemini.node';
import { GeminiRealNode } from './llm/gemini-real.node';
import { OpenRouterNode } from './llm/openrouter.node';

// ==================== LOGIC NODES ====================
import { ConditionNode } from './logic/condition.node';

// ==================== PRODUCTIVITY NODES ====================
import { ExcelNode } from './productivity/excel.node';
import { GoogleSheetsNode } from './productivity/google-sheets.node';
import { GoogleFormsNode } from './productivity/google-forms.node';

// ==================== TRIGGERS NODES ====================
import { ScheduleNode } from './triggers/schedule.node';
import { EmailTriggerNode } from './triggers/email-trigger.node';
import { GmailTriggerNode } from './triggers/gmail-trigger.node';
// Removed FileWatchNode
import { FileTriggerNode } from './triggers/file-trigger.node';
import { DatabaseTriggerNode } from './triggers/database-trigger.node';
import { ManualTriggerNode } from './triggers/manual-trigger.node';
import { ErrorTriggerNode } from './triggers/error-trigger.node';

// ==================== UTILITIES NODES ====================
import { LoggerNode } from './utility/logger.node';
import { DataConverterNode } from './utility/data-converter.node';
// Removed: CryptoNode, XmlParserNode, HashNode
// Removed UrlParserNode
import { ImageResizeNode } from './utility/image-resize.node';
import { ConditionalNode } from './utilities/conditional.node';
// Removed DataTransformNode

export interface NodeDefinition {
  id: string;
  type: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  parameters?: any[];
  inputs?: any[];
  outputs?: any[];
  configSchema?: any;
  inputSchema?: any;
  outputSchema?: any;
}

export interface NodeExecutor {
  getNodeDefinition(): NodeDefinition;
  execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult>;
}

export class NodeRegistry {
  private static instance: NodeRegistry;
  private nodes: Map<string, NodeExecutor> = new Map();
  private definitions: Map<string, NodeDefinition> = new Map();

  private constructor() {
    this.registerAllNodes();
  }

  public static getInstance(): NodeRegistry {
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry();
    }
    return NodeRegistry.instance;
  }

  private registerAllNodes() {
    // ==================== AGENT NODES ====================
    this.registerNode(new DecisionNode());
    this.registerNode(new ReasoningNode());
    this.registerNode(new ContextNode());
    this.registerNode(new GoalNode());
    this.registerNode(new StateNode());

    // ==================== AI NODES ====================
    this.registerNode(new DataAnalyzerNode());
    this.registerNode(new TextAnalyzerNode());
    this.registerNode(new ImageGeneratorNode());
    this.registerNode(new EmailAnalyzerNode());
    this.registerNode(new AudioProcessorNode());
    // removed CodeGenerator node
    this.registerNode(new DocumentProcessorNode());
    this.registerNode(new HuggingFaceNode());
    this.registerNode(new VectorSearchNode());
    this.registerNode(new SpeechToTextNode());
    this.registerNode(new TextToSpeechNode());
    this.registerNode(new MemoryNode()); // Register memory node (id: 'memory')

    // ==================== CLOUD NODES ====================
    this.registerNode(new AWSS3Node());
    this.registerNode(new AWSS3RealNode());
    this.registerNode(new AWSLambdaNode());
    this.registerNode(new AWSLambdaRealNode());
    this.registerNode(new AzureBlobNode());
    this.registerNode(new AzureBlobRealNode());
    this.registerNode(new CloudWatchNode());
    this.registerNode(new DockerNode());
    this.registerNode(new DockerRealNode());
    this.registerNode(new GoogleCloudStorageNode());
    this.registerNode(new GoogleCloudStorageRealNode());
    // removed Terraform node

    // ==================== COMMUNICATION NODES ====================
    this.registerNode(new SlackNode());
    this.registerNode(new DiscordNode());
    this.registerNode(new EmailNode());
    this.registerNode(new TelegramNode());
    // WhatsApp node is auto-loaded from whatsapp/whatsapp.node.ts subdirectory
    // this.registerNode(new WhatsAppNode());
    this.registerNode(new MicrosoftTeamsNode());
    this.registerNode(new ZoomNode());
    // removed WeChat node
    this.registerNode(new InstagramNode());
    this.registerNode(new TwitterDMNode());
    this.registerNode(new LinkedInMessageNode());

    // ==================== CORE NODES ====================
    this.registerNode(new CodeNode());
    this.registerNode(new SignatureValidationNode());
    this.registerNode(new AuditLogNode());
    this.registerNode(new WebhookTriggerNode());
    this.registerNode(new HttpRequestNode());
    this.registerNode(new SchedulerNode());
    this.registerNode(new DateTimeNode());
    // Removed JsonTransform node
    // Removed DelayNode

    // ==================== DATA NODES ====================
    this.registerNode(new DatabaseNode());
    this.registerNode(new PostgreSQLNode());
    this.registerNode(new PostgreSQLRealNode());
    this.registerNode(new MySQLNode());
    this.registerNode(new MySQLRealNode());
    this.registerNode(new MongoDBRealNode());
    this.registerNode(new RedisNode());

    // ==================== DEVELOPMENT NODES ====================
    this.registerNode(new GitHubNode());
    this.registerNode(new WebhookCallNode());
    // removed GraphQL node
    this.registerNode(new RestApiNode());
    // removed Soap node

    // ==================== FILE PROCESSING NODES ====================
    this.registerNode(new DataCleaningNode());
    this.registerNode(new DataTransformationNode());
    this.registerNode(new FileExportNode());
    this.registerNode(new FileUploadNode());
    // removed Quality Assurance node

    // ==================== FINANCE NODES ====================
    this.registerNode(new StripeNode());

    // ==================== INTEGRATIONS NODES ====================
    this.registerNode(new GoogleDriveNode());
    this.registerNode(new GoogleDriveRealNode());
    this.registerNode(new OneDriveNode());
    this.registerNode(new GmailNode());
    // removed Email node (IntegrationEmailNode)
    this.registerNode(new IntegrationSlackNode());
    this.registerNode(new IntegrationDiscordNode());

    // ==================== ANALYTICS NODES ====================
    this.registerNode(new GoogleAnalyticsNode());
    this.registerNode(new SegmentNode());
    this.registerNode(new AnalyticsNode());

    // ==================== LLM NODES ====================
    this.registerNode(new OpenAINode());
    // removed Anthropic/Claude nodes
    this.registerNode(new GeminiNode());
    this.registerNode(new GeminiRealNode());
    this.registerNode(new OpenRouterNode());

    // ==================== LOGIC NODES ====================
    this.registerNode(new ConditionNode());

    // ==================== PRODUCTIVITY NODES ====================
    this.registerNode(new ExcelNode());
    this.registerNode(new GoogleSheetsNode());
    this.registerNode(new GoogleFormsNode());

    // ==================== TRIGGERS NODES ====================
    this.registerNode(new ManualTriggerNode());
    this.registerNode(new ScheduleNode());
    this.registerNode(new EmailTriggerNode());
    // removed FileWatchNode
    this.registerNode(new FileTriggerNode());
    this.registerNode(new DatabaseTriggerNode());
    this.registerNode(new ErrorTriggerNode());
    this.registerNode(new GmailTriggerNode());

    // ==================== UTILITIES NODES ====================
    this.registerNode(new LoggerNode());
    this.registerNode(new DataConverterNode());
    // Removed utility nodes: crypto, xml-parser, hash
    // removed Url Parser node
    this.registerNode(new ImageResizeNode());
    this.registerNode(new ConditionalNode());
    // removed Data Transform node
    // Removed utility switch node
  }

  private registerNode(nodeExecutor: NodeExecutor) {
    const definition = nodeExecutor.getNodeDefinition();
    this.nodes.set(definition.id, nodeExecutor);
    this.definitions.set(definition.id, definition);
  }

  public getNodeExecutor(nodeId: string): NodeExecutor | undefined {
    return this.nodes.get(nodeId);
  }

  public getNodeDefinition(nodeId: string): NodeDefinition | undefined {
    return this.definitions.get(nodeId);
  }

  public getAllNodeDefinitions(): NodeDefinition[] {
    return Array.from(this.definitions.values());
  }

  public getNodesByCategory(category: string): NodeDefinition[] {
    return Array.from(this.definitions.values()).filter(node => node.category === category);
  }

  public getCategories(): string[] {
    const categories = new Set(Array.from(this.definitions.values()).map(node => node.category));
    return Array.from(categories).sort();
  }

  public async executeNode(nodeId: string, node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const executor = this.getNodeExecutor(nodeId);
    if (!executor) {
      throw new Error(`Node executor not found for node ID: ${nodeId}`);
    }

    return await executor.execute(node, context);
  }

  public validateNodeConfig(nodeId: string, config: any): { valid: boolean; errors: string[] } {
    const definition = this.getNodeDefinition(nodeId);
    if (!definition) {
      return { valid: false, errors: [`Node definition not found for ID: ${nodeId}`] };
    }

    const errors: string[] = [];

    // Validate required parameters
    if (definition.parameters) {
      for (const param of definition.parameters) {
        if (param.required && (!config[param.name] || config[param.name] === '')) {
          errors.push(`Required parameter '${param.name}' is missing`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  public getNodeCapabilities(nodeId: string): any {
    const definition = this.getNodeDefinition(nodeId);
    if (!definition) {
      return { actions: true };
    }

    const capabilities: Record<string, any> = {
      'webhook': { triggers: true, http: true },
      'schedule': { triggers: true, cron: true },
      'http-request': { actions: true, http: true },
      'slack': { actions: true, messaging: true },
      'discord': { actions: true, messaging: true },
      'send-email': { actions: true, messaging: true },
      'openai': { actions: true, ai: true },
      'claude': { actions: true, ai: true },
      'database': { actions: true, data: true },
      'csv': { actions: true, data: true },
      'aws-s3': { actions: true, cloud: true },
      'google-drive': { actions: true, cloud: true }
    };
    
    return capabilities[nodeId] || { actions: true };
  }

  public getNodeSchema(nodeId: string): any {
    const definition = this.getNodeDefinition(nodeId);
    if (!definition) {
      return null;
    }

    // Convert parameters to schema format
    const properties: any = {};
    const required: string[] = [];

    if (definition.parameters) {
      for (const param of definition.parameters) {
        properties[param.name] = {
          type: param.type,
          description: param.description,
          default: param.default,
          ...(param.options && { enum: param.options.map((opt: any) => opt.value) }),
          ...(param.min !== undefined && { minimum: param.min }),
          ...(param.max !== undefined && { maximum: param.max })
        };

        if (param.required) {
          required.push(param.name);
        }
      }
    }

    return {
      type: 'object',
      properties,
      required,
      additionalProperties: false
    };
  }
}

// Export singleton instance
export const nodeRegistry = NodeRegistry.getInstance();
