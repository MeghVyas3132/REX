/**
 * n8n-compatible type definitions
 * Based on n8n-workflow package interfaces
 */

// Node Connection Types
export type NodeConnectionType = 'main' | 'ai_languageModel' | 'ai_memory' | 'ai_outputParser' | 'ai_tool';

// Trigger Time
export interface TriggerTime {
	mode: 'everyMinute' | 'everyHour' | 'everyDay' | 'everyWeek' | 'everyMonth' | 'cron';
	cronExpression?: string;
	hour?: number;
	minute?: number;
	dayOfWeek?: number;
	dayOfMonth?: number;
}

// Node Group Types
export type NodeGroupType = 'input' | 'output' | 'organization' | 'schedule' | 'transform' | 'trigger';

// Icon Types
export type Icon = string | { light: string; dark: string };
export type ThemeIconColor = 'light-blue' | 'light-green' | 'light-yellow' | 'light-red' | 'light-orange' | 'light-purple' | 'light-gray' | 'dark-blue' | 'dark-green' | 'dark-yellow' | 'dark-red' | 'dark-orange' | 'dark-purple' | 'dark-gray';
export type Themed<T> = T | { light: T; dark: T };

// Node Property Types
export type NodePropertyTypes =
	| 'string'
	| 'number'
	| 'boolean'
	| 'options'
	| 'multiOptions'
	| 'collection'
	| 'fixedCollection'
	| 'notice'
	| 'json'
	| 'color'
	| 'filter'
	| 'dateTime'
	| 'resourceLocator'
	| 'credentials'
	| 'credentialsSelect'
	| 'array'
	| 'object'
	| 'markdown'
	| 'hidden'
	| 'button'
	| 'callout'
	| 'curlImport'
	| 'resourceMapper'
	| 'assignmentCollection'
	| 'workflowSelector';

// Display Options
export interface IDisplayOptions {
	show?: {
		[key: string]: any[] | string | number | boolean | { _cnd?: { gte?: number; lt?: number; lte?: number; gt?: number } };
	};
	hide?: {
		[key: string]: any[] | string | number | boolean;
	};
}

// Type Options for different property types
export interface INodePropertyTypeOptions {
	// For options/multiOptions
	options?: INodePropertyOptions[];
	loadOptionsMethod?: string;
	loadOptionsDependsOn?: string[];
	loadOptions?: {
		routing?: {
			operations?: any;
			output?: any;
			request?: any;
		};
	};
	
	// For collection
	multipleValues?: boolean;
	multipleValueButtonText?: string;
	sortable?: boolean;
	
	// For fixedCollection
	minRequiredFields?: number;
	maxAllowedFields?: number;
	
	// For filter
	filter?: {
		caseSensitive?: boolean | string;
		typeValidation?: 'strict' | 'loose' | string;
		version?: number | string | {};
		leftValue?: string;
		allowedCombinators?: ('and' | 'or')[];
		maxConditions?: number;
	};
	
	// For resourceLocator
	resourceLocator?: {
		loadOptionsMethod?: string;
		supportAutoMap?: boolean;
	};
	
	// For resourceMapper
	resourceMapper?: {
		mode?: 'add' | 'update' | 'upsert' | 'map';
		resourceMapperMethod?: string;
		localResourceMapperMethod?: string;
		supportAutoMap?: boolean;
		[key: string]: any;
	};
	
	// For assignment
	assignment?: {
		hideType?: boolean;
		defaultType?: string;
		disableType?: boolean;
	};
	
	// For dateTime
	dateTime?: {
		dateFormat?: string;
		timeFormat?: string;
	};
	
	// For number
	minValue?: number;
	maxValue?: number;
	numberPrecision?: number;
	
	// For string
	password?: boolean;
	rows?: number;
	editor?: 'codeNodeEditor' | 'jsEditor' | 'htmlEditor' | 'sqlEditor' | 'cssEditor';
	editorLanguage?: 'javaScript' | 'python' | 'json' | string;
	editorIsReadOnly?: boolean;
	codeAutocomplete?: 'function' | 'functionItem';
	sqlDialect?: string;
	
	// For json
	alwaysOpenEditWindow?: boolean;
	
	// For color
	showAlpha?: boolean;
	
	// For button
	buttonConfig?: {
		action?: string | any;
		label?: string;
		hasInputField?: boolean;
		inputFieldMaxLength?: number;
	};
	
	// For notice/callout
	containerClass?: string;
	calloutAction?: any;
	
	// For hidden (credentials)
	expirable?: boolean;
	
	// Binary data
	binaryDataProperty?: boolean;
	
	[key: string]: any;
}

// Node Property Options
export interface INodePropertyOptions {
	name: string;
	value: string | number;
	description?: string;
	action?: string;
	icon?: string;
	displayName?: string; // For compatibility with n8n
}

// Node Properties
export interface INodeProperties {
	displayName: string;
	name: string;
	type: NodePropertyTypes;
	default?: any;
	description?: string;
	placeholder?: string;
	required?: boolean;
	noDataExpression?: boolean;
	validateType?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'json';
	hint?: string;
	displayOptions?: IDisplayOptions;
	typeOptions?: INodePropertyTypeOptions;
	options?: INodePropertyOptions[] | INodeProperties[] | Array<{ name: string; displayName?: string; values: INodeProperties[] }>; // For options/multiOptions, collection, or fixedCollection
	values?: INodeProperties[]; // For fixedCollection when used in options
	isNodeSetting?: boolean;
	credentialTypes?: string[]; // For credentialsSelect type
}

// Node Credential Description
export interface INodeCredentialDescription {
	name: string;
	required?: boolean;
	testedBy?: string;
	displayOptions?: IDisplayOptions;
}

// Node Defaults
export interface INodeDefaults {
	name: string;
	color?: string;
}

// Node Type Base Description
export interface INodeTypeBaseDescription {
	displayName: string;
	name: string;
	icon?: Icon;
	iconColor?: ThemeIconColor;
	iconUrl?: Themed<string>;
	iconBasePath?: string;
	badgeIconUrl?: Themed<string>;
	group: NodeGroupType[];
	description: string;
	documentationUrl?: string;
	subtitle?: string;
	defaultVersion?: number;
	parameterPane?: 'wide';
	hidden?: boolean;
	usableAsTool?: boolean | {
		replacements?: {
			codex?: {
				subcategories?: {
					[key: string]: string[];
				};
			};
		};
	};
}

// Node Type Description
export interface INodeTypeDescription extends INodeTypeBaseDescription {
	version: number | number[];
	defaults: INodeDefaults;
	eventTriggerDescription?: string;
	activationMessage?: string;
	inputs: NodeConnectionType[] | string; // Can be expression
	requiredInputs?: string | number[] | number;
	inputNames?: string[];
	outputs: NodeConnectionType[] | string; // Can be expression
	outputNames?: string[];
	properties: INodeProperties[];
	credentials?: Array<{
		name: string;
		required?: boolean;
		testedBy?: string;
		displayName?: string;
		displayOptions?: IDisplayOptions;
	}>;
	maxNodes?: number;
	polling?: boolean;
	supportsCORS?: boolean;
	requestDefaults?: {
		returnFullResponse?: boolean;
		baseURL?: string;
		headers?: Record<string, string>;
	};
	hooks?: {
		[key: string]: any[];
		activate?: any[];
		deactivate?: any[];
	};
	webhooks?: IWebhookDescription[];
	translation?: { [key: string]: object };
	mockManualExecution?: boolean;
	triggerPanel?: {
		header?: string;
		executionsHelp?: {
			inactive?: string;
			active?: string;
		};
		activationHint?: string;
	} | boolean;
	extendsCredential?: string;
}

// Webhook Description
export interface IWebhookDescription {
	name: string;
	httpMethod: string | string[];
	path: string;
	responseMode?: string;
	responseCode?: number;
	responseData?: string;
	responseBinaryPropertyName?: string;
	responseModeStreaming?: boolean;
	authentication?: string;
	options?: {
		[key: string]: any;
	};
}

// Node Methods
export interface INodeMethods {
	loadOptions?: {
		[key: string]: (this: ILoadOptionsFunctions) => Promise<INodePropertyOptions[]>;
	};
	listSearch?: {
		[key: string]: (
			this: ILoadOptionsFunctions,
			filter?: string,
			paginationToken?: string,
		) => Promise<INodeListSearchResult>;
	};
	credentialTest?: {
		[key: string]: (this: ICredentialTestFunctions, credential: any) => Promise<INodeCredentialTestResult>;
	};
	resourceMapping?: {
		[key: string]: (this: ILoadOptionsFunctions) => Promise<any>;
	};
}

// Load Options Functions
export interface ILoadOptionsFunctions {
	getNodeParameter(parameterName: string, itemIndex?: number, fallbackValue?: any): any;
	getCredentials(type: string, itemIndex?: number): Promise<any>;
	getCurrentNodeParameter(parameterName: string): any;
	getCurrentNodeParameters(): any;
	getWorkflowStaticData(type: string): any;
	getWorkflow(): any;
	getNode(): any;
	logger: any;
	helpers: {
		httpRequest: (options: any) => Promise<any>;
		request?: (uriOrObject: string | any, options?: any) => Promise<any>;
	};
}

// Credential Test Functions
export interface ICredentialTestFunctions {
	logger: any;
	helpers: {
		request: (uriOrObject: string | any, options?: any) => Promise<any>;
	};
}

// Node List Search Result
export interface INodeListSearchResult {
	results: INodePropertyOptions[];
	paginationToken?: string;
}

// Node Credential Test Result
export interface INodeCredentialTestResult {
	status: 'OK' | 'Error';
	message?: string;
}

// Node Type Interface
export interface INodeType {
	description: INodeTypeDescription;
	methods?: INodeMethods;
	execute?(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
	trigger?(this: ITriggerFunctions): Promise<ITriggerResponse>;
	webhook?(this: IWebhookFunctions): Promise<IWebhookResponseData>;
	poll?(this: IPollFunctions): Promise<INodeExecutionData[][] | null>;
	supplyData?(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData>;
	onMessage?(context: IExecuteFunctions, data: INodeExecutionData): Promise<INodeExecutionData[][]>;
}

// Versioned Node Type Interface
export interface IVersionedNodeType {
	nodeVersions: {
		[key: number]: INodeType;
	};
	currentVersion: number;
	description: INodeTypeBaseDescription;
	getNodeType: (version?: number) => INodeType;
}

// Versioned Node Type Class
export class VersionedNodeType implements IVersionedNodeType {
	currentVersion: number;
	nodeVersions: IVersionedNodeType['nodeVersions'];
	description: INodeTypeBaseDescription;

	constructor(
		nodeVersions: IVersionedNodeType['nodeVersions'],
		description: INodeTypeBaseDescription,
	) {
		this.nodeVersions = nodeVersions;
		this.currentVersion = description.defaultVersion ?? this.getLatestVersion();
		this.description = description;
	}

	getLatestVersion(): number {
		return Math.max(...Object.keys(this.nodeVersions).map(Number));
	}

	getNodeType(version?: number): INodeType {
		if (version) {
			return this.nodeVersions[version];
		} else {
			return this.nodeVersions[this.currentVersion];
		}
	}
}

// Node Execution Data
export interface INodeExecutionData {
	json: IDataObject;
	binary?: {
		[key: string]: IBinaryData;
	};
	pairedItem?: {
		item: number;
		input?: number;
	};
	index?: number;
}

// Data Object
export interface IDataObject {
	[key: string]: any;
}

// Binary Data
export interface IBinaryData {
	data: string;
	mimeType: string;
	fileName?: string;
	fileType?: 'text' | 'json' | 'image' | 'audio' | 'video' | 'pdf' | 'html';
	fileExtension?: string;
	fileSize?: string;
	id?: string;
}

// Execute Functions (simplified)
export interface IExecuteFunctions {
	getNodeParameter(parameterName: string, itemIndex: number, fallbackValue?: any, options?: any): any;
	getInputData(inputIndex?: number, connectionType?: NodeConnectionType): INodeExecutionData[];
	getNode(): INode;
	getWorkflow(): any;
	getCredentials(type: string, itemIndex?: number): Promise<any>;
	continueOnFail(): boolean;
	evaluateExpression(expression: string, itemIndex: number): any;
	getMode(): 'manual' | 'trigger' | 'webhook';
	helpers: {
		httpRequest: (options: any) => Promise<any>;
		returnJsonArray: (data: any) => INodeExecutionData[];
		[key: string]: any;
	};
	logger: any;
	sendMessageToUI?(message: any): void;
	sendResponse?(response: any): void;
}

// Trigger Functions
export interface ITriggerFunctions {
	getNodeParameter(parameterName: string, itemIndex?: number, fallbackValue?: any): any;
	getNode(): INode;
	getWorkflow(): any;
	emit(data: INodeExecutionData[][]): void; // Changed to match n8n signature
	helpers: {
		registerCron: (cron: any, callback: () => void) => void;
		returnJsonArray: (data: any) => INodeExecutionData[];
		[key: string]: any;
	};
	logger: any;
}

// Webhook Functions
export interface IWebhookFunctions {
	getNodeParameter(parameterName: string, itemIndex?: number, fallbackValue?: any): any;
	getNode(): INode;
	getWorkflow(): any;
	getWebhookName(): string;
	getRequestObject(): any;
	getResponseObject(): any;
	helpers: {
		[key: string]: any;
	};
	logger: any;
}

// Poll Functions
export interface IPollFunctions {
	getNodeParameter(parameterName: string, itemIndex?: number, fallbackValue?: any): any;
	getNode(): INode;
	getWorkflow(): any;
	helpers: {
		[key: string]: any;
	};
	logger: any;
}

// Supply Data Functions
export interface ISupplyDataFunctions {
	getNodeParameter(parameterName: string, itemIndex?: number, fallbackValue?: any): any;
	getNode(): INode;
	getWorkflow(): any;
	helpers: {
		[key: string]: any;
	};
	logger: any;
}

// Trigger Response
export interface ITriggerResponse {
	manualTriggerFunction?: () => Promise<void>;
	closeFunction?: () => Promise<void>;
}

// Webhook Response Data
export interface IWebhookResponseData {
	workflowData?: INodeExecutionData[][];
	responseData?: {
		responseCode?: number;
		responseData?: any;
		responseHeaders?: Record<string, string>;
	};
	closeFunction?: () => Promise<void>;
	noWebhookResponse?: boolean; // For cases where response is handled manually
}

// Supply Data
export interface SupplyData {
	[key: string]: any;
}

// Node Interface
export interface INode {
	id: string;
	name: string;
	type: string;
	typeVersion?: number;
	position: [number, number];
	parameters: IDataObject;
	credentials?: {
		[key: string]: {
			id: string;
			name: string;
		};
	};
	disabled?: boolean;
	notes?: string;
	notesInFlow?: boolean;
	webhookId?: string;
	continueOnFail?: boolean;
	alwaysOutputData?: boolean;
	executeOnce?: boolean;
	retryOnFail?: boolean;
	maxTries?: number;
	waitBetweenTries?: number;
	[key: string]: any;
}

// Credential Type Interfaces
export interface ICredentialType {
	name: string;
	displayName: string;
	icon?: Icon;
	iconColor?: ThemeIconColor;
	properties: INodeProperties[];
	documentationUrl?: string;
	authenticate?: IAuthenticate;
	preAuthentication?: (this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) => Promise<IDataObject>;
	test?: ICredentialTestRequest | ((this: ICredentialTestFunctions, credentials: ICredentialDataDecryptedObject) => Promise<INodeCredentialTestResult>);
	genericAuth?: boolean;
	supportedNodes?: string[];
}

export interface IAuthenticate {
	type: 'basicAuth' | 'bearerToken' | 'headerAuth' | 'queryAuth' | 'custom';
	properties: {
		name: string;
		value: string;
		property?: string;
	}[];
}

export interface IHttpRequestHelper {
	request(options: any): Promise<any>;
	httpRequest(options: any): Promise<any>;
}

export interface ICredentialDataDecryptedObject {
	[key: string]: any;
}

export interface ICredentialsEncrypted {
	id?: string;
	name: string;
	type: string;
	data: string; // Encrypted JSON string
}

export interface ICredentialTestRequest {
	request: {
		method?: string;
		url: string;
		headers?: Record<string, string>;
		body?: any;
		qs?: Record<string, string>;
		auth?: {
			username: string;
			password: string;
		};
	};
	rules?: Array<{
		type: 'responseCode' | 'responseBody' | 'responseHeaders';
		properties: {
			value?: any;
			message?: string;
		};
	}>;
}

// Node Connection Types constant
export const NodeConnectionTypes = {
	Main: 'main' as NodeConnectionType,
	AiLanguageModel: 'ai_languageModel' as NodeConnectionType,
	AiMemory: 'ai_memory' as NodeConnectionType,
	AiOutputParser: 'ai_outputParser' as NodeConnectionType,
	AiTool: 'ai_tool' as NodeConnectionType,
};

