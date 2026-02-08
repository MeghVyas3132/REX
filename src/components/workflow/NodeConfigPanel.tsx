import React, { useState, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

// Helper function to validate email addresses (like n8n)
const validateEmail = (email: string, fieldName: string): string | null => {
  if (!email || typeof email !== 'string') {
    return null; // Empty is OK for optional fields
  }
  
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return null; // Empty after trim is OK
  }
  
  // Check for @ symbol (basic validation like n8n)
  if (trimmedEmail.indexOf('@') === -1) {
    return `Invalid email address in '${fieldName}' field: '${trimmedEmail}' is not a valid email address`;
  }
  
  // Additional validation: check for basic email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return `Invalid email address in '${fieldName}' field: '${trimmedEmail}' is not a valid email address`;
  }
  
  return null; // Valid
};

// Helper function to validate multiple email addresses (comma-separated)
const validateEmails = (emails: string, fieldName: string): string | null => {
  if (!emails || typeof emails !== 'string') {
    return null; // Empty is OK for optional fields
  }
  
  const emailList = emails.split(',').map(e => e.trim()).filter(e => e.length > 0);
  
  for (const email of emailList) {
    const error = validateEmail(email, fieldName);
    if (error) {
      return error;
    }
  }
  
  return null; // All valid
};

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { nodeParameterSchemas, type FieldSchema } from './nodeSchemas';
import { executeSingleNode, testSingleNode } from './executor';
import { Play, TestTube, CheckCircle, XCircle, AlertCircle, Eye, EyeOff, ExternalLink, RefreshCw } from 'lucide-react';
import { NodeService } from '@/lib/nodeService';
import { ApiService } from '@/lib/errorService';
import { convertN8nDescriptionToSchema, filterFieldsByDisplayOptions, evaluateDisplayOptions } from './n8n-schema-adapter';
import { CredentialSelector } from './CredentialSelector';
import { API_CONFIG } from '@/lib/config';

const formatOperationValue = (value?: string) => {
  if (!value) return null;
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getOperationDisplayName = (subtype: string | undefined, operation?: string) => {
  if (!operation) return null;
  if (subtype && nodeParameterSchemas[subtype]) {
    const operationField = nodeParameterSchemas[subtype].fields.find(
      (field) => field.key === 'config.operation'
    );
    const matchingOption = operationField?.options?.find((opt) => opt.value === operation);
    if (matchingOption?.label) {
      return matchingOption.label;
    }
  }
  return formatOperationValue(operation);
};

const getBaseLabelForNode = (node: any) => {
  if (!node) return 'Node';
  if (node.data?.baseLabel) {
    return node.data.baseLabel;
  }
  const currentLabel =
    node.data?.label ||
    node.data?.name ||
    node.data?.title ||
    node.data?.subtype ||
    node.type ||
    'Node';
  const separatorIndex = currentLabel.indexOf(' - ');
  return separatorIndex >= 0 ? currentLabel.substring(0, separatorIndex) : currentLabel;
};

interface NodeConfigPanelProps {
  selectedNode: any;
  onClose: () => void;
  onSave: (updatedNode: any) => void;
  onDelete?: (nodeId: string) => void;
  nodes?: any[]; // Optional: array of all nodes for nodeOutput field type
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ 
  selectedNode, 
  onClose, 
  onSave,
  onDelete,
  nodes = [] // Default to empty array if not provided
}) => {
  // Initialize config by merging existing config and credentials (for backward compatibility)
  const initialConfig = { ...(selectedNode?.data?.config || {}) };
  
  // Restore uploadedFile from cache if available (for file-upload nodes)
  if (selectedNode?.data?.subtype === 'file-upload') {
    try {
      const cacheRaw = localStorage.getItem('workflow_node_configs');
      if (cacheRaw) {
        const cache = JSON.parse(cacheRaw);
        if (cache[selectedNode.id]?.uploadedFile && !initialConfig.uploadedFile) {
          initialConfig.uploadedFile = cache[selectedNode.id].uploadedFile;
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
  }
  
  // Normalize saved flat objects into key/value collections expected by some n8n-like UIs
  if ((selectedNode?.data?.subtype || selectedNode?.type) === 'http-request') {
    // Query params: convert object to array format that UI expects
    if (initialConfig.queryParams && typeof initialConfig.queryParams === 'object' && !Array.isArray(initialConfig.queryParams)) {
      const parameters = Object.entries(initialConfig.queryParams).map(([key, value]) => ({ key, value: String(value) }));
      (initialConfig as any).queryParams = parameters.length > 0 ? parameters : [{ key: '', value: '' }];
    } else if (!initialConfig.queryParams || !Array.isArray(initialConfig.queryParams)) {
      // Ensure queryParams is always an array
      (initialConfig as any).queryParams = [{ key: '', value: '' }];
    }
    // Headers: convert object to array format that UI expects (headerList)
    if (initialConfig.headers && typeof initialConfig.headers === 'object' && !Array.isArray(initialConfig.headers)) {
      const headers = Object.entries(initialConfig.headers).map(([key, value]) => ({ key, value: String(value) }));
      (initialConfig as any).headerList = headers.length > 0 ? headers : [{ key: 'Content-Type', value: 'application/json' }];
      delete (initialConfig as any).headers; // Remove old format
    } else if (initialConfig.headerList && Array.isArray(initialConfig.headerList)) {
      // Already in correct format, keep it
    } else {
      // Ensure headerList is always an array
      (initialConfig as any).headerList = [{ key: 'Content-Type', value: 'application/json' }];
    }
    // Body: ensure it's a string if it was saved as an object
    if (initialConfig.body && typeof initialConfig.body === 'object') {
      try {
        (initialConfig as any).body = JSON.stringify(initialConfig.body, null, 2);
      } catch {
        (initialConfig as any).body = String(initialConfig.body);
      }
    }
  }
  if (selectedNode?.data?.credentials) {
    Object.assign(initialConfig, selectedNode.data.credentials);
  }
  const [config, setConfig] = useState(initialConfig);
  const [activeTab, setActiveTab] = useState('config');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showOpenAIApiKey, setShowOpenAIApiKey] = useState(false);
  const [showAnthropicApiKey, setShowAnthropicApiKey] = useState(false);
  const [showGeminiApiKey, setShowGeminiApiKey] = useState(false);
  const subtype = selectedNode?.data?.subtype || '';
  const nodeType = selectedNode?.type || '';
  const isNewNode = Object.keys(selectedNode?.data?.config || {}).length === 0;
  const [testStatus, setTestStatus] = useState<{ ok: boolean; message: string; field?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [n8nSchema, setN8nSchema] = useState<any>(null);
  const [isN8nCompatible, setIsN8nCompatible] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, Array<{ value: string; label: string }>>>({});
  const [loadingOptions, setLoadingOptions] = useState<Record<string, boolean>>({});
  const [gmailOAuthStatus, setGmailOAuthStatus] = useState<{ connected: boolean; loading: boolean }>({ connected: false, loading: false });
  
  const subtypeKey = selectedNode?.data?.subtype as string | undefined;
  const isGmailNode = subtypeKey === 'gmail' || subtypeKey === 'gmail-trigger' || nodeType === 'gmail-trigger';
  // Show OAuth section for Gmail nodes (even if authentication not set yet, so user can connect)
  // But only check connection status when OAuth2 is explicitly selected
  const isOAuth2Selected = config?.authentication === 'oAuth2';
  const shouldShowOAuthSection = isGmailNode && (isOAuth2Selected || !config?.authentication);

  // Track last checked node ID to prevent unnecessary re-checks
  const lastCheckedNodeIdRef = useRef<string | null>(null);
  const lastCheckedAuthRef = useRef<string | null>(null);
  
  // Listen for OAuth success messages from callback page
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        return;
      }
      
      if (event.data?.type === 'oauth_success' && event.data?.provider === 'google') {
        // OAuth connection successful - immediately check status
        if (isGmailNode) {
          // Force a status check
          setGmailOAuthStatus({ connected: false, loading: true });
          
          // Check status after a short delay to allow backend to process
          setTimeout(async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) return;
            
            try {
              const backendUrl = API_CONFIG.baseUrl;
              const response = await fetch(`${backendUrl.replace(/\/$/, '')}/api/auth/oauth/status?provider=google`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token.trim()}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                const data = await response.json();
                const status = data?.status;
                const isConnected = status && typeof status === 'object' && status.connected === true;
                setGmailOAuthStatus({ 
                  connected: isConnected,
                  loading: false 
                });
              }
            } catch (error) {
              logger.error('Failed to check OAuth status after connection', error as Error);
              setGmailOAuthStatus({ connected: false, loading: false });
            }
          }, 2000);
        }
      }
    };
    
    window.addEventListener('message', handleOAuthMessage);
    return () => {
      window.removeEventListener('message', handleOAuthMessage);
    };
  }, [isGmailNode]);

  // Check for OAuth connection flag when node is selected
  useEffect(() => {
    if (isGmailNode) {
      const justConnected = localStorage.getItem('oauth_just_connected');
      const justConnectedTime = localStorage.getItem('oauth_just_connected_time');
      
      // If OAuth was just connected (within last 5 minutes), check status
      if (justConnected === 'true' && justConnectedTime) {
        const timeDiff = Date.now() - parseInt(justConnectedTime, 10);
        if (timeDiff < 5 * 60 * 1000) { // Within 5 minutes
          // Clear the flag
          localStorage.removeItem('oauth_just_connected');
          localStorage.removeItem('oauth_just_connected_time');
          
          // Force status check
          setGmailOAuthStatus({ connected: false, loading: true });
          
          // Check status after a short delay
          setTimeout(async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) {
              setGmailOAuthStatus({ connected: false, loading: false });
              return;
            }
            
            try {
              const backendUrl = API_CONFIG.baseUrl;
              const response = await fetch(`${backendUrl.replace(/\/$/, '')}/api/auth/oauth/status?provider=google`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token.trim()}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                const data = await response.json();
                const status = data?.status;
                const isConnected = status && typeof status === 'object' && status.connected === true;
                setGmailOAuthStatus({ 
                  connected: isConnected,
                  loading: false 
                });
              } else {
                setGmailOAuthStatus({ connected: false, loading: false });
              }
            } catch (error) {
              logger.error('Failed to check OAuth status', error as Error);
              setGmailOAuthStatus({ connected: false, loading: false });
            }
          }, 2000);
        }
      }
    }
  }, [isGmailNode, isOAuth2Selected, selectedNode?.id]);

  // Check Gmail OAuth connection status - always check for Gmail nodes
  useEffect(() => {
    const currentNodeId = selectedNode?.id;
    const currentAuth = config?.authentication || '';
    
    // Reset status when not a Gmail node
    if (!isGmailNode) {
      setGmailOAuthStatus({ connected: false, loading: false });
      lastCheckedNodeIdRef.current = null;
      lastCheckedAuthRef.current = null;
      return;
    }
    
    // Always check connection status for Gmail nodes (even if OAuth2 not selected yet)
    // This allows users to see their connection status regardless of authentication selection
    setGmailOAuthStatus({ connected: false, loading: true });
    
    // Always check status for Gmail nodes
    if (isGmailNode) {
      let isMounted = true;
      let checkInterval: NodeJS.Timeout | null = null;
      let isConnectedRef = false; // Use ref to track connection state
      let hasCheckedOnce = false; // Track if we've done initial check
      
      const checkOAuthStatus = async () => {
        // Don't check if already connected (to prevent fluctuation)
        if (isConnectedRef) {
          return;
        }
        
        try {
          if (isMounted && !hasCheckedOnce) {
            setGmailOAuthStatus(prev => ({ ...prev, loading: true }));
          }
          const token = localStorage.getItem('auth_token');
          if (!token) {
            if (isMounted) {
              setGmailOAuthStatus({ connected: false, loading: false });
              hasCheckedOnce = true;
            }
            return;
          }

          const backendUrl = API_CONFIG.baseUrl;
          const response = await fetch(`${backendUrl.replace(/\/$/, '')}/api/auth/oauth/status?provider=google`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token.trim()}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            
            // Backend returns: { success: true, status: { connected: true/false, ... } }
            // Ensure we're checking the correct structure
            const status = data?.status;
            
            // Explicitly check for false or undefined - only true if explicitly true
            const isConnected = status && typeof status === 'object' && status.connected === true;
            
            isConnectedRef = isConnected; // Update ref
            hasCheckedOnce = true;
            
            if (isMounted) {
              setGmailOAuthStatus({ 
                connected: isConnected,
                loading: false 
              });
              
              // Stop periodic checking if connected
              if (isConnected && checkInterval) {
                clearInterval(checkInterval);
                checkInterval = null;
              }
            }
          } else {
            // If response is not OK, definitely not connected
            hasCheckedOnce = true;
            if (isMounted) {
              setGmailOAuthStatus({ connected: false, loading: false });
            }
          }
        } catch (error) {
          logger.error('Failed to check Gmail OAuth status', error as Error);
          hasCheckedOnce = true;
          if (isMounted) {
            setGmailOAuthStatus({ connected: false, loading: false });
          }
        }
      };

      // Initial check with small delay to prevent rapid re-checks
      const initialCheckTimeout = setTimeout(() => {
        if (isMounted) {
          checkOAuthStatus();
        }
      }, 100);
      
      // Check periodically, but stop once connected
      checkInterval = setInterval(() => {
        if (!isConnectedRef && isMounted && hasCheckedOnce) {
          checkOAuthStatus();
        } else if (isConnectedRef && checkInterval) {
          clearInterval(checkInterval);
          checkInterval = null;
        }
      }, 10000); // Check every 10 seconds (increased from 5 to reduce load)
      
      // Also check when window regains focus (user returns from OAuth tab)
      const handleFocus = () => {
        // Check if OAuth was just connected
        const justConnected = localStorage.getItem('oauth_just_connected');
        if (justConnected === 'true') {
          // Clear flag and check status immediately
          localStorage.removeItem('oauth_just_connected');
          localStorage.removeItem('oauth_just_connected_time');
          if (isMounted) {
            checkOAuthStatus();
          }
        } else if (!isConnectedRef && isMounted && hasCheckedOnce) {
          // Add delay to prevent rapid checks
          setTimeout(() => {
            if (!isConnectedRef && isMounted) {
              checkOAuthStatus();
            }
          }, 2000);
        }
      };
      
      // Check when tab becomes visible
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          // Check if OAuth was just connected
          const justConnected = localStorage.getItem('oauth_just_connected');
          if (justConnected === 'true') {
            // Clear flag and check status immediately
            localStorage.removeItem('oauth_just_connected');
            localStorage.removeItem('oauth_just_connected_time');
            if (isMounted) {
              checkOAuthStatus();
            }
          } else if (!isConnectedRef && isMounted && hasCheckedOnce) {
            // Add delay to prevent rapid checks
            setTimeout(() => {
              if (!isConnectedRef && isMounted) {
                checkOAuthStatus();
              }
            }, 2000);
          }
        }
      };
      
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        isMounted = false;
        clearTimeout(initialCheckTimeout);
        if (checkInterval) {
          clearInterval(checkInterval);
        }
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
    
    // Update refs after check is set up
    lastCheckedNodeIdRef.current = currentNodeId;
    lastCheckedAuthRef.current = currentAuth;
  }, [isGmailNode, isOAuth2Selected, selectedNode?.id, config?.authentication]); // Include config?.authentication to check when OAuth2 is selected

  // Reload config when selectedNode changes (especially important for HTTP Request and other nodes)
  useEffect(() => {
    if (!selectedNode) return;
    
    // Re-initialize config from selectedNode to ensure we have the latest saved data
    const nodeConfig = { ...(selectedNode?.data?.config || {}) };
    
    // Apply the same normalization logic as initialConfig, especially for HTTP Request nodes
    if ((selectedNode?.data?.subtype || selectedNode?.type) === 'http-request') {
      // Query params: convert object to array format that UI expects
      if (nodeConfig.queryParams && typeof nodeConfig.queryParams === 'object' && !Array.isArray(nodeConfig.queryParams)) {
        const parameters = Object.entries(nodeConfig.queryParams).map(([key, value]) => ({ key, value: String(value) }));
        (nodeConfig as any).queryParams = parameters.length > 0 ? parameters : [{ key: '', value: '' }];
      } else if (!nodeConfig.queryParams || !Array.isArray(nodeConfig.queryParams)) {
        (nodeConfig as any).queryParams = [{ key: '', value: '' }];
      }
      // Headers: convert object to array format that UI expects (headerList)
      if (nodeConfig.headers && typeof nodeConfig.headers === 'object' && !Array.isArray(nodeConfig.headers)) {
        const headers = Object.entries(nodeConfig.headers).map(([key, value]) => ({ key, value: String(value) }));
        (nodeConfig as any).headerList = headers.length > 0 ? headers : [{ key: 'Content-Type', value: 'application/json' }];
        delete (nodeConfig as any).headers;
      } else if (nodeConfig.headerList && Array.isArray(nodeConfig.headerList)) {
        // Already in correct format, keep it
      } else {
        (nodeConfig as any).headerList = [{ key: 'Content-Type', value: 'application/json' }];
      }
      // Body: ensure it's a string if it was saved as an object
      if (nodeConfig.body && typeof nodeConfig.body === 'object') {
        try {
          (nodeConfig as any).body = JSON.stringify(nodeConfig.body, null, 2);
        } catch {
          (nodeConfig as any).body = String(nodeConfig.body);
        }
      }
    }
    
    // Merge credentials if present
    if (selectedNode?.data?.credentials) {
      Object.assign(nodeConfig, selectedNode.data.credentials);
    }
    
    setConfig(nodeConfig);
  }, [selectedNode?.id, JSON.stringify(selectedNode?.data?.config)]);

  // If node has empty config, attempt to restore from localStorage cache so fields persist when revisiting
  useEffect(() => {
    try {
      const hasAnyConfig = selectedNode?.data?.config && Object.keys(selectedNode.data.config).length > 0;
      if (hasAnyConfig) return;
      const cacheRaw = localStorage.getItem('workflow_node_configs');
      if (!cacheRaw) return;
      const cache = JSON.parse(cacheRaw);
      const cached = cache?.[selectedNode?.id];
      if (cached && typeof cached === 'object') {
        setConfig({ ...cached });
      }
    } catch {}
  }, [selectedNode]);

  
  // Auto-select config tab for new nodes
  useEffect(() => {
    if (isNewNode) {
      setActiveTab('config');
    }
  }, [selectedNode, isNewNode]);

  // Fetch n8n schema if node is n8n-compatible
  useEffect(() => {
    const fetchN8nSchema = async () => {
      if (!selectedNode) return;
      
      const nodeType = NodeService.getNodeType(selectedNode);
      setLoadingSchema(true);
      
      try {
        const schemaData = await NodeService.getNodeSchema(nodeType);
        if (schemaData?.isN8nCompatible && schemaData?.n8nDescription) {
          setIsN8nCompatible(true);
          const convertedSchema = convertN8nDescriptionToSchema(schemaData.n8nDescription);
          setN8nSchema(convertedSchema);
        } else {
          setIsN8nCompatible(false);
          setN8nSchema(null);
        }
      } catch (error) {
        logger.error('Failed to fetch n8n schema', error as Error);
        setIsN8nCompatible(false);
        setN8nSchema(null);
      } finally {
        setLoadingSchema(false);
      }
    };

    fetchN8nSchema();
  }, [selectedNode]);

  // Load dynamic options when dependencies change
  useEffect(() => {
    const loadDynamicOptions = async () => {
      if (!selectedNode || !isN8nCompatible || !n8nSchema) return;

      const nodeType = NodeService.getNodeType(selectedNode);
      const nodeId = selectedNode.id;
      const currentConfig = { ...config };
      const currentCredentials = selectedNode?.data?.credentials || {};

      // Find all fields with loadOptionsMethod
      const fieldsWithLoadOptions = n8nSchema.fields.filter(
        (field: any) => field.loadOptionsMethod && field.type === 'select'
      );

      for (const field of fieldsWithLoadOptions) {
        // Check if all dependencies are available
        if (field.loadOptionsDependsOn && field.loadOptionsDependsOn.length > 0) {
          const allDependenciesMet = field.loadOptionsDependsOn.every((dep: string) => {
            const depValue = currentConfig[dep] || getNested(selectedNode.data, dep);
            return depValue !== undefined && depValue !== null && depValue !== '';
          });

          if (!allDependenciesMet) {
            // Clear options if dependencies are not met
            setDynamicOptions(prev => ({ ...prev, [field.key]: [] }));
            continue;
          }
        }

        // Load options
        setLoadingOptions(prev => ({ ...prev, [field.key]: true }));
        try {
          const options = await NodeService.loadOptions(
            nodeType,
            nodeId,
            field.loadOptionsMethod,
            currentConfig,
            currentCredentials
          );
          // Convert n8n options format to frontend format
          const convertedOptions = options.map((opt: any) => ({
            value: String(opt.value),
            label: opt.name || String(opt.value)
          }));
          setDynamicOptions(prev => ({ ...prev, [field.key]: convertedOptions }));
        } catch (error) {
          logger.error(`Failed to load options for ${field.key}`, error as Error);
          setDynamicOptions(prev => ({ ...prev, [field.key]: [] }));
        } finally {
          setLoadingOptions(prev => ({ ...prev, [field.key]: false }));
        }
      }
    };

    loadDynamicOptions();
  }, [selectedNode, config, isN8nCompatible, n8nSchema]);
  
  // Helper function to highlight required fields is implemented below at line ~105


  // Function already defined above

  // Check if all required fields are filled based on node type and subtype
  // Returns true if valid, or an array of missing field names if invalid
  const validateRequiredFields = (): true | string[] => {
    const subtypeKey = selectedNode?.data?.subtype as string | undefined;

    // Special validation for file-upload: only require uploadedFile
    if (subtype === 'file-upload') {
      if (!config.uploadedFile || (!config.uploadedFile.text && !config.uploadedFile.base64)) {
        return ['File'];
      }
      return true;
    }

    if (subtype === 'schedule' || subtype === 'schedule-trigger') {
      const options = selectedNode?.data?.options || {};
      const missingScheduleFields: string[] = [];
      if (!options.triggerInterval || options.triggerInterval < 1) {
        missingScheduleFields.push('Trigger Interval');
      }
      if (!options.triggerIntervalUnit) {
        missingScheduleFields.push('Interval Unit');
      }
      if (!options.timezone) {
        missingScheduleFields.push('Timezone');
      }
      return missingScheduleFields.length === 0 ? true : missingScheduleFields;
    }

    // Prefer n8n schema if available
    if (isN8nCompatible && n8nSchema) {
      const missingFields: string[] = [];
      for (const field of n8nSchema.fields) {
        // Only validate required fields that are visible (not hidden by displayOptions)
        const isFieldVisible = !field.displayOptions || evaluateDisplayOptions(field.displayOptions, config);
        if (field.required && isFieldVisible) {
          let value: any;
          if (field.key.startsWith('config.')) {
            const configKey = field.key.substring(7);
            value = config[configKey];
          } else {
            value = getNested(selectedNode.data, field.key);
          }
          if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
            missingFields.push(field.label);
          }
        }
      }
      if (missingFields.length > 0) {
        return missingFields;
      }
    } else {
      // Validate static schema for legacy nodes
      const schema = subtypeKey ? nodeParameterSchemas[subtypeKey] : undefined;
      if (schema) {
        const missingFields: string[] = [];
        for (const field of schema.fields) {
          // Only validate required fields that are visible (not hidden by displayOptions)
          const isFieldVisible = !field.displayOptions || evaluateDisplayOptions(field.displayOptions, config);
          if (field.required && isFieldVisible) {
            let value: any;
            if (field.key.startsWith('config.')) {
              const configKey = field.key.substring(7);
              value = config[configKey];
            } else {
              value = getNested(selectedNode.data, field.key);
            }
            if (!value || (typeof value === 'string' && value.trim() === '')) {
              missingFields.push(field.label);
            }
          }
        }
        if (missingFields.length > 0) {
          return missingFields;
        }
      }
    }

    const missingFields: string[] = [];
    
    if (subtype === 'http-request') {
      if (!config.url) missingFields.push('API URL');
      if (!config.method) missingFields.push('Method');
    } else if (subtype === 'webhook-trigger') {
      // No validation needed - webhook trigger passes through input without configuration
    } else if (subtype === 'email-trigger') {
      if (!config.emailHost) missingFields.push('Email Host');
      if (!config.emailPort) missingFields.push('Email Port');
      if (!config.emailUser) missingFields.push('Email User');
      if (!config.emailPassword) missingFields.push('Email Password');
      if (!config.checkInterval) missingFields.push('Check Interval');
    } else if (subtype === 'form-submit') {
      if (!config.formId) missingFields.push('Form ID');
    } else if (subtype === 'error-trigger') {
      if (!config.workflowId) missingFields.push('Workflow ID');
    } else if (subtype === 'email-send') {
      if (!config.smtpHost) missingFields.push('SMTP Host');
      if (!config.to) missingFields.push('To Email');
      if (!config.subject) missingFields.push('Subject');
    } else if (subtype === 'google-drive') {
      if (!config.operation) missingFields.push('Operation');
    } else if (subtype === 'google-sheets') {
      if (!config.spreadsheetId) missingFields.push('Spreadsheet ID');
      if (!config.range) missingFields.push('Sheet Range');
      if (!config.operation) missingFields.push('Operation');
    } else if (subtype === 'google-forms') {
      if (!config.formId) missingFields.push('Form ID');
      if ((config.operation === 'append' || config.operation === 'update') && !config.data) {
        missingFields.push('Data');
      }
    } else if (subtype === 'openai' || subtype === 'openrouter') {
      if (!config.model) missingFields.push('Model');
      // OpenRouter: userPrompt is optional (can come from previous node like Manual Trigger)
      if (subtype === 'openai') {
        if (!config.userPrompt) missingFields.push('User Prompt');
        if (!config.apiKey) missingFields.push('API Key');
      }
      // OpenRouter: API Key is optional (can come from env), prompt is optional (can come from previous node)
      // No validation needed for openrouter userPrompt or apiKey
    } else if (subtype === 'anthropic' || subtype === 'gemini') {
      if (!config.model) missingFields.push('Model');
      if (!config.userPrompt) missingFields.push('User Prompt');
      if (subtype === 'anthropic' && !config.apiKey) missingFields.push('API Key');
      if (subtype === 'gemini' && !config.apiKey) missingFields.push('API Key');
    }
    
    return missingFields.length === 0 ? true : missingFields;
  };
  
  // Get validation message for the current node configuration
  const getValidationMessage = () => {
    const validationResult = validateRequiredFields();
    if (validationResult === true) return null;
    
    return (
      <div className="bg-amber-50 border border-amber-200 rounded p-3 mt-4">
        <div className="flex items-start gap-2">
          <div className="text-amber-600">⚠️</div>
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Required Fields Missing</p>
            <p className="text-xs">Please fill in the following required fields:</p>
            <ul className="list-disc list-inside text-xs mt-1">
              {validationResult.map((field, index) => (
                <li key={index}>{field}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };
  
  // Helper function to get the CSS class for required field styling
  const getRequiredFieldStatus = (fieldName: string): string => {
    if (!isNewNode) return '';
    
    // Check if this specific field is empty
    const isEmpty = (
      // AI nodes
      (fieldName === 'model' && !config.model) ||
      (fieldName === 'userPrompt' && !config.userPrompt) ||
      
      // HTTP request
      (fieldName === 'url' && !config.url) ||
      (fieldName === 'method' && !config.method) ||
      
      // Google Forms
      (fieldName === 'formId' && !config.formId) ||
      
      // Schedule trigger
      (fieldName === 'triggerInterval' && !config.triggerInterval) ||
      (fieldName === 'cron' && config.triggerInterval === 'custom' && !config.cron) ||
      (fieldName === 'minutes' && config.triggerInterval === 'minutes' && !config.minutes) ||
      
      // Email trigger
      (fieldName === 'emailHost' && !config.emailHost) ||
      (fieldName === 'emailPort' && !config.emailPort) ||
      (fieldName === 'emailUser' && !config.emailUser) ||
      (fieldName === 'emailPassword' && !config.emailPassword) ||
      (fieldName === 'checkInterval' && !config.checkInterval) ||
      
      // Form submit trigger
      (fieldName === 'formId' && !config.formId) ||
      
      // Error trigger
      (fieldName === 'workflowId' && !config.workflowId) ||
      
      // Email send
      (fieldName === 'smtpHost' && !config.smtpHost) ||
      (fieldName === 'to' && !config.to) ||
      (fieldName === 'subject' && !config.subject) ||
      
      // Google integrations
      (fieldName === 'operation' && !config.operation) ||
      (fieldName === 'spreadsheetId' && !config.spreadsheetId) ||
      (fieldName === 'range' && !config.range)
    );
    
    return isEmpty ? 'border-red-500' : '';
  };

  const handleSave = () => {
    const validationResult = validateRequiredFields();
    
    if (validationResult !== true) {
      // Show validation error and switch to config tab
      setActiveTab('config');
      return;
    }
    
    // Normalize config before saving
    const transformedConfig = { ...config };
    
    // Preserve uploadedFile for file-upload nodes (important: don't lose file data)
    if (subtype === 'file-upload' && config.uploadedFile) {
      transformedConfig.uploadedFile = config.uploadedFile;
    }
    
    if (subtype === 'http-request') {
      // Preserve queryParams as array format for UI consistency
      // Filter out empty entries before saving
      if (Array.isArray(transformedConfig.queryParams)) {
        transformedConfig.queryParams = transformedConfig.queryParams.filter((p: any) => 
          p && p.key && p.key.trim().length > 0
        );
        // If all were filtered out, keep at least one empty entry for UI
        if (transformedConfig.queryParams.length === 0) {
          transformedConfig.queryParams = [{ key: '', value: '' }];
        }
      }
      
      // Preserve headerList as array format for UI consistency
      // Filter out empty entries before saving
      if (Array.isArray(transformedConfig.headerList)) {
        transformedConfig.headerList = transformedConfig.headerList.filter((h: any) => 
          h && h.key && h.key.trim().length > 0
        );
        // If all were filtered out, keep default Content-Type header
        if (transformedConfig.headerList.length === 0) {
          transformedConfig.headerList = [{ key: 'Content-Type', value: 'application/json' }];
        }
      }
      
      // Also save as headers object for backend compatibility (but UI will use headerList)
      if (Array.isArray(transformedConfig.headerList)) {
        const headersObj = transformedConfig.headerList.reduce((acc: Record<string, any>, item: any) => {
          if (item && typeof item.key === 'string' && item.key.trim().length > 0) {
            acc[item.key.trim()] = item.value ?? '';
          }
          return acc;
        }, {} as Record<string, any>);
        if (Object.keys(headersObj).length > 0) {
          transformedConfig.headers = headersObj;
        }
      }

      if (typeof transformedConfig.method === 'string') {
        transformedConfig.method = transformedConfig.method.toUpperCase();
      }

      if (typeof transformedConfig.timeout === 'number') {
        transformedConfig.timeout = String(transformedConfig.timeout);
      }

      // For JSON body type, keep as string in config (backend will parse if needed)
      // Don't parse here to preserve user's exact input
      if (transformedConfig.bodyType === 'json' && typeof transformedConfig.body === 'string') {
        // Keep as string - backend can parse it
      }
    }

    // Merge any existing credentials into config before saving
    const mergedConfig = { ...transformedConfig };
    if (selectedNode?.data?.credentials) {
      Object.assign(mergedConfig, selectedNode.data.credentials);
    }
    // Remove credentials from data as they're now in config
    const { credentials: _, ...dataWithoutCredentials } = selectedNode.data;
    const baseLabel = getBaseLabelForNode(selectedNode);
    const operationDisplayName = getOperationDisplayName(
      selectedNode?.data?.subtype as string | undefined,
      mergedConfig.operation
    );
    const updatedLabel = operationDisplayName ? `${baseLabel} - ${operationDisplayName}` : baseLabel;

    const updatedNodeData = {
      ...dataWithoutCredentials,
      config: mergedConfig,
      baseLabel,
      label: updatedLabel,
    };

    // Save to a local cache to ensure values are shown on revisit even before any backend save completes
    // Note: For file-upload nodes with large files, localStorage might fail - that's OK, the workflow save will handle it
    try {
      const cacheRaw = localStorage.getItem('workflow_node_configs');
      const cache = cacheRaw ? JSON.parse(cacheRaw) : {};
      
      // For file-upload nodes, check if file data is too large for localStorage
      if (subtype === 'file-upload' && mergedConfig.uploadedFile) {
        const fileDataSize = JSON.stringify(mergedConfig.uploadedFile).length;
        const maxLocalStorageSize = 4 * 1024 * 1024; // ~4MB safe limit
        if (fileDataSize > maxLocalStorageSize) {
          // Store only metadata in localStorage, not the full file data
          const metadataOnly = {
            ...mergedConfig,
            uploadedFile: {
              name: mergedConfig.uploadedFile.name,
              type: mergedConfig.uploadedFile.type,
              size: mergedConfig.uploadedFile.size,
              // Don't store text/base64 in localStorage for large files
              _largeFile: true
            }
          };
          cache[selectedNode.id] = metadataOnly;
        } else {
          cache[selectedNode.id] = mergedConfig;
        }
      } else {
        cache[selectedNode.id] = mergedConfig;
      }
      
      localStorage.setItem('workflow_node_configs', JSON.stringify(cache));
    } catch (error: any) {
      // localStorage might fail for very large files - that's OK, the workflow save will handle it
      if (subtype === 'file-upload') {
        console.warn('Could not cache file upload config in localStorage (file may be too large):', error.message);
      }
    }
    onSave({ ...selectedNode, data: updatedNodeData });
    onClose();
  };

  // Test single node functionality
  const handleTestNode = async () => {
    if (!selectedNode) return;
    
    try {
      setTesting(true);
      setTestStatus(null);
      setTestResult(null);
      
      const nodeType = NodeService.getNodeType(selectedNode);
      const result = await NodeService.testNode(nodeType, config);
      
      setTestResult(result);
      setTestStatus({ 
        ok: result.status === 'success', 
        message: result.message || 'Test completed' 
      });
    } catch (error: any) {
      setTestStatus({ 
        ok: false, 
        message: error.message || 'Test failed' 
      });
    } finally {
      setTesting(false);
    }
  };

  // Execute single node functionality
  const handleExecuteNode = async () => {
    if (!selectedNode) return;
    
    try {
      setExecuting(true);
      setExecutionResult(null);
      
      const nodeType = NodeService.getNodeType(selectedNode);
      const nodeData = selectedNode.data || {};
      
      // Provide default test input based on node type
      // In workflows, input comes from previous nodes automatically
      let input: any = {};
      if (nodeType === 'fetch-email-data' && config.useGmailApi) {
        // For Gmail API, provide a sample emailId or email address
        input = { emailId: 'test@example.com' }; // Will search for messages from this address
      } else if (nodeType === 'fetch-email-data') {
        // For custom API, provide sample emailId
        input = { emailId: 'sample-email-id' };
      } else {
        input = { test: true };
      }
      
      // Pass options and credentials to ensure schedule nodes and other options work
      const result = await NodeService.executeNode(
        nodeType, 
        config, 
        input, // Use parsed test input
        nodeData.options,
        nodeData.credentials
      );
      
      // Handle result structure from backend
      // NodeExecuteResult has: { nodeType: string; result: any; executionTime: number }
      // The result.result contains the actual ExecutionResult: { success, output, error, duration }
      // On error, the API might return different structure
      
      // Type guard to check if result has the expected structure
      const resultAny = result as any;
      
      // Check if API call itself failed (check for error in result or data)
      if (resultAny && (resultAny.success === false || resultAny.error)) {
        setExecutionResult({
          success: false,
          error: resultAny.error || resultAny.message || 'Node execution failed'
        });
        return;
      }
      
      // Extract ExecutionResult from nested structure
      // NodeExecuteResult.result contains the actual execution result
      let executionResult: any = null;
      if (resultAny && resultAny.result) {
        executionResult = resultAny.result;
      } else if (resultAny && resultAny.data && resultAny.data.result) {
        executionResult = resultAny.data.result;
      } else if (resultAny && resultAny.data) {
        executionResult = resultAny.data;
      } else if (resultAny && resultAny.success !== undefined) {
        executionResult = resultAny;
      } else if (result) {
        // If result is NodeExecuteResult, extract the nested result
        executionResult = (result as any).result || result;
      } else {
        executionResult = result;
      }
      
      // If executionResult has success: false, extract error message
      if (executionResult && executionResult.success === false) {
        const errorMessage = executionResult.error || 
                            executionResult.output?.error ||
                            executionResult.details?.error ||
                            executionResult.message ||
                            'Node execution failed';
        setExecutionResult({
          success: false,
          error: errorMessage,
          output: executionResult.output,
          details: executionResult.details
        });
      } else {
        setExecutionResult(executionResult);
      }
    } catch (error: any) {
      // Extract error message from various possible locations
      const errorMessage = error?.response?.data?.error ||
                          error?.response?.data?.message ||
                          error?.message ||
                          error?.error ||
                          'Execution failed';
      
      setExecutionResult({ 
        success: false, 
        error: errorMessage,
        details: error?.response?.data?.details || error?.details
      });
    } finally {
      setExecuting(false);
    }
  };

  const renderNodeSpecificN8nParameters = () => {
    const nodeSubtype = selectedNode?.data?.subtype;
    
    // Webhook nodes are handled by renderTriggerConfig() - no duplicate configuration here

    // Schedule Trigger specific parameters
    if (nodeSubtype === 'schedule') {
      const options = selectedNode?.data?.options || {};
      const continueOnFail = options.continueOnFail || false;
      const retryOnFail = options.retryOnFail || false;
      
      return (
        <div className="border-t border-border pt-4 mt-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="schedule-interval">Trigger Interval *</Label>
              <Input
                id="schedule-interval"
                type="number"
                value={options.triggerInterval || 1}
                onChange={(e) => {
                  const updatedData = { ...selectedNode.data };
                  if (!updatedData.options) updatedData.options = {};
                  updatedData.options.triggerInterval = parseInt(e.target.value) || 1;
                  onSave({ ...selectedNode, data: updatedData });
                }}
                placeholder="1"
                min="1"
              />
            </div>

            <div>
              <Label htmlFor="schedule-interval-unit">Interval Unit *</Label>
              <Select 
                value={options.triggerIntervalUnit || 'minutes'} 
                onValueChange={(value) => {
                  const updatedData = { ...selectedNode.data };
                  if (!updatedData.options) updatedData.options = {};
                  updatedData.options.triggerIntervalUnit = value;
                  onSave({ ...selectedNode, data: updatedData });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seconds">Seconds</SelectItem>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="schedule-timezone">Timezone *</Label>
              <Select 
                value={options.timezone || 'UTC'} 
                onValueChange={(value) => {
                  const updatedData = { ...selectedNode.data };
                  if (!updatedData.options) updatedData.options = {};
                  updatedData.options.timezone = value;
                  onSave({ ...selectedNode, data: updatedData });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">America/New_York</SelectItem>
                  <SelectItem value="Europe/London">Europe/London</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t border-border">
              <Label className="text-sm font-medium mb-3 block">Failure Handling</Label>
              <RadioGroup
                value={continueOnFail ? 'continue' : retryOnFail ? 'retry' : 'none'}
                onValueChange={(value) => {
                  const updatedData = { ...selectedNode.data };
                  if (!updatedData.options) updatedData.options = {};
                  if (value === 'continue') {
                    updatedData.options.continueOnFail = true;
                    updatedData.options.retryOnFail = false;
                  } else if (value === 'retry') {
                    updatedData.options.continueOnFail = false;
                    updatedData.options.retryOnFail = true;
                  } else {
                    updatedData.options.continueOnFail = false;
                    updatedData.options.retryOnFail = false;
                  }
                  onSave({ ...selectedNode, data: updatedData });
                }}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="continue" id="continue-on-fail" />
                  <Label htmlFor="continue-on-fail" className="cursor-pointer font-normal">
                    Continue on Fail
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="retry" id="retry-on-fail" />
                  <Label htmlFor="retry-on-fail" className="cursor-pointer font-normal">
                    Retry on Fail
                  </Label>
                </div>
              </RadioGroup>

              {retryOnFail && (
                <div className="mt-3">
                  <Label htmlFor="schedule-max-retries">Max Retries</Label>
                  <Input
                    id="schedule-max-retries"
                    type="number"
                    value={options.maxRetries || 3}
                    onChange={(e) => {
                      const updatedData = { ...selectedNode.data };
                      if (!updatedData.options) updatedData.options = {};
                      updatedData.options.maxRetries = parseInt(e.target.value) || 3;
                      onSave({ ...selectedNode, data: updatedData });
                    }}
                    placeholder="3"
                    min="1"
                    max="10"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Email Trigger specific parameters
    if (nodeSubtype === 'email-trigger') {
      return (
        <div className="border-t border-border pt-4 mt-4">
          <h4 className="font-medium text-sm mb-3">📧 Email Trigger Configuration</h4>
          <div className="space-y-3">
            <div>
              <Label htmlFor="email-mailbox">Mailbox</Label>
              <Input
                id="email-mailbox"
                value={selectedNode?.data?.options?.mailbox || 'INBOX'}
                onChange={(e) => {
                  const updatedData = { ...selectedNode.data };
                  if (!updatedData.options) updatedData.options = {};
                  updatedData.options.mailbox = e.target.value;
                  onSave({ ...selectedNode, data: updatedData });
                }}
                placeholder="INBOX"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="email-mark-seen" 
                checked={selectedNode?.data?.options?.markSeen || false}
                onCheckedChange={(checked) => {
                  const updatedData = { ...selectedNode.data };
                  if (!updatedData.options) updatedData.options = {};
                  updatedData.options.markSeen = checked === true;
                  onSave({ ...selectedNode, data: updatedData });
                }}
              />
              <Label htmlFor="email-mark-seen" className="cursor-pointer">Mark as Seen</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="email-download-attachments" 
                checked={selectedNode?.data?.options?.downloadAttachments || false}
                onCheckedChange={(checked) => {
                  const updatedData = { ...selectedNode.data };
                  if (!updatedData.options) updatedData.options = {};
                  updatedData.options.downloadAttachments = checked === true;
                  onSave({ ...selectedNode, data: updatedData });
                }}
              />
              <Label htmlFor="email-download-attachments" className="cursor-pointer">Download Attachments</Label>
            </div>
          </div>
        </div>
      );
    }

    // Google Drive specific parameters
    if (nodeSubtype === 'google-drive') {
      return (
        <div className="border-t border-border pt-4 mt-4">
          <h4 className="font-medium text-sm mb-3">📁 Google Drive Configuration</h4>
          <div className="space-y-3">
            <div>
              <Label htmlFor="drive-operation">
                Operation
              </Label>
              <Select 
                value={selectedNode?.data?.fileOperations?.operation || 'upload'} 
                onValueChange={(value) => {
                  const updatedData = { ...selectedNode.data };
                  if (!updatedData.fileOperations) updatedData.fileOperations = {};
                  updatedData.fileOperations.operation = value;
                  onSave({ ...selectedNode, data: updatedData });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload">Upload</SelectItem>
                  <SelectItem value="download">Download</SelectItem>
                  <SelectItem value="list">List Files</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="drive-folder-id">Folder ID</Label>
              <Input
                id="drive-folder-id"
                value={selectedNode?.data?.options?.folderId || ''}
                onChange={(e) => {
                  const updatedData = { ...selectedNode.data };
                  if (!updatedData.options) updatedData.options = {};
                  updatedData.options.folderId = e.target.value;
                  onSave({ ...selectedNode, data: updatedData });
                }}
                placeholder="Enter Google Drive folder ID"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="drive-shared-drive" 
                checked={selectedNode?.data?.options?.sharedDrive || false}
                onCheckedChange={(checked) => {
                  const updatedData = { ...selectedNode.data };
                  if (!updatedData.options) updatedData.options = {};
                  updatedData.options.sharedDrive = checked === true;
                  onSave({ ...selectedNode, data: updatedData });
                }}
              />
              <Label htmlFor="drive-shared-drive" className="cursor-pointer">Shared Drive</Label>
            </div>
          </div>
        </div>
      );
    }

    // Slack specific parameters
    if (nodeSubtype === 'slack') {
      return (
        <div className="border-t border-border pt-4 mt-4">
          <h4 className="font-medium text-sm mb-3">💬 Slack Configuration</h4>
          <div className="space-y-3">
            <div>
              <Label htmlFor="slack-operation">
                Operation
              </Label>
              <Select 
                value={selectedNode?.data?.communication?.operation || 'send'} 
                onValueChange={(value) => {
                  const updatedData = { ...selectedNode.data };
                  if (!updatedData.communication) updatedData.communication = {};
                  updatedData.communication.operation = value;
                  onSave({ ...selectedNode, data: updatedData });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="send">Send Message</SelectItem>
                  <SelectItem value="reply">Reply to Message</SelectItem>
                  <SelectItem value="update">Update Message</SelectItem>
                  <SelectItem value="delete">Delete Message</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="slack-channel">
                Channel
              </Label>
              <Input
                id="slack-channel"
                value={selectedNode?.data?.communication?.channel || ''}
                onChange={(e) => {
                  const updatedData = { ...selectedNode.data };
                  if (!updatedData.communication) updatedData.communication = {};
                  updatedData.communication.channel = e.target.value;
                  onSave({ ...selectedNode, data: updatedData });
                }}
                placeholder="#general"
              />
            </div>

            <div>
              <Label htmlFor="slack-message">
                Message
              </Label>
              <Textarea
                id="slack-message"
                value={selectedNode?.data?.communication?.message || ''}
                onChange={(e) => {
                  const updatedData = { ...selectedNode.data };
                  if (!updatedData.communication) updatedData.communication = {};
                  updatedData.communication.message = e.target.value;
                  onSave({ ...selectedNode, data: updatedData });
                }}
                placeholder="Enter your Slack message..."
                rows={3}
              />
            </div>
          </div>
        </div>
      );
    }

    // Email node specific parameters
    if (nodeSubtype === 'email') {
      return (
        <div className="border-t border-border pt-4 mt-4">
          <h4 className="font-medium text-sm mb-3">📧 Email Configuration</h4>
          <div className="space-y-3">
            <div>
              <Label htmlFor="email-from">
                From Email
              </Label>
              <Input
                id="email-from"
                value={selectedNode?.data?.communication?.fromEmail || ''}
                onChange={(e) => {
                  const updatedData = { ...selectedNode.data };
                  if (!updatedData.communication) updatedData.communication = {};
                  updatedData.communication.fromEmail = e.target.value;
                  onSave({ ...selectedNode, data: updatedData });
                }}
                placeholder="sender@example.com"
              />
            </div>

            <div>
              <Label htmlFor="email-to">
                To Email
              </Label>
              <Input
                id="email-to"
                value={selectedNode?.data?.communication?.toEmail || ''}
                onChange={(e) => {
                  const updatedData = { ...selectedNode.data };
                  if (!updatedData.communication) updatedData.communication = {};
                  updatedData.communication.toEmail = e.target.value;
                  onSave({ ...selectedNode, data: updatedData });
                }}
                placeholder="recipient@example.com"
              />
            </div>

            <div>
              <Label htmlFor="email-subject">
                Subject
              </Label>
              <Input
                id="email-subject"
                value={selectedNode?.data?.communication?.subject || ''}
                onChange={(e) => {
                  const updatedData = { ...selectedNode.data };
                  if (!updatedData.communication) updatedData.communication = {};
                  updatedData.communication.subject = e.target.value;
                  onSave({ ...selectedNode, data: updatedData });
                }}
                placeholder="Email subject"
              />
            </div>

            <div>
              <Label htmlFor="email-format">Email Format</Label>
              <Select 
                value={selectedNode?.data?.communication?.emailFormat || 'text'} 
                onValueChange={(value) => {
                  const updatedData = { ...selectedNode.data };
                  if (!updatedData.communication) updatedData.communication = {};
                  updatedData.communication.emailFormat = value;
                  onSave({ ...selectedNode, data: updatedData });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      );
    }

    // Return null if no specific parameters for this node type
    return null;
  };

  const renderTriggerConfig = () => (
    <div className="space-y-4">
      {subtype === 'webhook-trigger' && (
        <>
          {isNewNode && (
            <div className="bg-blue-500/10 p-3 rounded-md mt-4 border border-blue-500/20">
              <p className="text-sm text-blue-500">
                <strong>Webhook Trigger:</strong> This node passes through input data. Configuration is not required for manual triggers. These fields are reserved for future external webhook support.
              </p>
            </div>
          )}
        </>
      )}
      
      {subtype === 'manual' && (
        <>
          <div>
            <Label htmlFor="button-text">
              Button Text
            </Label>
            <Input
              id="button-text"
              value={config.buttonText || 'Run Workflow'}
              onChange={(e) => setConfig({ ...config, buttonText: e.target.value })}
              placeholder="Run Workflow"
            />
          </div>
          <div>
            <Label htmlFor="input-data">
              Input Data (JSON)
            </Label>
            <Textarea
              id="input-data"
              value={typeof config.inputData === 'string' ? config.inputData : JSON.stringify(config.inputData || {}, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setConfig({ ...config, inputData: parsed });
                } catch {
                  // If invalid JSON, store as string for now
                  setConfig({ ...config, inputData: e.target.value });
                }
              }}
              placeholder='{"a": 10, "b": 20}'
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Initial input data to pass to the workflow when manually triggered. Use valid JSON format.
            </p>
          </div>
          {isNewNode && (
            <div className="bg-blue-500/10 p-3 rounded-md mt-4 border border-blue-500/20">
              <p className="text-sm text-blue-500">
                <strong>Manual Trigger:</strong> This node will start the workflow when you click the "Run" button. Configure the input data that will be passed to the workflow.
              </p>
            </div>
          )}
        </>
      )}
      
      {subtype === 'file-upload' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="upload-input">Select File</Label>
            <input
              id="upload-input"
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                // Check file size (warn if > 5MB for localStorage)
                const maxSize = 5 * 1024 * 1024; // 5MB
                if (file.size > maxSize) {
                  alert(`Warning: File size (${(file.size / 1024 / 1024).toFixed(2)}MB) is large. It may not persist in browser storage. Consider using a smaller file or uploading via URL.`);
                }
                
                const reader = new FileReader();
                const ext = file.name.split('.').pop()?.toLowerCase();
                if (ext === 'txt' || ext === 'csv' || ext === 'json') {
                  reader.onload = () => {
                    setConfig({
                      ...config,
                      source: 'local', // Auto-set source when file is uploaded
                      uploadedFile: {
                        name: file.name,
                        type: file.type || ext,
                        size: file.size,
                        text: String(reader.result || '')
                      }
                    });
                  };
                  reader.onerror = () => {
                    alert('Error reading file. Please try again.');
                  };
                  reader.readAsText(file);
                } else {
                  reader.onload = () => {
                    const base64 = String(reader.result || '').split(',')[1] || '';
                    setConfig({
                      ...config,
                      source: 'local', // Auto-set source when file is uploaded
                      uploadedFile: {
                        name: file.name,
                        type: file.type || ext,
                        size: file.size,
                        base64
                      }
                    });
                  };
                  reader.onerror = () => {
                    alert('Error reading file. Please try again.');
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="mt-1 block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
          {config.uploadedFile && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-md p-3">
              <p className="text-sm text-green-500">
                <strong>File uploaded:</strong> {config.uploadedFile.name} ({(config.uploadedFile.size / 1024).toFixed(2)} KB)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                File will be saved with the workflow configuration.
              </p>
            </div>
          )}
        </div>
      )}
      
      {subtype === 'error-trigger' && (
        <>
          <div>
            <Label htmlFor="workflow-id">
              Workflow ID
            </Label>
            <Input
              id="workflow-id"
              value={config.workflowId || ''}
              onChange={(e) => setConfig({ ...config, workflowId: e.target.value })}
              placeholder="workflow-123"
              className={getRequiredFieldStatus('workflowId')}
            />
            {isNewNode && !config.workflowId && (
              <p className="text-xs text-red-500 mt-1">This field is required</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              ID of the workflow to monitor for errors
            </p>
          </div>
          
          <div>
            <Label htmlFor="error-types">Error Types</Label>
            <Select
              value={config.errorTypes || 'all'}
              onValueChange={(value) => setConfig({ ...config, errorTypes: value })}
            >
              <SelectTrigger id="error-types">
                <SelectValue placeholder="Select error types to monitor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Errors</SelectItem>
                <SelectItem value="execution">Execution Errors</SelectItem>
                <SelectItem value="timeout">Timeout Errors</SelectItem>
                <SelectItem value="validation">Validation Errors</SelectItem>
                <SelectItem value="authentication">Authentication Errors</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="include-details" 
              checked={config.includeDetails !== false}
              onCheckedChange={(checked) => 
                setConfig({ ...config, includeDetails: checked === true })
              }
            />
            <Label htmlFor="include-details" className="text-sm font-normal">
              Include error details in workflow data
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="retry-failed" 
              checked={config.retryFailed || false}
              onCheckedChange={(checked) => 
                setConfig({ ...config, retryFailed: checked === true })
              }
            />
            <Label htmlFor="retry-failed" className="text-sm font-normal">
              Retry failed workflow
            </Label>
          </div>
          
          {config.retryFailed && (
            <div>
              <Label htmlFor="max-retries">
                Max Retries
              </Label>
              <Input
                id="max-retries"
                type="number"
                min="1"
                max="10"
                value={config.maxRetries || 3}
                onChange={(e) => setConfig({ ...config, maxRetries: parseInt(e.target.value) })}
              />
            </div>
          )}
          
          {isNewNode && (
            <div className="bg-amber-500/10 p-3 rounded-md mt-4 border border-amber-500/20">
              <p className="text-sm text-amber-500">
                <strong>Error Trigger:</strong> This node will start the workflow when errors occur in the specified workflow.
              </p>
            </div>
          )}
        </>
      )}
      
      {subtype === 'form-submit' && (
        <>
          <div>
            <Label htmlFor="form-url">Form URL</Label>
            <Input
              id="form-url"
              value={config.formUrl || '/form-submit'}
              onChange={(e) => setConfig({ ...config, formUrl: e.target.value })}
              placeholder="/form-submit"
            />
            <p className="text-xs text-muted-foreground mt-1">
              URL path for the form submission endpoint
            </p>
          </div>
          <div>
            <Label htmlFor="allowed-origins">Allowed Origins</Label>
            <Input
              id="allowed-origins"
              value={
                Array.isArray(config.allowedOrigins)
                  ? config.allowedOrigins.join(', ')
                  : (config.allowedOrigins || '')
              }
              onChange={(e) =>
                setConfig({
                  ...config,
                  allowedOrigins: e.target.value
                    .split(',')
                    .map((origin) => origin.trim())
                    .filter(Boolean),
                })
              }
              placeholder="https://example.com, https://app.example.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Comma-separated list of allowed origins for CORS (leave empty for all)
            </p>
          </div>
        </>
      )}
      
      {subtype === 'email-trigger' && (
        <>
          <div>
            <Label htmlFor="email-host">
              Email Host
            </Label>
            <Input
              id="email-host"
              value={config.emailHost || ''}
              onChange={(e) => setConfig({ ...config, emailHost: e.target.value })}
              placeholder="imap.gmail.com"
              className={getRequiredFieldStatus('emailHost')}
            />
            {isNewNode && !config.emailHost && (
              <p className="text-xs text-red-500 mt-1">This field is required</p>
            )}
          </div>
          <div>
            <Label htmlFor="email-port">
              Email Port
            </Label>
            <Input
              id="email-port"
              type="number"
              value={config.emailPort || '993'}
              onChange={(e) => setConfig({ ...config, emailPort: e.target.value })}
              placeholder="993"
              className={getRequiredFieldStatus('emailPort')}
            />
            {isNewNode && !config.emailPort && (
              <p className="text-xs text-red-500 mt-1">This field is required</p>
            )}
          </div>
          <div>
            <Label htmlFor="email-user">
              Username
            </Label>
            <Input
              id="email-user"
              value={config.emailUser || ''}
              onChange={(e) => setConfig({ ...config, emailUser: e.target.value })}
              placeholder="your.email@gmail.com"
              className={getRequiredFieldStatus('emailUser')}
            />
            {isNewNode && !config.emailUser && (
              <p className="text-xs text-red-500 mt-1">This field is required</p>
            )}
          </div>
          <div>
            <Label htmlFor="email-password">
              Password/App Password
            </Label>
            <Input
              id="email-password"
              type="password"
              value={config.emailPassword || ''}
              onChange={(e) => setConfig({ ...config, emailPassword: e.target.value })}
              placeholder="Your password or app password"
              className={getRequiredFieldStatus('emailPassword')}
            />
            {isNewNode && !config.emailPassword && (
              <p className="text-xs text-red-500 mt-1">This field is required</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              For Gmail, use an app password instead of your regular password
            </p>
          </div>
          <div className="space-y-2">
            <Label>Email Filters</Label>
            <div className="space-y-4 p-3 border rounded-md">
              <div>
                <Label htmlFor="email-folder">
                  Mailbox/Folder
                </Label>
                <Input
                  id="email-folder"
                  value={config.emailFolder || 'INBOX'}
                  onChange={(e) => setConfig({ ...config, emailFolder: e.target.value })}
                  placeholder="INBOX"
                />
              </div>
              <div>
                <Label htmlFor="email-from">
                  From Email
                </Label>
                <Input
                  id="email-from"
                  value={config.emailFrom || ''}
                  onChange={(e) => setConfig({ ...config, emailFrom: e.target.value })}
                  placeholder="sender@example.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Only process emails from this address (optional)
                </p>
              </div>
              <div>
                <Label htmlFor="email-subject-contains">
                  Subject Contains
                </Label>
                <Input
                  id="email-subject-contains"
                  value={config.emailSubjectContains || ''}
                  onChange={(e) => setConfig({ ...config, emailSubjectContains: e.target.value })}
                  placeholder="Important, Newsletter, etc."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Only process emails with these words in subject (optional)
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="email-only-unread" 
                  checked={config.emailOnlyUnread || false}
                  onCheckedChange={(checked) => 
                    setConfig({ ...config, emailOnlyUnread: checked === true })
                  }
                />
                <Label htmlFor="email-only-unread" className="text-sm font-normal">
                  Only process unread emails
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="email-mark-read" 
                  checked={config.emailMarkRead || false}
                  onCheckedChange={(checked) => 
                    setConfig({ ...config, emailMarkRead: checked === true })
                  }
                />
                <Label htmlFor="email-mark-read" className="text-sm font-normal">
                  Mark emails as read after processing
                </Label>
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="email-check-interval">
              Check Interval (minutes)
            </Label>
            <Input
              id="email-check-interval"
              type="number"
              min="1"
              value={config.emailCheckInterval || '5'}
              onChange={(e) => setConfig({ ...config, emailCheckInterval: e.target.value })}
              placeholder="5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              How often to check for new emails (in minutes)
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="email-download-attachments" 
              checked={config.emailDownloadAttachments || false}
              onCheckedChange={(checked) => 
                setConfig({ ...config, emailDownloadAttachments: checked === true })
              }
            />
            <Label htmlFor="email-download-attachments" className="text-sm font-normal">
              Download email attachments
            </Label>
          </div>
          {isNewNode && (
            <div className="bg-blue-500/10 p-3 rounded-md mt-4 border border-blue-500/20">
              <p className="text-sm text-blue-500">
                <strong>Configuration Required:</strong> Please fill in the required fields to set up this email trigger node.
              </p>
            </div>
          )}
          {getValidationMessage()}
        </>
      )}
      

      {/* Node-specific n8n Parameters */}
      {renderNodeSpecificN8nParameters()}

    </div>
  );

  const renderActionConfig = () => (
    <div className="space-y-4">
      {subtype === 'http-request' && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Parameters</h4>
            <div className="grid grid-cols-1 gap-3">
          <div>
                <Label htmlFor="api-url">API URL</Label>
            <Input
              id="api-url"
              value={config.url || ''}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              placeholder="https://api.example.com/endpoint"
              className={getRequiredFieldStatus('url')}
            />
          </div>
          <div>
                <Label htmlFor="http-method">Method</Label>
            <Select 
              value={config.method || 'GET'} 
              onValueChange={(value) => setConfig({ ...config, method: value })}
            >
              <SelectTrigger className={getRequiredFieldStatus('method')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="HEAD">HEAD</SelectItem>
                    <SelectItem value="OPTIONS">OPTIONS</SelectItem>
              </SelectContent>
            </Select>
          </div>
            </div>
          </div>

          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Query Parameters</h4>
            <div className="space-y-2">
              {(config.queryParams || [{ key: '', value: '' }]).map((p: any, idx: number) => (
                <div key={idx} className="grid grid-cols-5 gap-2">
                  <Input placeholder="key" value={p.key || ''} onChange={(e) => {
                    const next = Array.isArray(config.queryParams) ? [...config.queryParams] : [{ key: '', value: '' }];
                    next[idx] = { ...next[idx], key: e.target.value };
                    setConfig({ ...config, queryParams: next });
                  }} />
                  <div className="col-span-3">
                    <Input placeholder="value" value={p.value || ''} onChange={(e) => {
                      const next = Array.isArray(config.queryParams) ? [...config.queryParams] : [{ key: '', value: '' }];
                      next[idx] = { ...next[idx], value: e.target.value };
                      setConfig({ ...config, queryParams: next });
                    }} />
                  </div>
                  <Button variant="outline" onClick={() => {
                    const next = (config.queryParams || []).filter((_: any, i: number) => i !== idx);
                    setConfig({ ...config, queryParams: next.length ? next : [{ key: '', value: '' }] });
                  }}>Remove</Button>
                </div>
              ))}
              <Button variant="secondary" onClick={() => setConfig({ ...config, queryParams: [ ...(config.queryParams || []), { key: '', value: '' } ] })}>+ Add Query Param</Button>
            </div>
          </div>

          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Headers</h4>
            <div className="space-y-2">
              {(config.headerList || [{ key: 'Content-Type', value: 'application/json' }]).map((h: any, idx: number) => (
                <div key={idx} className="grid grid-cols-5 gap-2">
                  <Input placeholder="Header" value={h.key || ''} onChange={(e) => {
                    const next = Array.isArray(config.headerList) ? [...config.headerList] : [{ key: '', value: '' }];
                    next[idx] = { ...next[idx], key: e.target.value };
                    setConfig({ ...config, headerList: next });
                  }} />
                  <div className="col-span-3">
                    <Input placeholder="Value" value={h.value || ''} onChange={(e) => {
                      const next = Array.isArray(config.headerList) ? [...config.headerList] : [{ key: '', value: '' }];
                      next[idx] = { ...next[idx], value: e.target.value };
                      setConfig({ ...config, headerList: next });
                    }} />
                  </div>
                  <Button variant="outline" onClick={() => {
                    const next = (config.headerList || []).filter((_: any, i: number) => i !== idx);
                    setConfig({ ...config, headerList: next.length ? next : [{ key: '', value: '' }] });
                  }}>Remove</Button>
                </div>
              ))}
              <Button variant="secondary" onClick={() => setConfig({ ...config, headerList: [ ...(config.headerList || []), { key: '', value: '' } ] })}>+ Add Header</Button>
            </div>
          </div>

          {false && (
            <div className="border-b border-border pb-3">
              <h4 className="font-medium text-sm mb-3">Authentication</h4>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={config.authType || 'none'} onValueChange={(v) => setConfig({ ...config, authType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="apiKey">API Key (Header)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {config.authType === 'basic' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Username" value={config.basicUsername || ''} onChange={(e) => setConfig({ ...config, basicUsername: e.target.value })} />
                    <Input placeholder="Password" type="password" value={config.basicPassword || ''} onChange={(e) => setConfig({ ...config, basicPassword: e.target.value })} />
                  </div>
                )}
                {config.authType === 'bearer' && (
                  <Input placeholder="Bearer Token" value={config.bearerToken || ''} onChange={(e) => setConfig({ ...config, bearerToken: e.target.value })} />
                )}
                {config.authType === 'apiKey' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Header Name" value={config.apiKeyHeader || 'Authorization'} onChange={(e) => setConfig({ ...config, apiKeyHeader: e.target.value })} />
                    <Input placeholder="API Key" value={config.apiKey || ''} onChange={(e) => setConfig({ ...config, apiKey: e.target.value })} />
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <h4 className="font-medium text-sm mb-3">Body</h4>
            <div className="grid grid-cols-1 gap-2">
              <Select value={config.bodyType || 'json'} onValueChange={(v) => setConfig({ ...config, bodyType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="form">Form-URL-Encoded</SelectItem>
                  <SelectItem value="raw">Raw</SelectItem>
                </SelectContent>
              </Select>
            <Textarea
              id="body"
              value={config.body || ''}
              onChange={(e) => setConfig({ ...config, body: e.target.value })}
                placeholder={config.bodyType === 'form' ? 'key=value&key2=value2' : '{"key": "value"}'}
              rows={4}
            />
            </div>
          </div>
          {isNewNode && (
            <div className="bg-blue-500/10 p-3 rounded-md mt-4 border border-blue-500/20">
              <p className="text-sm text-blue-500">
                <strong>Configuration Required:</strong> Please fill in the required fields to set up this HTTP request node.
              </p>
            </div>
          )}
        </>
      )}
      
      {subtype === 'data-cleaning' && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">ML Preprocessing</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="enable-ml-preproc" 
                  checked={config.enableMlPreprocessing !== false}
                  onCheckedChange={(checked) => setConfig({ ...config, enableMlPreprocessing: checked === true })}
                />
                <Label htmlFor="enable-ml-preproc" className="cursor-pointer">Enable ML preprocessing for CSV/tabular data (enabled by default)</Label>
              </div>

              <div>
                <Label htmlFor="impute-strategy">Imputation Strategy</Label>
                <Select 
                  value={config.imputeStrategy || 'mean'} 
                  onValueChange={(value) => setConfig({ ...config, imputeStrategy: value })}
                >
                  <SelectTrigger id="impute-strategy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mean">Mean</SelectItem>
                    <SelectItem value="median">Median</SelectItem>
                    <SelectItem value="mode">Mode</SelectItem>
                    <SelectItem value="zero">Zero</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="normalization">Normalization</Label>
                <Select 
                  value={config.normalization || 'none'} 
                  onValueChange={(value) => setConfig({ ...config, normalization: value })}
                >
                  <SelectTrigger id="normalization">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="minmax">Min-Max</SelectItem>
                    <SelectItem value="zscore">Z-Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="encode-categorical" 
                  checked={config.encodeCategorical || false}
                  onCheckedChange={(checked) => setConfig({ ...config, encodeCategorical: checked === true })}
                />
                <Label htmlFor="encode-categorical" className="cursor-pointer">One-hot encode categorical columns</Label>
              </div>

              <div>
                <Label htmlFor="outlier-handling">Outlier Handling</Label>
                <Select 
                  value={config.outlierHandling || 'none'} 
                  onValueChange={(value) => setConfig({ ...config, outlierHandling: value })}
                >
                  <SelectTrigger id="outlier-handling">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="clip">Clip to IQR bounds</SelectItem>
                    <SelectItem value="remove">Remove outliers</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Outliers computed via IQR (1.5×IQR rule).</p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remove-null-rows" 
                  checked={config.removeRowsWithNull || false}
                  onCheckedChange={(checked) => setConfig({ ...config, removeRowsWithNull: checked === true })}
                />
                <Label htmlFor="remove-null-rows" className="cursor-pointer">Remove rows with null/empty values</Label>
              </div>
            </div>
          </div>


        </>
      )}
      
      {(subtype === 'email' || subtype === 'email-send' || subtype === 'send-email') && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Parameters</h4>
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="From" value={config.from || ''} onChange={(e) => setConfig({ ...config, from: e.target.value })} />
                <Input placeholder="To" value={config.to || ''} onChange={(e) => setConfig({ ...config, to: e.target.value })} />
              </div>
              <Input placeholder="Subject" value={config.subject || ''} onChange={(e) => setConfig({ ...config, subject: e.target.value })} />
              <Select value={config.emailFormat || 'text'} onValueChange={(v) => setConfig({ ...config, emailFormat: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                </SelectContent>
              </Select>
              <div>
                <Label className="text-sm">Authentication</Label>
                <Select value={config.authType || 'gmail'} onValueChange={(v) => setConfig({ ...config, authType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail (OAuth)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {config.emailFormat === 'html' ? (
                <Textarea placeholder="<p>Hello</p>" rows={6} value={config.html || ''} onChange={(e) => setConfig({ ...config, html: e.target.value })} />
              ) : (
                <Textarea placeholder="Body text" rows={6} value={config.text || ''} onChange={(e) => setConfig({ ...config, text: e.target.value })} />
            )}
          </div>
          </div>
          {/* Gmail OAuth connect for email node */}
          {config.authType === 'gmail' && (
            <div className="border-b border-border pb-3">
              <h4 className="font-medium text-sm mb-3">Gmail Authentication</h4>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Input placeholder="Gmail Client ID" value={config.clientId || ''} onChange={(e) => setConfig({ ...config, clientId: e.target.value })} />
                <Input placeholder="Gmail Client Secret" type="password" value={config.clientSecret || ''} onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })} />
                <Input placeholder="Gmail Refresh Token" type="password" value={config.refreshToken || ''} onChange={(e) => setConfig({ ...config, refreshToken: e.target.value })} />
              </div>
              <button
                type="button"
                className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
                onClick={async () => {
                  const backendUrl = API_CONFIG.baseUrl;
                  const clientId = String(config.clientId || '');
                  const clientSecret = String(config.clientSecret || '');
                  if (!clientId || !clientSecret) {
                    alert('Enter Gmail Client ID and Client Secret first.');
                    return;
                  }
                  const token = localStorage.getItem('auth_token');
                  if (!token || token.trim().length === 0) {
                    alert('You must be logged in to connect Google. Please log in first.');
                    return;
                  }
                  
                  try {
                    const r = await fetch(`${backendUrl.replace(/\/$/, '')}/api/auth/oauth/google`, {
                      method: 'GET',
                      credentials: 'include',
                      headers: {
                        'Authorization': `Bearer ${token.trim()}`,
                        'Content-Type': 'application/json'
                      }
                    });
                    
                    const data = await r.json();
                    if (!r.ok) {
                      throw new Error(data?.error || data?.message || `HTTP ${r.status}`);
                    }
                    
                    if (data?.authUrl) {
                      window.open(data.authUrl, '_blank', 'width=480,height=720');
                    } else {
                      throw new Error('No auth URL received from server');
                    }
                  } catch (error: any) {
                    alert(`Failed to connect Google: ${error.message || 'Unknown error'}`);
                    logger.error('Google OAuth initiation failed', error as Error);
                  }
                }}
              >
                Connect Gmail
              </button>
              <p className="text-xs text-muted-foreground mt-1">After consent, copy the refresh token from the callback page and paste here.</p>
            </div>
          )}
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Attachments</h4>
            <div className="space-y-2">
              {(config.attachments || []).map((a: any, idx: number) => (
                <div key={idx} className="grid grid-cols-5 gap-2">
                  <Input placeholder="Filename" value={a.filename || ''} onChange={(e) => {
                    const next = [...config.attachments]; next[idx] = { ...next[idx], filename: e.target.value }; setConfig({ ...config, attachments: next });
                  }} />
                  <div className="col-span-3">
                    <Input placeholder="Content (base64 or text)" value={a.content || ''} onChange={(e) => {
                      const next = [...(config.attachments || [])]; next[idx] = { ...next[idx], content: e.target.value }; setConfig({ ...config, attachments: next });
                    }} />
          </div>
                  <Button variant="outline" onClick={() => {
                    const next = (config.attachments || []).filter((_: any, i: number) => i !== idx); setConfig({ ...config, attachments: next });
                  }}>Remove</Button>
                </div>
              ))}
              <Button variant="secondary" onClick={() => setConfig({ ...config, attachments: [ ...(config.attachments || []), { filename: '', content: '' } ] })}>+ Add Attachment</Button>
            </div>
          </div>
          
          {config.authType === 'custom' && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Custom Provider</h4>
              <Input placeholder="API Key" value={config.apiKey || ''} onChange={(e) => setConfig({ ...config, apiKey: e.target.value })} />
              <Input placeholder="Base URL (optional)" value={config.baseUrl || ''} onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })} />
            </div>
          )}
          {getValidationMessage()}
        </>
      )}
      
      {subtype === 'google-drive' && (
        <>
          <div className="space-y-4">
            <div className="border-b border-border pb-3">
              <h4 className="font-medium text-sm mb-3">🔐 Google Drive Authentication</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="drive-client-id">Client ID</Label>
                  <Input
                    id="drive-client-id"
                    value={config.clientId || ''}
                    onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                    placeholder="Enter Google OAuth Client ID"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Get this from Google Cloud Console
                  </p>
                </div>
                <div>
                  <Label htmlFor="drive-client-secret">Client Secret</Label>
                  <Input
                    id="drive-client-secret"
                    type="password"
                    value={config.clientSecret || ''}
                    onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                    placeholder="Enter Google OAuth Client Secret"
                  />
                </div>
                <div>
                  <Label htmlFor="drive-redirect-uri">Authorized Redirect URI</Label>
                  <Input
                    id="drive-redirect-uri"
                    value={(typeof window !== 'undefined' ? 'http://localhost:3003/api/auth/oauth/google/callback' : 'http://localhost:3003/api/auth/oauth/google/callback')}
                    readOnly
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Add this URI in Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs. Then create the Client ID and Secret and paste above.
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline ml-1">Open Google Cloud Console</a>
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
                    onClick={async () => {
                      const backendUrl = API_CONFIG.baseUrl;
                      const clientId = String(config.clientId || '');
                      const clientSecret = String(config.clientSecret || '');
                      if (!clientId || !clientSecret) {
                        alert('Please enter Google Client ID and Client Secret first.');
                        return;
                      }
                      
                      const token = localStorage.getItem('auth_token');
                      if (!token || token.trim().length === 0) {
                        alert('You must be logged in to connect Google. Please log in first.');
                        return;
                      }
                      
                      try {
                        const r = await fetch(`${backendUrl.replace(/\/$/, '')}/api/auth/oauth/google`, {
                          method: 'GET',
                          credentials: 'include',
                          headers: {
                            'Authorization': `Bearer ${token.trim()}`,
                            'Content-Type': 'application/json'
                          }
                        });
                        
                        const data = await r.json();
                        if (!r.ok) {
                          throw new Error(data?.error || data?.message || `HTTP ${r.status}`);
                        }
                        
                        if (data?.authUrl) {
                          window.open(data.authUrl, '_blank', 'width=480,height=720');
                        } else {
                          throw new Error('No auth URL received from server');
                        }
                      } catch (error: any) {
                        alert(`Failed to connect Google: ${error.message || 'Unknown error'}`);
                        logger.error('Google OAuth initiation failed', error as Error);
                      }
                    }}
                  >
                    Connect Google (Drive/Sheets)
                  </button>
                  <p className="text-xs text-muted-foreground mt-1">After consent, copy the refresh token from the callback page and paste below.</p>
                </div>
                
              </div>
            </div>
            
            <div className="border-b border-border pb-3">
              <h4 className="font-medium text-sm mb-3">📁 Upload Configuration</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="drive-operation">
                    Operation
                  </Label>
                  <Select 
                    value={config.operation || ''} 
                    onValueChange={(value) => setConfig({ ...config, operation: value })}
                  >
                    <SelectTrigger className={getRequiredFieldStatus('operation')}>
                      <SelectValue placeholder="Select operation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upload">Upload File</SelectItem>
                      <SelectItem value="list">List Files</SelectItem>
                      <SelectItem value="download">Download File</SelectItem>
                      <SelectItem value="delete">Delete File</SelectItem>
                    </SelectContent>
                  </Select>
                  {isNewNode && !config.operation && (
                    <p className="text-xs text-red-500 mt-1">This field is required</p>
                  )}
                </div>
                {(config.operation === 'upload' || !config.operation) && (
                <div>
                    <Label htmlFor="drive-folder">Folder</Label>
                    <div className="flex gap-2">
                  <Input
                    id="drive-folder"
                    value={config.folderId || ''}
                    onChange={(e) => setConfig({ ...config, folderId: e.target.value })}
                    placeholder="Enter Google Drive folder ID"
                  />
                      <button
                        className="px-3 py-2 border rounded text-sm hover:bg-muted"
                        onClick={async () => {
                          try {
                            const backendUrl = API_CONFIG.baseUrl;
                            // Load tokens from config
                            const accessToken = config?.accessToken || '';
                            const refreshToken = config?.refreshToken || '';
                            const clientId = config?.clientId || '';
                            const clientSecret = config?.clientSecret || '';
                            const j = await ApiService.post<any>(
                              '/api/integrations/google-drive/list',
                              { data: { accessToken, refreshToken, clientId, clientSecret } },
                              { toastTitle: 'List Folders' }
                            );
                            if (!j || (j as any)?.success === false) throw new Error((j as any)?.error || 'Failed to list folders');
                            const files = ((j as any)?.data?.files || []) as Array<{ id: string; name: string }>;
                            const items = files.map(f => ({ id: f.id, name: f.name }));
                            if (items.length === 0) {
                              alert('No folders found. Ensure OAuth is connected and tokens are loaded from Vault.');
                              return;
                            }
                            const names = items.map((it, i) => `${i + 1}. ${it.name} (${it.id})`).join('\n');
                            const choiceRaw = prompt(`Choose a folder by number:\n${names}`);
                            if (!choiceRaw) return;
                            const idx = Math.max(1, Math.min(items.length, Number(choiceRaw))) - 1;
                            const chosen = items[idx];
                            setConfig({ ...config, folderId: chosen.id });
                          } catch (e: any) {
                            alert(e?.message || 'Folder picker failed');
                          }
                        }}
                        title="Choose Folder"
                      >Choose</button>
                    </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to upload to root folder
                  </p>
                </div>
                )}
                {config.operation === 'upload' && (
                <div>
                  <Label htmlFor="drive-filename">File Name</Label>
                  <Input
                    id="drive-filename"
                    value={config.fileName || ''}
                    onChange={(e) => setConfig({ ...config, fileName: e.target.value })}
                    placeholder="ai_output.txt"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use {`{timestamp}`} for dynamic naming
                  </p>
                </div>
                )}
                {config.operation === 'upload' && (
                <div>
                  <Label htmlFor="drive-content">Content Source</Label>
                  <Select value={config.contentSource || 'ai-output'} onValueChange={(value) => setConfig({ ...config, contentSource: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ai-output">AI Generated Content</SelectItem>
                      <SelectItem value="custom-text">Custom Text</SelectItem>
                      <SelectItem value="json-data">JSON Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                )}
                {config.operation === 'upload' && config.contentSource === 'custom-text' && (
                  <div>
                    <Label htmlFor="drive-custom-text">Custom Text</Label>
                    <Textarea
                      id="drive-custom-text"
                      value={config.customText || ''}
                      onChange={(e) => setConfig({ ...config, customText: e.target.value })}
                      placeholder="Enter custom text to upload"
                      rows={4}
                    />
                  </div>
                )}
                {config.operation === 'upload' && (
                <div>
                  <Label htmlFor="drive-file-type">File Type</Label>
                  <Select value={config.fileType || 'txt'} onValueChange={(value) => setConfig({ ...config, fileType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="txt">Text File (.txt)</SelectItem>
                      <SelectItem value="md">Markdown (.md)</SelectItem>
                      <SelectItem value="json">JSON (.json)</SelectItem>
                      <SelectItem value="csv">CSV (.csv)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                )}
                {(config.operation === 'download' || config.operation === 'delete') && (
                  <div>
                    <Label htmlFor="drive-fileid">File ID</Label>
                    <Input
                      id="drive-fileid"
                      value={config.fileId || ''}
                      onChange={(e) => setConfig({ ...config, fileId: e.target.value })}
                      placeholder="Enter Google Drive file ID"
                    />
                  </div>
                )}
                {config.operation === 'list' && (
                  <>
                    <div>
                      <Label htmlFor="drive-folder-list">Folder ID</Label>
                      <Input
                        id="drive-folder-list"
                        value={config.folderId || ''}
                        onChange={(e) => setConfig({ ...config, folderId: e.target.value })}
                        placeholder="Enter Google Drive folder ID"
                      />
                    </div>
                    <div>
                      <Label htmlFor="drive-query">Query (optional)</Label>
                      <Input
                        id="drive-query"
                        value={config.query || ''}
                        onChange={(e) => setConfig({ ...config, query: e.target.value })}
                        placeholder="name contains 'doc' and mimeType = 'text/plain'"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex items-start gap-2">
                <div className="text-blue-600">ℹ️</div>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Google Drive Setup Required</p>
                  <p className="text-xs">You need to create a Google Cloud project and enable the Google Drive API. Then get your OAuth credentials to authenticate.</p>
                  <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">Go to Google Cloud Console</a>
                </div>
              </div>
            </div>
            {getValidationMessage()}
          </div>
        </>
      )}

      {subtype === 'aws-s3' && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Parameters</h4>
            <div className="grid grid-cols-1 gap-3">
              <Input placeholder="Bucket" value={config.bucket || ''} onChange={(e) => setConfig({ ...config, bucket: e.target.value })} />
              <Input placeholder="Key (object path)" value={config.key || ''} onChange={(e) => setConfig({ ...config, key: e.target.value })} />
              <Select value={config.operation || 'upload'} onValueChange={(v) => setConfig({ ...config, operation: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload">Upload</SelectItem>
                  <SelectItem value="download">Download</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
              {config.operation === 'upload' && (
                <Textarea rows={4} placeholder="Content to upload (text/base64)" value={config.content || ''} onChange={(e) => setConfig({ ...config, content: e.target.value })} />
              )}
            </div>
          </div>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Authentication</h4>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Access Key ID" value={config.accessKeyId || ''} onChange={(e) => setConfig({ ...config, accessKeyId: e.target.value })} />
              <Input placeholder="Secret Access Key" type="password" value={config.secretAccessKey || ''} onChange={(e) => setConfig({ ...config, secretAccessKey: e.target.value })} />
              <Input placeholder="Region (e.g., us-east-1)" value={config.region || ''} onChange={(e) => setConfig({ ...config, region: e.target.value })} />
            </div>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-3">Options</h4>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="ACL (e.g., private)" value={config.acl || ''} onChange={(e) => setConfig({ ...config, acl: e.target.value })} />
              <Input placeholder="Storage Class (e.g., STANDARD)" value={config.storageClass || ''} onChange={(e) => setConfig({ ...config, storageClass: e.target.value })} />
            </div>
          </div>
        </>
      )}

      {subtype === 'onedrive' && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Parameters</h4>
            <div className="grid grid-cols-1 gap-3">
              <Input placeholder="Path (e.g., /Documents/file.txt)" value={config.path || ''} onChange={(e) => setConfig({ ...config, path: e.target.value })} />
              <Select value={config.operation || 'upload'} onValueChange={(v) => setConfig({ ...config, operation: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload">Upload</SelectItem>
                  <SelectItem value="download">Download</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
              {config.operation === 'upload' && (
                <Textarea rows={4} placeholder="Content to upload (text/base64)" value={config.content || ''} onChange={(e) => setConfig({ ...config, content: e.target.value })} />
              )}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-3">Authentication</h4>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Client ID" value={config.clientId || ''} onChange={(e) => setConfig({ ...config, clientId: e.target.value })} />
              <Input placeholder="Client Secret" type="password" value={config.clientSecret || ''} onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })} />
              <Input placeholder="Refresh Token" type="password" value={config.refreshToken || ''} onChange={(e) => setConfig({ ...config, refreshToken: e.target.value })} />
            </div>
          </div>
        </>
      )}

      {subtype === 'google-cloud-storage' && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Parameters</h4>
            <div className="grid grid-cols-1 gap-3">
              <Input placeholder="Bucket" value={config.bucket || ''} onChange={(e) => setConfig({ ...config, bucket: e.target.value })} />
              <Input placeholder="Object (key/path)" value={config.key || ''} onChange={(e) => setConfig({ ...config, key: e.target.value })} />
              <Select value={config.operation || 'upload'} onValueChange={(v) => setConfig({ ...config, operation: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload">Upload</SelectItem>
                  <SelectItem value="download">Download</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
              {config.operation === 'upload' && (
                <Textarea rows={4} placeholder="Content to upload (text/base64)" value={config.content || ''} onChange={(e) => setConfig({ ...config, content: e.target.value })} />
              )}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-3">Authentication</h4>
            <div className="grid grid-cols-1 gap-2">
              <Textarea rows={4} placeholder='Service Account JSON' value={config.serviceAccountJson || ''} onChange={(e) => setConfig({ ...config, serviceAccountJson: e.target.value })} />
            </div>
          </div>
        </>
      )}

      {subtype === 'azure-blob' && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Parameters</h4>
            <div className="grid grid-cols-1 gap-3">
              <Input placeholder="Container" value={config.container || ''} onChange={(e) => setConfig({ ...config, container: e.target.value })} />
              <Input placeholder="Blob Name (path)" value={config.blob || ''} onChange={(e) => setConfig({ ...config, blob: e.target.value })} />
              <Select value={config.operation || 'upload'} onValueChange={(v) => setConfig({ ...config, operation: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload">Upload</SelectItem>
                  <SelectItem value="download">Download</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
              {config.operation === 'upload' && (
                <Textarea rows={4} placeholder="Content to upload (text/base64)" value={config.content || ''} onChange={(e) => setConfig({ ...config, content: e.target.value })} />
              )}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-3">Authentication</h4>
            <div className="grid grid-cols-1 gap-2">
              <Textarea rows={3} placeholder='Connection String' value={config.connectionString || ''} onChange={(e) => setConfig({ ...config, connectionString: e.target.value })} />
            </div>
          </div>
        </>
      )}

      {subtype === 'file-export' && (
        <>
          <div className="space-y-4">
            <div>
              <Label htmlFor="export-format">Export format</Label>
              <Select
                value={Array.isArray(config.formats) ? config.formats[0] : (config.format || config.formats || 'csv')}
                onValueChange={(value) => setConfig({ ...config, format: value, formats: [value] })}
              >
                <SelectTrigger id="export-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="txt">TXT</SelectItem>
                  <SelectItem value="xlsx">XLSX</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Review & Download section when output available */}
          {selectedNode?.data?.lastOutput?.exports && (
            <div className="mt-4 border-t border-border pt-4 space-y-3">
              <h4 className="font-medium text-sm">Review & Download</h4>
              {selectedNode.data.lastOutput.exports.map((exp: any, idx: number) => (
                <div key={idx} className="p-3 border rounded-md space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <span className="mr-2">Format:</span>
                      <Badge variant="outline" className="text-xs">{exp.format.toUpperCase()}</Badge>
                    </div>
                    <button
                      className="text-sm px-2 py-1 rounded border border-border hover:bg-muted"
                      onClick={() => {
                        const content = typeof exp.data === 'string' ? exp.data : JSON.stringify(exp.data, null, 2);
                        const mime = exp.format === 'json' ? 'application/json' : (exp.format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                        const blob = new Blob([content], { type: mime });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = exp.filename || `export.${exp.format}`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      }}
                      title="Download"
                    >
                      ⬇ Download
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground">Filename: {exp.filename}</div>
                  <div className="max-h-96 overflow-auto text-xs p-2 bg-muted rounded">
                    <pre className="whitespace-pre-wrap break-all text-black">{String(exp.data).slice(0, 5000)}</pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {subtype === 'google-analytics' && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">🔐 Google Analytics Authentication</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="ga-client-id">Client ID</Label>
                <Input
                  id="ga-client-id"
                  value={config.clientId || ''}
                  onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                  placeholder="Enter Google OAuth Client ID"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Get this from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a>
                </p>
              </div>
              <div>
                <Label htmlFor="ga-client-secret">Client Secret</Label>
                <Input
                  id="ga-client-secret"
                  type="password"
                  value={config.clientSecret || ''}
                  onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                  placeholder="Enter Google OAuth Client Secret"
                />
              </div>
              <div>
                <Label htmlFor="ga-redirect-uri">Authorized Redirect URI</Label>
                <Input
                  id="ga-redirect-uri"
                  value={(typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/oauth/callback` : 'http://localhost:8080/oauth/callback')}
                  readOnly
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Add this URI in Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs
                  <br />
                  <strong>Required Scopes:</strong> https://www.googleapis.com/auth/analytics.readonly
                </p>
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (!config.clientId || !config.clientSecret) {
                      alert('Please enter Google Client ID and Client Secret first.');
                      return;
                    }
                    
                    const token = localStorage.getItem('auth_token');
                    if (!token || token.trim().length === 0) {
                      alert('You must be logged in to connect Google. Please log in first.');
                      return;
                    }
                    
                    try {
                      const backendUrl = API_CONFIG.baseUrl;
                      
                      // First, save the client ID and secret temporarily
                      // Then initiate OAuth flow with Analytics scope
                      const authUrl = `${backendUrl}/api/auth/oauth/google/analytics?clientId=${encodeURIComponent(config.clientId)}&clientSecret=${encodeURIComponent(config.clientSecret)}`;
                      
                      const response = await fetch(`${backendUrl}/api/auth/oauth/google`, {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                          'Authorization': `Bearer ${token.trim()}`,
                          'Content-Type': 'application/json'
                        }
                      });
                      
                      const data = await response.json();
                      if (!response.ok) {
                        throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
                      }
                      
                      if (data?.authUrl) {
                        // Open OAuth popup
                        const popup = window.open(data.authUrl, '_blank', 'width=480,height=720');
                        
                        // Listen for OAuth callback completion
                        const checkInterval = setInterval(async () => {
                          if (popup?.closed) {
                            clearInterval(checkInterval);
                            
                            // Try to get the access token from OAuth service
                            try {
                              // After OAuth completes, tokens are stored in backend
                              // Wait a moment for callback to process, then retrieve token
                              await new Promise(resolve => setTimeout(resolve, 2000));
                              
                              // Retrieve access token from OAuth service
                              const tokenResponse = await fetch(`${backendUrl}/api/auth/oauth/token?provider=google`, {
                                method: 'GET',
                                credentials: 'include',
                                headers: {
                                  'Authorization': `Bearer ${token.trim()}`,
                                  'Content-Type': 'application/json'
                                }
                              });
                              
                              if (tokenResponse.ok) {
                                const tokenData = await tokenResponse.json();
                                if (tokenData?.accessToken) {
                                  setConfig({ ...config, accessToken: tokenData.accessToken });
                                  alert('✅ Google Analytics connected successfully! Access token retrieved.');
                                } else {
                                  // Fallback: ask user to paste token
                                  const accessToken = prompt('After authorizing, copy the Access Token from the callback page and paste it here:');
                                  if (accessToken) {
                                    setConfig({ ...config, accessToken: accessToken.trim() });
                                  }
                                }
                              } else {
                                // Fallback: ask user to paste token
                                const accessToken = prompt('After authorizing, copy the Access Token from the callback page and paste it here:');
                                if (accessToken) {
                                  setConfig({ ...config, accessToken: accessToken.trim() });
                                }
                              }
                            } catch (err) {
                              // Fallback: ask user to paste token
                              const accessToken = prompt('After authorizing, copy the Access Token from the callback page and paste it here:');
                              if (accessToken) {
                                setConfig({ ...config, accessToken: accessToken.trim() });
                              }
                            }
                          }
                        }, 1000);
                      } else {
                        throw new Error('No auth URL received from server');
                      }
                    } catch (error: any) {
                      alert(`Failed to connect Google Analytics: ${error.message || 'Unknown error'}`);
                      logger.error('Google Analytics OAuth initiation failed:', error as Error);
                    }
                  }}
                >
                  🔗 Connect with Google Analytics
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  After consent, copy the access token from the callback page and paste it below, or manually enter your access token.
                </p>
              </div>
              <div>
                <Label htmlFor="ga-access-token">Access Token *</Label>
                <Input
                  id="ga-access-token"
                  type="password"
                  value={config.accessToken || ''}
                  onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                  placeholder="Paste your Google Analytics access token here"
                  className={getRequiredFieldStatus('accessToken')}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Required: OAuth 2.0 access token for Google Analytics API
                </p>
              </div>
            </div>
          </div>
          
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Google Analytics Parameters</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="ga-operation">Operation *</Label>
                <Select 
                  value={config.operation || 'getReport'} 
                  onValueChange={(value) => setConfig({ ...config, operation: value })}
                >
                  <SelectTrigger className={getRequiredFieldStatus('operation')}>
                    <SelectValue placeholder="Select operation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="getReport">Get Report</SelectItem>
                    <SelectItem value="getRealtimeReport">Get Realtime Report</SelectItem>
                    <SelectItem value="getAccountSummaries">Get Account Summaries</SelectItem>
                    <SelectItem value="getProperties">Get Properties</SelectItem>
                    <SelectItem value="getCustomDimensions">Get Custom Dimensions</SelectItem>
                    <SelectItem value="getCustomMetrics">Get Custom Metrics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ga-api-version">API Version</Label>
                <Select 
                  value={config.apiVersion || 'ga4'} 
                  onValueChange={(value) => setConfig({ ...config, apiVersion: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ga4">Google Analytics 4 (default)</SelectItem>
                    <SelectItem value="ua">Universal Analytics (v3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ga-property-id">Property ID (GA4)</Label>
                <Input 
                  id="ga-property-id"
                  value={config.propertyId || ''} 
                  onChange={(e) => setConfig({ ...config, propertyId: e.target.value })}
                  placeholder="123456789 (required for GA4 operations: getReport, getRealtimeReport, getCustomDimensions, getCustomMetrics)"
                />
              </div>
              <div>
                <Label htmlFor="ga-view-id">View ID (UA)</Label>
                <Input 
                  id="ga-view-id"
                  value={config.viewId || ''} 
                  onChange={(e) => setConfig({ ...config, viewId: e.target.value })}
                  placeholder="123456789 (required for Universal Analytics operations: getReport, getRealtimeReport)"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="ga-start-date">Start Date</Label>
                  <Input 
                    id="ga-start-date"
                    value={config.startDate || '30daysAgo'} 
                    onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                    placeholder="30daysAgo (default) or 2024-01-01"
                  />
                </div>
                <div>
                  <Label htmlFor="ga-end-date">End Date</Label>
                  <Input 
                    id="ga-end-date"
                    value={config.endDate || 'today'} 
                    onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                    placeholder="today (default) or 2024-01-31"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="ga-metrics">Metrics</Label>
                <Input 
                  id="ga-metrics"
                  value={config.metrics || ''} 
                  onChange={(e) => setConfig({ ...config, metrics: e.target.value })}
                  placeholder="sessions,users (GA4) or ga:sessions,ga:users (UA) - optional"
                />
              </div>
              <div>
                <Label htmlFor="ga-dimensions">Dimensions</Label>
                <Input 
                  id="ga-dimensions"
                  value={config.dimensions || ''} 
                  onChange={(e) => setConfig({ ...config, dimensions: e.target.value })}
                  placeholder="country,city (GA4) or ga:country,ga:city (UA) - optional"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {subtype === 'google-sheets' && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Parameters</h4>
            <div className="grid grid-cols-1 gap-3">
              <Input placeholder="Spreadsheet ID" value={config.spreadsheetId || ''} onChange={(e) => setConfig({ ...config, spreadsheetId: e.target.value })} />
              <Input placeholder="Range (e.g., Sheet1!A1:C10)" value={config.range || ''} onChange={(e) => setConfig({ ...config, range: e.target.value })} />
              <Select value={config.operation || 'read'} onValueChange={(v) => setConfig({ ...config, operation: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="append">Append</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                </SelectContent>
              </Select>
              {(config.operation === 'append' || config.operation === 'update') && (
                <Textarea rows={4} placeholder='Data JSON or CSV, e.g., [["a","b"],["c","d"]]' value={config.data || ''} onChange={(e) => setConfig({ ...config, data: e.target.value })} />
              )}
            </div>
          </div>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Authentication</h4>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Client ID" value={config.clientId || ''} onChange={(e) => setConfig({ ...config, clientId: e.target.value })} />
              <Input placeholder="Client Secret" type="password" value={config.clientSecret || ''} onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })} />
              <Input placeholder="Refresh Token" type="password" value={config.refreshToken || ''} onChange={(e) => setConfig({ ...config, refreshToken: e.target.value })} />
            </div>
            <div className="mt-2">
              <button
                type="button"
                className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
                onClick={async () => {
                  const backendUrl = API_CONFIG.baseUrl;
                  const clientId = String(config.clientId || '');
                  const clientSecret = String(config.clientSecret || '');
                  if (!clientId || !clientSecret) {
                    alert('Please enter Google Client ID and Client Secret first.');
                    return;
                  }
                  
                  const token = localStorage.getItem('auth_token');
                  if (!token || token.trim().length === 0) {
                    alert('You must be logged in to connect Google. Please log in first.');
                    return;
                  }
                  
                  try {
                    const r = await fetch(`${backendUrl.replace(/\/$/, '')}/api/auth/oauth/google`, {
                      method: 'GET',
                      credentials: 'include',
                      headers: {
                        'Authorization': `Bearer ${token.trim()}`,
                        'Content-Type': 'application/json'
                      }
                    });
                    
                    const data = await r.json();
                    if (!r.ok) {
                      throw new Error(data?.error || data?.message || `HTTP ${r.status}`);
                    }
                    
                    if (data?.authUrl) {
                      window.open(data.authUrl, '_blank', 'width=480,height=720');
                    } else {
                      throw new Error('No auth URL received from server');
                    }
                  } catch (error: any) {
                    alert(`Failed to connect Google: ${error.message || 'Unknown error'}`);
                    logger.error('Google OAuth initiation failed', error as Error);
                  }
                }}
              >
                Connect Google
              </button>
              <p className="text-xs text-muted-foreground mt-1">After consent, copy the refresh token from the callback page and paste here.</p>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-3">Options</h4>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Value Input Option (e.g., RAW)" value={config.valueInputOption || ''} onChange={(e) => setConfig({ ...config, valueInputOption: e.target.value })} />
              <Input placeholder="Major Dimension (ROWS/COLUMNS)" value={config.majorDimension || ''} onChange={(e) => setConfig({ ...config, majorDimension: e.target.value })} />
            </div>
          </div>
          {getValidationMessage()}
        </>
      )}

      {subtype === 'google-forms' && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Parameters</h4>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="google-forms-form-id">Form ID *</Label>
                <Input 
                  id="google-forms-form-id"
                  placeholder="Enter the Google Form ID" 
                  value={config.formId || ''} 
                  onChange={(e) => setConfig({ ...config, formId: e.target.value })} 
                  className={getRequiredFieldStatus('formId')}
                />
              </div>
              <div>
                <Label htmlFor="google-forms-response-id">Response ID</Label>
                <Input 
                  id="google-forms-response-id"
                  placeholder="Enter a specific response ID" 
                  value={config.responseId || ''} 
                  onChange={(e) => setConfig({ ...config, responseId: e.target.value })} 
                />
                <p className="text-xs text-muted-foreground mt-1">Optional: Get a specific response by ID</p>
              </div>
              <div>
                <Label htmlFor="google-forms-page-size">Page Size</Label>
                <Input 
                  id="google-forms-page-size"
                  type="number"
                  placeholder="100" 
                  value={config.pageSize || ''} 
                  onChange={(e) => setConfig({ ...config, pageSize: e.target.value ? Number(e.target.value) : undefined })} 
                  min={1}
                  max={1000}
                />
                <p className="text-xs text-muted-foreground mt-1">Max responses to retrieve (default: 100)</p>
              </div>
            </div>
          </div>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Authentication</h4>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="google-forms-access-token">Access Token</Label>
                <Input 
                  id="google-forms-access-token"
                  type="password"
                  placeholder="Google OAuth access token (optional - OAuth will be used if not provided)" 
                  value={config.accessToken || ''} 
                  onChange={(e) => setConfig({ ...config, accessToken: e.target.value })} 
                />
                <p className="text-xs text-muted-foreground mt-1">Optional: OAuth will be used automatically if not provided</p>
              </div>
            </div>
            <div className="mt-2">
              <button
                type="button"
                className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
                onClick={async () => {
                  const backendUrl = API_CONFIG.baseUrl;
                  const token = localStorage.getItem('auth_token');
                  if (!token || token.trim().length === 0) {
                    alert('You must be logged in to connect Google. Please log in first.');
                    return;
                  }
                  
                  try {
                    const r = await fetch(`${backendUrl.replace(/\/$/, '')}/api/auth/oauth/google`, {
                      method: 'GET',
                      credentials: 'include',
                      headers: {
                        'Authorization': `Bearer ${token.trim()}`,
                        'Content-Type': 'application/json'
                      }
                    });
                    
                    const data = await r.json();
                    if (!r.ok) {
                      throw new Error(data?.error || data?.message || `HTTP ${r.status}`);
                    }
                    
                    if (data?.authUrl) {
                      window.open(data.authUrl, '_blank', 'width=480,height=720');
                    } else {
                      throw new Error('No auth URL received from server');
                    }
                  } catch (error: any) {
                    alert(`Failed to connect Google: ${error.message || 'Unknown error'}`);
                    logger.error('Google OAuth initiation failed', error as Error);
                  }
                }}
              >
                Connect Google Account
              </button>
              <p className="text-xs text-muted-foreground mt-1">Connect your Google account to access Google Forms</p>
            </div>
          </div>
          {getValidationMessage()}
        </>
      )}



      {subtype === 'slack' && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Parameters</h4>
            <div className="grid grid-cols-1 gap-3">
              <Select value={config.operation || 'send'} onValueChange={(v) => setConfig({ ...config, operation: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="send">Send Message</SelectItem>
                  <SelectItem value="update">Update Message</SelectItem>
                  <SelectItem value="delete">Delete Message</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="#channel or @user" value={config.channel || ''} onChange={(e) => setConfig({ ...config, channel: e.target.value })} />
              {config.operation !== 'delete' && (
                <Textarea rows={4} placeholder="Message" value={config.message || ''} onChange={(e) => setConfig({ ...config, message: e.target.value })} />
              )}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-3">Options</h4>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Username" value={config.username || ''} onChange={(e) => setConfig({ ...config, username: e.target.value })} />
              <Input placeholder=":emoji:" value={config.iconEmoji || ''} onChange={(e) => setConfig({ ...config, iconEmoji: e.target.value })} />
            </div>
          </div>
        </>
      )}

      {subtype === 'telegram' && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Parameters</h4>
            <div className="grid grid-cols-1 gap-3">
              <Input placeholder="Chat ID" value={config.chatId || ''} onChange={(e) => setConfig({ ...config, chatId: e.target.value })} />
              <Textarea rows={4} placeholder="Message" value={config.message || ''} onChange={(e) => setConfig({ ...config, message: e.target.value })} />
            </div>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-3">Options</h4>
            <div className="grid grid-cols-2 gap-2">
              <Select value={config.parseMode || 'HTML'} onValueChange={(v) => setConfig({ ...config, parseMode: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HTML">HTML</SelectItem>
                  <SelectItem value="Markdown">Markdown</SelectItem>
                  <SelectItem value="MarkdownV2">MarkdownV2</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2">
                <Checkbox id="tg-disable-preview" checked={config.disableWebPagePreview || false} onCheckedChange={(c) => setConfig({ ...config, disableWebPagePreview: c === true })} />
                <Label htmlFor="tg-disable-preview" className="cursor-pointer">Disable Link Preview</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="tg-disable-notify" checked={config.disableNotification || false} onCheckedChange={(c) => setConfig({ ...config, disableNotification: c === true })} />
                <Label htmlFor="tg-disable-notify" className="cursor-pointer">Disable Notification</Label>
              </div>
            </div>
          </div>
        </>
      )}


      {subtype === 'mysql' && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Parameters</h4>
            <div className="grid grid-cols-1 gap-3">
              <Select value={config.operation || 'query'} onValueChange={(v) => setConfig({ ...config, operation: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="query">Query</SelectItem>
                  <SelectItem value="insert">Insert</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
              {config.operation === 'query' ? (
                <>
                  <Textarea rows={4} placeholder="SELECT * FROM table WHERE id = ?" value={config.sql || ''} onChange={(e) => setConfig({ ...config, sql: e.target.value })} />
                  <Textarea rows={2} placeholder='Values JSON, e.g., [1]' value={config.values || ''} onChange={(e) => setConfig({ ...config, values: e.target.value })} />
                </>
              ) : (
                <>
                  <Input placeholder="Table" value={config.table || ''} onChange={(e) => setConfig({ ...config, table: e.target.value })} />
                  {config.operation === 'insert' && (
                    <Textarea rows={3} placeholder='Fields JSON, e.g., {"name":"Alice"}' value={config.fields || ''} onChange={(e) => setConfig({ ...config, fields: e.target.value })} />
                  )}
                  {(config.operation === 'update' || config.operation === 'delete') && (
                    <Textarea rows={3} placeholder='Where JSON, e.g., {"id":1}' value={config.where || ''} onChange={(e) => setConfig({ ...config, where: e.target.value })} />
                  )}
                </>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-3">Connection</h4>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Host" value={config.host || ''} onChange={(e) => setConfig({ ...config, host: e.target.value })} />
              <Input placeholder="Port" type="number" value={config.port || 3306} onChange={(e) => setConfig({ ...config, port: Number(e.target.value) })} />
              <Input placeholder="Database" value={config.database || ''} onChange={(e) => setConfig({ ...config, database: e.target.value })} />
              <Input placeholder="User" value={config.user || ''} onChange={(e) => setConfig({ ...config, user: e.target.value })} />
              <Input placeholder="Password" type="password" value={config.password || ''} onChange={(e) => setConfig({ ...config, password: e.target.value })} />
            </div>
          </div>
        </>
      )}

      {subtype === 'postgresql' && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Parameters</h4>
            <div className="grid grid-cols-1 gap-3">
              <Select value={config.operation || 'query'} onValueChange={(v) => setConfig({ ...config, operation: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="query">Query</SelectItem>
                  <SelectItem value="insert">Insert</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
              {config.operation === 'query' ? (
                <>
                  <Textarea rows={4} placeholder="SELECT * FROM public.table WHERE id = $1" value={config.sql || ''} onChange={(e) => setConfig({ ...config, sql: e.target.value })} />
                  <Textarea rows={2} placeholder='Values JSON, e.g., [1]' value={config.values || ''} onChange={(e) => setConfig({ ...config, values: e.target.value })} />
                </>
              ) : (
                <>
                  <Input placeholder="Table" value={config.table || ''} onChange={(e) => setConfig({ ...config, table: e.target.value })} />
                  {config.operation === 'insert' && (
                    <Textarea rows={3} placeholder='Fields JSON, e.g., {"name":"Alice"}' value={config.fields || ''} onChange={(e) => setConfig({ ...config, fields: e.target.value })} />
                  )}
                  {(config.operation === 'update' || config.operation === 'delete') && (
                    <Textarea rows={3} placeholder='Where JSON, e.g., {"id":1}' value={config.where || ''} onChange={(e) => setConfig({ ...config, where: e.target.value })} />
                  )}
                </>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-3">Connection</h4>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Host" value={config.host || ''} onChange={(e) => setConfig({ ...config, host: e.target.value })} />
              <Input placeholder="Port" type="number" value={config.port || 5432} onChange={(e) => setConfig({ ...config, port: Number(e.target.value) })} />
              <Input placeholder="Database" value={config.database || ''} onChange={(e) => setConfig({ ...config, database: e.target.value })} />
              <Input placeholder="User" value={config.user || ''} onChange={(e) => setConfig({ ...config, user: e.target.value })} />
              <Input placeholder="Password" type="password" value={config.password || ''} onChange={(e) => setConfig({ ...config, password: e.target.value })} />
              <Input placeholder="SSL (true|false)" value={String(config.ssl ?? '')} onChange={(e) => setConfig({ ...config, ssl: e.target.value === 'true' })} />
            </div>
          </div>
        </>
      )}

      {subtype === 'mongodb' && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Parameters</h4>
            <div className="grid grid-cols-1 gap-3">
              <Select value={config.operation || 'find'} onValueChange={(v) => setConfig({ ...config, operation: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="find">Find</SelectItem>
                  <SelectItem value="insert">Insert</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Collection" value={config.collection || ''} onChange={(e) => setConfig({ ...config, collection: e.target.value })} />
              {config.operation === 'find' && (
                <Textarea rows={3} placeholder='Filter JSON, e.g., {"status":"active"}' value={config.filter || ''} onChange={(e) => setConfig({ ...config, filter: e.target.value })} />
              )}
              {config.operation === 'insert' && (
                <Textarea rows={3} placeholder='Document JSON' value={config.document || ''} onChange={(e) => setConfig({ ...config, document: e.target.value })} />
              )}
              {config.operation === 'update' && (
                <>
                  <Textarea rows={3} placeholder='Filter JSON' value={config.filter || ''} onChange={(e) => setConfig({ ...config, filter: e.target.value })} />
                  <Textarea rows={3} placeholder='Update JSON, e.g., {"$set":{"status":"active"}}' value={config.update || ''} onChange={(e) => setConfig({ ...config, update: e.target.value })} />
                </>
              )}
              {config.operation === 'delete' && (
                <Textarea rows={3} placeholder='Filter JSON' value={config.filter || ''} onChange={(e) => setConfig({ ...config, filter: e.target.value })} />
              )}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-3">Connection</h4>
            <div className="grid grid-cols-1 gap-2">
              <Input placeholder="MongoDB URI" value={config.uri || ''} onChange={(e) => setConfig({ ...config, uri: e.target.value })} />
            </div>
          </div>
        </>
      )}

      {subtype === 'redis' && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Parameters</h4>
            <div className="grid grid-cols-1 gap-3">
              <Select value={config.command || 'get'} onValueChange={(v) => setConfig({ ...config, command: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="get">GET</SelectItem>
                  <SelectItem value="set">SET</SelectItem>
                  <SelectItem value="del">DEL</SelectItem>
                  <SelectItem value="incr">INCR</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Key" value={config.key || ''} onChange={(e) => setConfig({ ...config, key: e.target.value })} />
              {(config.command === 'set') && (
                <>
                  <Input placeholder="Value" value={config.value || ''} onChange={(e) => setConfig({ ...config, value: e.target.value })} />
                  <Input placeholder="TTL (seconds)" type="number" value={config.ttl || ''} onChange={(e) => setConfig({ ...config, ttl: Number(e.target.value) })} />
                </>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-3">Connection</h4>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Host" value={config.host || ''} onChange={(e) => setConfig({ ...config, host: e.target.value })} />
              <Input placeholder="Port" type="number" value={config.port || 6379} onChange={(e) => setConfig({ ...config, port: Number(e.target.value) })} />
              <Input placeholder="Password (optional)" type="password" value={config.password || ''} onChange={(e) => setConfig({ ...config, password: e.target.value })} />
            </div>
          </div>
        </>
      )}
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={handleTestCredentials} disabled={testing}>
          {testing ? 'Testing…' : 'Test credentials'}
        </Button>
        {testStatus && (
          <span className={testStatus.ok ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>
            {testStatus.field ? `${testStatus.field}: ` : ''}{testStatus.message}
          </span>
        )}
      </div>
    </div>
  );

  const renderAIConfig = () => (
    <div className="space-y-4">
      {subtype === 'openai' && (
        <>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="openai-api-key">
                API Key <span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowOpenAIApiKey(!showOpenAIApiKey)}
                className="h-6 w-6 p-0"
              >
                {showOpenAIApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Input
              id="openai-api-key"
              type={showOpenAIApiKey ? 'text' : 'password'}
              value={config.apiKey || ''}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="sk-..."
              className={getRequiredFieldStatus('apiKey')}
            />
            {isNewNode && !config.apiKey && (
              <p className="text-xs text-red-500 mt-1">API key is required for OpenAI</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">platform.openai.com/api-keys</a>
            </p>
          </div>
          <div>
            <Label htmlFor="openai-organization">
              Organization ID (Optional)
            </Label>
            <Input
              id="openai-organization"
              type="text"
              value={config.organization || ''}
              onChange={(e) => setConfig({ ...config, organization: e.target.value })}
              placeholder="org-..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional: Your OpenAI organization ID
            </p>
          </div>
          <div>
            <Label htmlFor="openai-model">
              Model
            </Label>
            <Select 
              value={config.model || 'openai/gpt-4o-mini'} 
              onValueChange={(value) => setConfig({ ...config, model: value })}
            >
              <SelectTrigger className={getRequiredFieldStatus('model')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai/gpt-4o-mini">gpt-4o-mini</SelectItem>
                <SelectItem value="openai/gpt-4o">gpt-4o</SelectItem>
                <SelectItem value="anthropic/claude-3-haiku">Claude 3 Haiku</SelectItem>
                <SelectItem value="meta-llama/llama-3.1-8b-instruct">Llama 3.1 8B</SelectItem>
              </SelectContent>
            </Select>
            {isNewNode && !config.model && (
              <p className="text-xs text-red-500 mt-1">This field is required</p>
            )}
          </div>
          <div>
            <Label htmlFor="user-prompt">
              User Prompt
            </Label>
            <Textarea
              id="user-prompt"
              value={config.userPrompt || ''}
              onChange={(e) => setConfig({ ...config, userPrompt: e.target.value })}
              placeholder="What should the AI do? e.g., 'Write a poem about coding'"
              rows={4}
              className={getRequiredFieldStatus('userPrompt')}
            />
            {isNewNode && !config.userPrompt && (
              <p className="text-xs text-red-500 mt-1">This field is required</p>
            )}
          </div>
          <div>
            <Label htmlFor="max-tokens">Max Tokens</Label>
            <Input
              id="max-tokens"
              type="number"
              min="100"
              max="4000"
              step="100"
              value={config.maxTokens || '1000'}
              onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) || 1000 })}
            />
          </div>
          <div>
            <Label htmlFor="temperature">Temperature</Label>
            <Input
              id="temperature"
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature || '0.7'}
              onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) || 0.7 })}
            />
          </div>
          {getValidationMessage()}
        </>
      )}

      {subtype === 'anthropic' && (
        <>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="anthropic-api-key">
                API Key <span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAnthropicApiKey(!showAnthropicApiKey)}
                className="h-6 w-6 p-0"
              >
                {showAnthropicApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Input
              id="anthropic-api-key"
              type={showAnthropicApiKey ? 'text' : 'password'}
              value={config.apiKey || ''}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="sk-ant-..."
              className={getRequiredFieldStatus('apiKey')}
            />
            {isNewNode && !config.apiKey && (
              <p className="text-xs text-red-500 mt-1">API key is required for Anthropic Claude</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Get your API key from <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">console.anthropic.com/settings/keys</a>
            </p>
          </div>
          <div>
            <Label htmlFor="claude-model">
              Model <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={config.model || 'claude-3.5-sonnet'} 
              onValueChange={(value) => setConfig({ ...config, model: value })}
            >
              <SelectTrigger className={getRequiredFieldStatus('model')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-3.5-sonnet">Claude 3.5 Sonnet</SelectItem>
                <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
              </SelectContent>
            </Select>
            {isNewNode && !config.model && (
              <p className="text-xs text-red-500 mt-1">This field is required</p>
            )}
          </div>
          <div>
            <Label htmlFor="claude-prompt">
              User Prompt <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="claude-prompt"
              value={config.userPrompt || ''}
              onChange={(e) => setConfig({ ...config, userPrompt: e.target.value })}
              placeholder="What should Claude do?"
              rows={4}
              className={getRequiredFieldStatus('userPrompt')}
            />
            {isNewNode && !config.userPrompt && (
              <p className="text-xs text-red-500 mt-1">This field is required</p>
            )}
          </div>
          <div>
            <Label htmlFor="claude-system">System Message (Optional)</Label>
            <Textarea
              id="claude-system"
              value={config.systemMessage || ''}
              onChange={(e) => setConfig({ ...config, systemMessage: e.target.value })}
              placeholder="You are Claude, an AI assistant..."
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="claude-temp">Temperature</Label>
            <Input
              id="claude-temp"
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={config.temperature || '0.7'}
              onChange={(e) => setConfig({ ...config, temperature: e.target.value })}
            />
          </div>
          {getValidationMessage()}
        </>
      )}

      {subtype === 'gemini' && (
        <>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="gemini-api-key">
                API Key <span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowGeminiApiKey(!showGeminiApiKey)}
                className="h-6 w-6 p-0"
              >
                {showGeminiApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Input
              id="gemini-api-key"
              type={showGeminiApiKey ? 'text' : 'password'}
              value={config.apiKey || ''}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="AIza..."
              className={getRequiredFieldStatus('apiKey')}
            />
            {isNewNode && !config.apiKey && (
              <p className="text-xs text-red-500 mt-1">API key is required for Google Gemini</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">makersuite.google.com/app/apikey</a>
            </p>
          </div>
          <div>
            <Label htmlFor="gemini-model">
              Model <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={config.model || 'gemini-1.5-flash'} 
              onValueChange={(value) => setConfig({ ...config, model: value })}
            >
              <SelectTrigger className={getRequiredFieldStatus('model')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-1.5-flash">gemini-1.5-flash</SelectItem>
                <SelectItem value="gemini-1.5-pro">gemini-1.5-pro</SelectItem>
              </SelectContent>
            </Select>
            {isNewNode && !config.model && (
              <p className="text-xs text-red-500 mt-1">This field is required</p>
            )}
          </div>
          <div>
            <Label htmlFor="gemini-prompt">
              User Prompt <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="gemini-prompt"
              value={config.userPrompt || ''}
              onChange={(e) => setConfig({ ...config, userPrompt: e.target.value })}
              placeholder="What should Gemini do?"
              rows={4}
              className={getRequiredFieldStatus('userPrompt')}
            />
            {isNewNode && !config.userPrompt && (
              <p className="text-xs text-red-500 mt-1">This field is required</p>
            )}
          </div>
          <div>
            <Label htmlFor="gemini-system">System Instruction (Optional)</Label>
            <Textarea
              id="gemini-system"
              value={config.systemPrompt || ''}
              onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
              placeholder="You are a helpful assistant..."
              rows={3}
            />
          </div>
          {getValidationMessage()}
        </>
      )}

      {subtype === 'openrouter' && (
        <>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="openrouter-api-key">
                API Key <span className="text-gray-500 text-xs">(Optional - can use env var)</span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowApiKey(!showApiKey)}
                className="h-6 w-6 p-0"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Input
              id="openrouter-api-key"
              type={showApiKey ? 'text' : 'password'}
              value={config.apiKey || ''}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="sk-or-v1-... (or set OPENROUTER_API_KEY in backend env)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to use OPENROUTER_API_KEY from backend environment, or get your API key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">openrouter.ai/keys</a>
            </p>
          </div>
          <div>
            <Label htmlFor="openrouter-model">
              Provider/Model
            </Label>
            <Select 
              value={config.model || 'openai/gpt-4o-mini'} 
              onValueChange={(value) => setConfig({ ...config, model: value })}
            >
              <SelectTrigger className={getRequiredFieldStatus('model')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai/gpt-4o-mini">gpt-4o-mini</SelectItem>
                <SelectItem value="openai/gpt-4o">gpt-4o</SelectItem>
                <SelectItem value="anthropic/claude-3-haiku">Claude 3 Haiku</SelectItem>
                <SelectItem value="meta-llama/llama-3.1-8b-instruct">Llama 3.1 8B</SelectItem>
              </SelectContent>
            </Select>
            {isNewNode && !config.model && (
              <p className="text-xs text-red-500 mt-1">This field is required</p>
            )}
          </div>
          <div>
            <Label htmlFor="openrouter-prompt">
              User Prompt <span className="text-gray-500 text-xs">(Optional - can come from previous node)</span>
            </Label>
            <Textarea
              id="openrouter-prompt"
              value={config.userPrompt || ''}
              onChange={(e) => setConfig({ ...config, userPrompt: e.target.value })}
              placeholder="Leave empty to use input from Manual Trigger, or enter your prompt here..."
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              If left empty, OpenRouter will use the prompt from the connected Manual Trigger node.
            </p>
          </div>
          <div>
            <Label htmlFor="openrouter-max-tokens">Max Tokens</Label>
            <Input
              id="openrouter-max-tokens"
              type="number"
              min="100"
              max="4000"
              step="100"
              value={config.maxTokens || '1000'}
              onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) || 1000 })}
            />
          </div>
          <div>
            <Label htmlFor="openrouter-temp">Temperature</Label>
            <Input
              id="openrouter-temp"
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature || '0.7'}
              onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) || 0.7 })}
            />
          </div>
          {getValidationMessage()}
        </>
      )}


      {subtype === 'condition' && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Parameters</h4>
            <div className="grid grid-cols-1 gap-3">
              <Textarea rows={3} placeholder="Expression (JS, returns boolean). Example: input.value > 100" value={config.expression || config.condition || ''} onChange={(e) => setConfig({ ...config, expression: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="True label" value={config.trueLabel || ''} onChange={(e) => setConfig({ ...config, trueLabel: e.target.value })} />
                <Input placeholder="False label" value={config.falseLabel || ''} onChange={(e) => setConfig({ ...config, falseLabel: e.target.value })} />
              </div>
            </div>
          </div>
        </>
      )}

      {subtype === 'merge' && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Parameters</h4>
            <div className="grid grid-cols-1 gap-3">
              <Select value={config.mergeStrategy || 'combine'} onValueChange={(v) => setConfig({ ...config, mergeStrategy: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="combine">Combine (default)</SelectItem>
                  <SelectItem value="all">Wait for all</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {(subtype === 'split' || subtype === 'loop') && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Parameters</h4>
            <div className="grid grid-cols-1 gap-3">
              <Input placeholder="Items Path (optional, e.g., input.items)" value={config.itemsPath || ''} onChange={(e) => setConfig({ ...config, itemsPath: e.target.value })} />
              <Input placeholder="Count/Limit (optional)" type="number" value={config.count ?? config.limit ?? ''} onChange={(e) => setConfig({ ...config, count: Number(e.target.value), limit: Number(e.target.value) })} />
            </div>
          </div>
        </>
      )}

      {subtype === 'stripe' && (
        <>
          <div className="border-b border-border pb-3">
            <h4 className="font-medium text-sm mb-3">Parameters</h4>
            <div className="grid grid-cols-1 gap-3">
              <Select value={config.operation || 'createCharge'} onValueChange={(v) => setConfig({ ...config, operation: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createCharge">Create Charge</SelectItem>
                  <SelectItem value="createCustomer">Create Customer</SelectItem>
                </SelectContent>
              </Select>
              {config.operation === 'createCharge' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Amount (cents)" type="number" value={config.amount || ''} onChange={(e) => setConfig({ ...config, amount: Number(e.target.value) })} />
                    <Input placeholder="Currency (e.g., usd)" value={config.currency || ''} onChange={(e) => setConfig({ ...config, currency: e.target.value })} />
                  </div>
                  <Input placeholder="Description (optional)" value={config.description || ''} onChange={(e) => setConfig({ ...config, description: e.target.value })} />
                </>
              )}
              {config.operation === 'createCustomer' && (
                <>
                  <Input placeholder="Email" value={config.email || ''} onChange={(e) => setConfig({ ...config, email: e.target.value })} />
                  <Input placeholder="Name" value={config.name || ''} onChange={(e) => setConfig({ ...config, name: e.target.value })} />
                </>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-3">Authentication</h4>
            <div className="grid grid-cols-1 gap-2">
              <Input placeholder="Stripe API Key" value={config.apiKey || ''} onChange={(e) => setConfig({ ...config, apiKey: e.target.value })} />
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderUtilityConfig = () => {
    // Get connected nodes to show available inputs for Code node
    const getConnectedInputNodes = () => {
      if (!nodes || !selectedNode) return [];
      // This would require access to edges, but for now we'll show general info
      return [];
    };

    return (
    <div className="space-y-4">
      {(subtype === 'code' || nodeType === 'code') && (
        <>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">📥 Available Inputs</h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
              Access data from previous nodes using these variables in your code:
            </p>
            <div className="space-y-2 text-xs font-mono bg-white dark:bg-gray-900 p-3 rounded border border-blue-200 dark:border-blue-800">
              <div><span className="text-blue-600 dark:text-blue-400">input</span> - Previous node output (object)</div>
              <div><span className="text-blue-600 dark:text-blue-400">inputs</span> - Previous node output (alias, includes convenience properties)</div>
              <div><span className="text-blue-600 dark:text-blue-400">inputs.apiResponse</span> - API response from HTTP Request nodes (maps to input.data)</div>
              <div><span className="text-blue-600 dark:text-blue-400">inputs.data</span> - Direct access to data field</div>
              <div><span className="text-blue-600 dark:text-blue-400">apiResponse</span> - Direct access to API response</div>
              <div><span className="text-blue-600 dark:text-blue-400">variables</span> - Workflow variables</div>
              <div><span className="text-blue-600 dark:text-blue-400">$input.all()</span> - Get all input items as array</div>
              <div><span className="text-blue-600 dark:text-blue-400">$input.first()</span> - Get first input item</div>
              <div><span className="text-blue-600 dark:text-blue-400">$input.item(index)</span> - Get item at index</div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Example:</p>
              <pre className="text-xs bg-white dark:bg-gray-900 p-2 rounded border border-blue-200 dark:border-blue-800 overflow-auto max-h-96">
{`const response = inputs.apiResponse || input.data;
const content = response?.choices?.[0]?.message?.content;
return {
  rawResponse: response,
  outputText: content
};`}
              </pre>
            </div>
          </div>
        </>
      )}
      {subtype === 'condition' && (
        <>
          <div>
            <Label htmlFor="condition">Condition (JavaScript)</Label>
            <Textarea
              id="condition"
              value={config.condition || ''}
              onChange={(e) => setConfig({ ...config, condition: e.target.value })}
              placeholder="// Return true or false
return input.value > 100;"
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="true-path">True Path Label</Label>
            <Input
              id="true-path"
              value={config.truePath || 'Yes'}
              onChange={(e) => setConfig({ ...config, truePath: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="false-path">False Path Label</Label>
            <Input
              id="false-path"
              value={config.falsePath || 'No'}
              onChange={(e) => setConfig({ ...config, falsePath: e.target.value })}
            />
          </div>
          {getValidationMessage()}
        </>
      )}
    </div>
    );
  };


  function getNested(obj: any, path: string): any {
    if (!path) return undefined;
    return path.split('.').reduce((acc: any, key: string) => (acc ? acc[key] : undefined), obj);
  }

  function setNested(obj: any, path: string, value: any): any {
    const parts = path.split('.');
    const clone = { ...obj };
    let cur: any = clone;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      cur[k] = typeof cur[k] === 'object' && cur[k] !== null ? { ...cur[k] } : {};
      cur = cur[k];
    }
    cur[parts[parts.length - 1]] = value;
    return clone;
  }

  const renderSchemaParameters = () => {
    // Priority: Use n8n schema if available, otherwise fall back to static schema
    let schema: any = null;
    
    if (isN8nCompatible && n8nSchema) {
      // Use n8n schema - filter fields based on displayOptions
      const filteredFields = filterFieldsByDisplayOptions(n8nSchema.fields, config);
      schema = {
        ...n8nSchema,
        fields: filteredFields
      };
    } else {
      // Fall back to static schema - filter fields based on displayOptions
      const staticSchema = subtypeKey ? nodeParameterSchemas[subtypeKey] : undefined;
      if (staticSchema) {
        const filteredFields = filterFieldsByDisplayOptions(staticSchema.fields, config);
        schema = {
          ...staticSchema,
          fields: filteredFields
        };
      } else {
        schema = undefined;
      }
    }

    if (!schema) {
      return (
        <div className="border-t border-border pt-4 mt-4">
          <h4 className="font-medium text-sm mb-2">Parameters</h4>
          {loadingSchema ? (
            <p className="text-xs text-muted-foreground">Loading node parameters...</p>
          ) : (
            <p className="text-xs text-muted-foreground">No predefined parameters for this node. Set the node subtype to a known integration to see parameters.</p>
          )}
        </div>
      );
    }

    const handleFieldChange = (field: FieldSchema, value: any) => {
      // Handle credential fields - store in node.data.credentials
      if (field.type === 'credentialSelect') {
        const currentCredentials = selectedNode?.data?.credentials || {};
        const credentialName = value ? `Credential ${value.substring(0, 8)}` : undefined; // Simplified - in production, fetch actual name
        const updatedCredentials = {
          ...currentCredentials,
          [field.key]: value ? { id: value, name: credentialName } : undefined
        };
        // Remove undefined entries
        Object.keys(updatedCredentials).forEach(key => {
          if (updatedCredentials[key] === undefined) {
            delete updatedCredentials[key];
          }
        });
        const updatedData = { ...selectedNode.data, credentials: updatedCredentials };
        onSave({ ...selectedNode, data: updatedData });
        return;
      }

      // Extract the config key from field.key (e.g., "config.operation" -> "operation")
      if (field.key.startsWith('config.')) {
        const configKey = field.key.substring(7); // Remove "config." prefix
        const updatedConfig = { ...config, [configKey]: value };
        setConfig(updatedConfig);
        
        // For file uploads, immediately persist to node to ensure data is saved
        // This is important because file data can be large and we want to ensure it's saved
        if (field.type === 'file' && value) {
          const updatedData = { ...selectedNode.data, config: updatedConfig };
          console.log('Immediately saving file upload to node:', { configKey, hasValue: !!value, valueLength: typeof value === 'string' ? value.length : 'N/A' });
          onSave({ ...selectedNode, data: updatedData });
        }
      } else if (field.key.startsWith('options.')) {
        // Handle options fields
        const optionsKey = field.key.substring(8); // Remove "options." prefix
        const currentOptions = selectedNode?.data?.options || {};
        const updatedData = { ...selectedNode.data, options: { ...currentOptions, [optionsKey]: value } };                                                      
        onSave({ ...selectedNode, data: updatedData });
      } else if (field.key.startsWith('communication.')) {
        // Handle communication fields (for Gmail node)
        const communicationKey = field.key.substring(14); // Remove "communication." prefix
        
        // Validate email fields
        const emailFields = ['toEmail', 'cc', 'bcc', 'from', 'replyTo'];
        if (emailFields.includes(communicationKey) && value) {
          const error = communicationKey === 'toEmail' || communicationKey === 'from' || communicationKey === 'replyTo'
            ? validateEmail(value, field.label || communicationKey)
            : validateEmails(value, field.label || communicationKey);
          
          if (error) {
            // Show error but don't block - let backend handle final validation
            console.warn(error);
            // Optionally show a toast/alert here
          }
        }
        
        const currentCommunication = selectedNode?.data?.communication || {};
        const updatedData = { ...selectedNode.data, communication: { ...currentCommunication, [communicationKey]: value } };
        onSave({ ...selectedNode, data: updatedData });
      } else {
        // For other nested paths, use setNested
        const updatedData = setNested(selectedNode.data, field.key, value);
        onSave({ ...selectedNode, data: updatedData });
      }
    };


    return (
      <div className="border-t border-border pt-4 mt-4">
        <h4 className="font-medium text-sm mb-3">{schema.title}</h4>
        
        {/* Gmail OAuth Connection Section */}
        {shouldShowOAuthSection && (
          <div className="mb-4 p-4 border border-border rounded-md bg-surface-elevated">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h5 className="font-medium text-sm flex items-center gap-2">
                    🔐 Google OAuth Connection
                    {gmailOAuthStatus.loading ? (
                      <span className="text-xs text-muted-foreground">Checking...</span>
                    ) : gmailOAuthStatus.connected ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20 text-xs">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Connected
                      </Badge>
                    )}
                  </h5>
                  {gmailOAuthStatus.connected && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        setGmailOAuthStatus(prev => ({ ...prev, loading: true }));
                      const token = localStorage.getItem('auth_token');
                      if (!token) {
                        setGmailOAuthStatus({ connected: false, loading: false });
                        return;
                      }
                      const backendUrl = API_CONFIG.baseUrl;
                      try {
                        const response = await fetch(`${backendUrl.replace(/\/$/, '')}/api/auth/oauth/status?provider=google`, {
                          method: 'GET',
                          headers: {
                            'Authorization': `Bearer ${token.trim()}`,
                            'Content-Type': 'application/json'
                          }
                        });
                        if (response.ok) {
                          const data = await response.json();
                          const status = data?.status;
                          
                          // Explicitly check for true - only true if explicitly true
                          const isConnected = status && typeof status === 'object' && status.connected === true;
                          
                          setGmailOAuthStatus({ 
                            connected: isConnected,
                            loading: false 
                          });
                        } else {
                          setGmailOAuthStatus({ connected: false, loading: false });
                        }
                      } catch (error) {
                        logger.error('Failed to refresh OAuth status', error as Error);
                        setGmailOAuthStatus({ connected: false, loading: false });
                      }
                      }}
                      className="h-6 px-2 text-xs"
                      title="Refresh connection status"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {gmailOAuthStatus.connected 
                    ? 'Your Google account is connected. You can now use Gmail operations.'
                    : 'Connect your Google account to access Gmail. You only need to do this once.'}
                </p>
                {!gmailOAuthStatus.connected && (
                  <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-600 dark:text-yellow-400">
                    <p className="font-medium mb-1">⚠️ Getting "Access blocked" error?</p>
                    <p className="text-muted-foreground">
                      If you see "Access blocked: test has not completed the Google verification process", 
                      the OAuth app is in Testing mode. Ask the administrator to add your email as a test user in 
                      <a 
                        href="https://console.cloud.google.com/apis/credentials/consent" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline ml-1"
                      >
                        Google Cloud Console
                      </a>
                      {' '}or publish the app.
                    </p>
                  </div>
                )}
              </div>
            </div>
            {!gmailOAuthStatus.connected && (
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  const token = localStorage.getItem('auth_token');
                  if (!token || token.trim().length === 0) {
                    alert('You must be logged in to connect Google. Please log in first.');
                    return;
                  }
                  
                  try {
                    const backendUrl = API_CONFIG.baseUrl;
                    const r = await fetch(`${backendUrl.replace(/\/$/, '')}/api/auth/oauth/google`, {
                      method: 'GET',
                      credentials: 'include',
                      headers: {
                        'Authorization': `Bearer ${token.trim()}`,
                        'Content-Type': 'application/json'
                      }
                    });
                    
                    const data = await r.json();
                    if (!r.ok) {
                      throw new Error(data?.error || data?.message || `HTTP ${r.status}`);
                    }
                    
                    if (data?.authUrl) {
                      // Store current page URL to return after OAuth (use pathname + search to avoid full URL issues)
                      const returnPath = window.location.pathname + window.location.search;
                      localStorage.setItem('oauth_return_url', returnPath);
                      
                      // Open OAuth in a new tab (not popup)
                      window.open(data.authUrl, '_blank');
                      
                      // Set up listener to check status when window regains focus (user returns from OAuth tab)
                      let checkInterval: NodeJS.Timeout | null = null;
                      let isChecking = false;
                      let isConnectedRef = false; // Track connection to stop checking once connected
                      
                      const checkConnectionStatus = async () => {
                        // Don't check if already connected or already checking
                        if (isConnectedRef || isChecking) return false;
                        isChecking = true;
                        
                        try {
                          // Wait a bit to allow OAuth callback to complete
                          await new Promise(resolve => setTimeout(resolve, 2000));
                          
                          const statusResponse = await fetch(`${backendUrl.replace(/\/$/, '')}/api/auth/oauth/status?provider=google`, {
                            method: 'GET',
                            headers: {
                              'Authorization': `Bearer ${token.trim()}`,
                              'Content-Type': 'application/json'
                            }
                          });
                          if (statusResponse.ok) {
                            const statusData = await statusResponse.json();
                            // Backend returns: { success: true, status: { connected: true/false, ... } }
                            const status = statusData?.status;
                            
                            // Explicitly check for true - only true if explicitly true
                            const isConnected = status && typeof status === 'object' && status.connected === true;
                            
                            if (isConnected) {
                              isConnectedRef = true; // Mark as connected
                              setGmailOAuthStatus({ 
                                connected: true,
                                loading: false 
                              });
                              // Clean up - stop all checking
                              if (checkInterval) {
                                clearInterval(checkInterval);
                                checkInterval = null;
                              }
                              window.removeEventListener('focus', handleFocusWithDelay);
                              document.removeEventListener('visibilitychange', handleVisibilityChangeWithDelay);
                              isChecking = false;
                              return true; // Connected
                            }
                          }
                        } catch (e) {
                          // Ignore errors
                        }
                        isChecking = false;
                        return false; // Not connected yet
                      };
                      
                      // Check status when window regains focus (user returns from OAuth tab)
                      const handleFocusWithDelay = async () => {
                        if (!isConnectedRef) {
                          await checkConnectionStatus();
                        }
                      };
                      
                      // Also check when tab becomes visible
                      const handleVisibilityChangeWithDelay = async () => {
                        if (!document.hidden && !isConnectedRef) {
                          await checkConnectionStatus();
                        }
                      };
                      
                      window.addEventListener('focus', handleFocusWithDelay);
                      document.addEventListener('visibilitychange', handleVisibilityChangeWithDelay);
                      
                      // Also check periodically in case user doesn't switch tabs
                      // Start checking after a 3 second delay to allow OAuth callback to complete
                      setTimeout(() => {
                        if (!isConnectedRef) {
                          checkInterval = setInterval(async () => {
                            if (!isConnectedRef) {
                              const connected = await checkConnectionStatus();
                              if (connected && checkInterval) {
                                clearInterval(checkInterval);
                                checkInterval = null;
                              }
                            } else if (checkInterval) {
                              clearInterval(checkInterval);
                              checkInterval = null;
                            }
                          }, 3000); // Check every 3 seconds
                        }
                      }, 3000); // Wait 3 seconds before starting periodic checks
                      
                      // Clean up interval and listener after 5 minutes
                      setTimeout(() => {
                        if (checkInterval) {
                          clearInterval(checkInterval);
                          checkInterval = null;
                        }
                        window.removeEventListener('focus', handleFocusWithDelay);
                        document.removeEventListener('visibilitychange', handleVisibilityChangeWithDelay);
                      }, 5 * 60 * 1000);
                    } else {
                      throw new Error('No auth URL received from server');
                    }
                  } catch (error: any) {
                    alert(`Failed to connect Google: ${error.message || 'Unknown error'}`);
                    logger.error('Google OAuth initiation failed', error as Error);
                  }
                }}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect to Google
              </Button>
            )}
          </div>
        )}

        <div className="space-y-3">
          {schema.fields.map((field) => {
            // Get current value from config state if it's a config field, otherwise from selectedNode.data                                                     
            let current: any;
            if (field.type === 'credentialSelect') {
              // Credentials are stored in node.data.credentials[field.key].id
              const credential = selectedNode?.data?.credentials?.[field.key];
              current = credential?.id || null;
            } else if (field.key.startsWith('config.')) {
              const configKey = field.key.substring(7); // Remove "config." prefix                                                                              
              current = config[configKey];
            } else if (field.key.startsWith('communication.')) {
              // Handle communication fields (for Gmail node)
              const communicationKey = field.key.substring(14); // Remove "communication." prefix
              current = selectedNode?.data?.communication?.[communicationKey];
            } else {
              current = getNested(selectedNode.data, field.key);
            }
            // Check if field is actually required based on displayOptions and current config
            // A field marked as required in schema might not be required if it's hidden by displayOptions
            const isFieldVisible = !field.displayOptions || evaluateDisplayOptions(field.displayOptions, config);
            const isActuallyRequired = field.required && isFieldVisible;
            const requiredMark = isActuallyRequired ? ' *' : '';
            // Check if field should be password type (accessToken, writeKey, apiKey, password, etc.)
            const isPasswordField = field.password === true ||
                                    field.key.toLowerCase().includes('token') || 
                                    field.key.toLowerCase().includes('key') || 
                                    field.key.toLowerCase().includes('password') ||
                                    field.key.toLowerCase().includes('secret');
            
            if (field.type === 'string' || field.type === 'number') {
              // Check if this is Segment Write Key field to add helper link
              const isSegmentWriteKey = field.key === 'config.writeKey' && subtypeKey === 'segment';
              
              // Check if this field should support variable expressions (for fields that can reference previous nodes)
              // Fields like messageId, threadId, draftId, labelId, query, pageToken, and email content fields should support variable selection
              const supportsVariables = field.type === 'string' && (
                field.key.includes('messageId') || 
                field.key.includes('threadId') || 
                field.key.includes('draftId') ||
                field.key.includes('labelId') ||
                field.key.includes('emailId') ||
                field.key.includes('pageToken') ||
                field.key.includes('query') ||
                field.key.includes('toEmail') ||
                field.key.includes('subject') ||
                field.key.includes('replyToMessageId') ||
                field.key.includes('id') ||
                field.placeholder?.includes('{{') ||
                field.placeholder?.includes('previousNode') ||
                field.placeholder?.includes('from previous')
              );
              
              // Get previous nodes for variable selector
              const previousNodes = nodes.filter(n => n.id !== selectedNode.id && n.id);
              
              return (
                <div key={field.key}>
                  <Label>{field.label}{requiredMark && <span className="text-red-500"> *</span>}</Label>
                  <div className="relative">
                    <Input
                      value={current ?? ''}
                      type={field.type === 'number' ? 'number' : (isPasswordField ? 'password' : 'text')}
                      placeholder={field.placeholder}
                      onChange={(e) => handleFieldChange(field, field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                      className={isActuallyRequired && !current ? 'border-red-500' : ''}
                    />
                    {field.key === 'config.dataSource' && subtypeKey === 'data-analyzer' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Match this to your file type. CSV uploads should use CSV; JSON payloads should use JSON. The backend will auto-switch if the path ends with .csv or .json.
                      </p>
                    )}
                    {field.key === 'config.provider' && subtypeKey === 'data-analyzer' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose which key to use: OpenAI, OpenRouter, or Gemini. Provide the matching API key.
                      </p>
                    )}
                    {field.key === 'config.dataPath' && subtypeKey === 'data-analyzer' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave blank to auto-use filePath/fileInfo.path from an upstream File Upload or other node output.
                      </p>
                    )}
                    {supportsVariables && previousNodes.length > 0 && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (value) {
                              // Insert the expression at cursor position or replace selection
                              const input = document.querySelector(`input[placeholder="${field.placeholder}"]`) as HTMLInputElement;
                              if (input) {
                                const start = input.selectionStart || 0;
                                const end = input.selectionEnd || 0;
                                const currentValue = current || '';
                                const newValue = currentValue.substring(0, start) + value + currentValue.substring(end);
                                handleFieldChange(field, newValue);
                                // Set cursor position after inserted text
                                setTimeout(() => {
                                  input.focus();
                                  input.setSelectionRange(start + value.length, start + value.length);
                                }, 0);
                              } else {
                                handleFieldChange(field, (current || '') + value);
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent hover:bg-muted">
                            <span className="text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer">{"{}"}</span>
                          </SelectTrigger>
                          <SelectContent className="max-h-96 overflow-auto">
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Previous Nodes</div>
                            {previousNodes.map((node) => {
                              const nodeLabel = node.data?.label || node.type || node.id;
                              const nodeSubtype = node.data?.subtype || '';
                              const nodeOperation = node.data?.config?.operation || '';
                              const isGmailNode = nodeSubtype === 'gmail' || node.type === 'gmail';
                              
                              // Determine which fields are available based on Gmail operation
                              const getGmailFields = () => {
                                const fields: JSX.Element[] = [];
                                
                                // Fields available from List Messages operation
                                if (nodeOperation === 'listMessages' || nodeLabel.toLowerCase().includes('list messages')) {
                                  fields.push(
                                    <SelectItem key={`${node.id}-messages-0-id`} value={`{{steps.${node.id}.output.messages[0].id}}`}>
                                      messages[0].id
                                    </SelectItem>
                                  );
                                  fields.push(
                                    <SelectItem key={`${node.id}-messages-0-threadId`} value={`{{steps.${node.id}.output.messages[0].threadId}}`}>
                                      messages[0].threadId
                                    </SelectItem>
                                  );
                                  fields.push(
                                    <SelectItem key={`${node.id}-nextPageToken`} value={`{{steps.${node.id}.output.nextPageToken}}`}>
                                      nextPageToken
                                    </SelectItem>
                                  );
                                }
                                
                                // Fields available from Get Message operation
                                if (nodeOperation === 'get' || nodeLabel.toLowerCase().includes('get message')) {
                                  fields.push(
                                    <SelectItem key={`${node.id}-messageId`} value={`{{steps.${node.id}.output.messageId}}`}>
                                      messageId ⭐
                                    </SelectItem>
                                  );
                                  fields.push(
                                    <SelectItem key={`${node.id}-threadId`} value={`{{steps.${node.id}.output.threadId}}`}>
                                      threadId
                                    </SelectItem>
                                  );
                                  fields.push(
                                    <SelectItem key={`${node.id}-subject`} value={`{{steps.${node.id}.output.subject}}`}>
                                      subject
                                    </SelectItem>
                                  );
                                  fields.push(
                                    <SelectItem key={`${node.id}-from`} value={`{{steps.${node.id}.output.from}}`}>
                                      from
                                    </SelectItem>
                                  );
                                  fields.push(
                                    <SelectItem key={`${node.id}-to`} value={`{{steps.${node.id}.output.to}}`}>
                                      to
                                    </SelectItem>
                                  );
                                  fields.push(
                                    <SelectItem key={`${node.id}-body`} value={`{{steps.${node.id}.output.body}}`}>
                                      body
                                    </SelectItem>
                                  );
                                  fields.push(
                                    <SelectItem key={`${node.id}-text`} value={`{{steps.${node.id}.output.text}}`}>
                                      text
                                    </SelectItem>
                                  );
                                  fields.push(
                                    <SelectItem key={`${node.id}-html`} value={`{{steps.${node.id}.output.html}}`}>
                                      html
                                    </SelectItem>
                                  );
                                }
                                
                                // Fields available from Create Draft operation
                                if (nodeOperation === 'createDraft' || nodeLabel.toLowerCase().includes('create draft')) {
                                  fields.push(
                                    <SelectItem key={`${node.id}-draftId`} value={`{{steps.${node.id}.output.draftId}}`}>
                                      draftId
                                    </SelectItem>
                                  );
                                }
                                
                                // Fields available from Create Label operation
                                if (nodeOperation === 'createLabel' || nodeLabel.toLowerCase().includes('create label')) {
                                  fields.push(
                                    <SelectItem key={`${node.id}-labelId`} value={`{{steps.${node.id}.output.labelId}}`}>
                                      labelId
                                    </SelectItem>
                                  );
                                }
                                
                                // If no specific operation match, show common fields for all Gmail nodes
                                if (fields.length === 0 && isGmailNode) {
                                  fields.push(
                                    <SelectItem key={`${node.id}-messageId`} value={`{{steps.${node.id}.output.messageId}}`}>
                                      messageId
                                    </SelectItem>
                                  );
                                  fields.push(
                                    <SelectItem key={`${node.id}-threadId`} value={`{{steps.${node.id}.output.threadId}}`}>
                                      threadId
                                    </SelectItem>
                                  );
                                  fields.push(
                                    <SelectItem key={`${node.id}-messages-0-id`} value={`{{steps.${node.id}.output.messages[0].id}}`}>
                                      messages[0].id
                                    </SelectItem>
                                  );
                                }
                                
                                return fields;
                              };
                              
                              return (
                                <div key={node.id}>
                                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-t">{nodeLabel}</div>
                                  {/* Gmail-specific outputs */}
                                  {isGmailNode && getGmailFields()}
                                  {/* Generic outputs for all nodes */}
                                  <SelectItem value={`{{steps.${node.id}.output.id}}`}>
                                    id
                                  </SelectItem>
                                  <SelectItem value={`{{steps.${node.id}.output.result}}`}>
                                    result
                                  </SelectItem>
                                  <SelectItem value={`{{steps.${node.id}.output.data}}`}>
                                    data
                                  </SelectItem>
                                  <SelectItem value={`{{steps.${node.id}.output}}`}>
                                    output (full)
                                  </SelectItem>
                                </div>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  {isSegmentWriteKey && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Find your Write Key in{' '}
                      <a 
                        href="https://app.segment.com/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-600 hover:underline"
                      >
                        Segment Dashboard
                      </a>
                      {' '}→ Connections → Sources → Settings → API Keys
                    </p>
                  )}
                  {isActuallyRequired && !current && !isSegmentWriteKey && (
                    <p className="text-xs text-red-500 mt-1">This field is required</p>
                  )}
                  {isActuallyRequired && !current && isSegmentWriteKey && (
                    <p className="text-xs text-red-500 mt-1">
                      This field is required. Get your Write Key from{' '}
                      <a 
                        href="https://app.segment.com/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-600 hover:underline"
                      >
                        Segment Dashboard
                      </a>
                    </p>
                  )}
                </div>
              );
            }
            if (field.type === 'textarea') {
              // Check if this textarea field should support variable expressions
              const supportsVariables = (
                field.key.includes('textContent') ||
                field.key.includes('htmlContent') ||
                field.key.includes('body') ||
                field.key.includes('content') ||
                field.key.includes('query') ||
                field.key.includes('message') ||
                field.placeholder?.includes('{{') ||
                field.placeholder?.includes('previousNode') ||
                field.placeholder?.includes('from previous')
              );
              
              // Get previous nodes for variable selector
              const previousNodes = nodes.filter(n => n.id !== selectedNode.id && n.id);
              
              return (
                <div key={field.key}>
                  <Label>{field.label}{requiredMark && <span className="text-red-500"> *</span>}</Label>
                  <div className="relative">
                    <Textarea
                      value={current ?? ''}
                      placeholder={field.placeholder}
                      rows={field.rows || 4}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                      className={field.key.toLowerCase().includes('json') || field.key.toLowerCase().includes('headers') || field.key.toLowerCase().includes('parameters') ? 'font-mono text-sm' : ''}
                    />
                    {supportsVariables && previousNodes.length > 0 && (
                      <div className="absolute right-2 top-2">
                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (value) {
                              // Insert the expression at cursor position or replace selection
                              const textarea = document.querySelector(`textarea[placeholder="${field.placeholder}"]`) as HTMLTextAreaElement;
                              if (textarea) {
                                const start = textarea.selectionStart || 0;
                                const end = textarea.selectionEnd || 0;
                                const currentValue = current || '';
                                const newValue = currentValue.substring(0, start) + value + currentValue.substring(end);
                                handleFieldChange(field, newValue);
                                // Set cursor position after inserted text
                                setTimeout(() => {
                                  textarea.focus();
                                  textarea.setSelectionRange(start + value.length, start + value.length);
                                }, 0);
                              } else {
                                handleFieldChange(field, (current || '') + value);
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent hover:bg-muted">
                            <span className="text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer">{"{}"}</span>
                          </SelectTrigger>
                          <SelectContent className="max-h-96 overflow-auto">
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Previous Nodes</div>
                            {previousNodes.map((node) => {
                              const nodeLabel = node.data?.label || node.type || node.id;
                              const nodeSubtype = node.data?.subtype || '';
                              const isGmailNode = nodeSubtype === 'gmail' || node.type === 'gmail';
                              
                              return (
                                <div key={node.id}>
                                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-t">{nodeLabel}</div>
                                  {/* Gmail-specific outputs */}
                                  {isGmailNode && (
                                    <>
                                      <SelectItem value={`{{steps.${node.id}.output.messages[0].id}}`}>
                                        messages[0].id
                                      </SelectItem>
                                      <SelectItem value={`{{steps.${node.id}.output.messages[0].threadId}}`}>
                                        messages[0].threadId
                                      </SelectItem>
                                      <SelectItem value={`{{steps.${node.id}.output.messageId}}`}>
                                        messageId
                                      </SelectItem>
                                      <SelectItem value={`{{steps.${node.id}.output.threadId}}`}>
                                        threadId
                                      </SelectItem>
                                      <SelectItem value={`{{steps.${node.id}.output.draftId}}`}>
                                        draftId
                                      </SelectItem>
                                      <SelectItem value={`{{steps.${node.id}.output.labelId}}`}>
                                        labelId
                                      </SelectItem>
                                      <SelectItem value={`{{steps.${node.id}.output.nextPageToken}}`}>
                                        nextPageToken
                                      </SelectItem>
                                      <SelectItem value={`{{steps.${node.id}.output.subject}}`}>
                                        subject
                                      </SelectItem>
                                      <SelectItem value={`{{steps.${node.id}.output.from}}`}>
                                        from
                                      </SelectItem>
                                      <SelectItem value={`{{steps.${node.id}.output.to}}`}>
                                        to
                                      </SelectItem>
                                      <SelectItem value={`{{steps.${node.id}.output.body}}`}>
                                        body
                                      </SelectItem>
                                      <SelectItem value={`{{steps.${node.id}.output.text}}`}>
                                        text
                                      </SelectItem>
                                      <SelectItem value={`{{steps.${node.id}.output.html}}`}>
                                        html
                                      </SelectItem>
                                    </>
                                  )}
                                  {/* Generic outputs for all nodes */}
                                  <SelectItem value={`{{steps.${node.id}.output.id}}`}>
                                    id
                                  </SelectItem>
                                  <SelectItem value={`{{steps.${node.id}.output.result}}`}>
                                    result
                                  </SelectItem>
                                  <SelectItem value={`{{steps.${node.id}.output.data}}`}>
                                    data
                                  </SelectItem>
                                  <SelectItem value={`{{steps.${node.id}.output}}`}>
                                    output (full)
                                  </SelectItem>
                                </div>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            if (field.type === 'multiselect') {
              // Handle multi-select with checkboxes in a scrollable area
              // Parse current value - could be array, JSON string, or single value
              let currentArray: string[] = [];
              if (current) {
                if (Array.isArray(current)) {
                  currentArray = current;
                } else if (typeof current === 'string') {
                  try {
                    // Try parsing as JSON
                    const parsed = JSON.parse(current);
                    currentArray = Array.isArray(parsed) ? parsed : [parsed];
                  } catch {
                    // If not JSON, treat as single value
                    currentArray = [current];
                  }
                } else {
                  currentArray = [String(current)];
                }
              }
              const options = field.options || [];
              
              const toggleOption = (value: string) => {
                let newArray: string[];
                if (currentArray.includes(value)) {
                  // Remove if already selected
                  newArray = currentArray.filter((v: string) => v !== value);
                } else {
                  // Add if not selected
                  newArray = [...currentArray, value];
                }
                // If "All Types (*)" is selected, only keep that
                if (newArray.includes('*') && newArray.length > 1) {
                  newArray = ['*'];
                } else if (newArray.length > 0 && newArray[0] !== '*' && newArray.includes('*')) {
                  // If other types are selected and user selects "*", remove others
                  newArray = ['*'];
                }
                handleFieldChange(field, newArray);
              };
              
              return (
                <div key={field.key}>
                  <Label>{field.label}{requiredMark && <span className="text-red-500"> *</span>}</Label>
                  <div className="border border-border rounded-md p-3 bg-muted/30">
                    <ScrollArea className="h-[200px] w-full">
                      <div className="space-y-2 pr-4">
                        {options.map((option: any) => {
                          const isChecked = currentArray.includes(option.value);
                          return (
                            <div key={option.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${field.key}-${option.value}`}
                                checked={isChecked}
                                onCheckedChange={() => toggleOption(option.value)}
                              />
                              <label
                                htmlFor={`${field.key}-${option.value}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                              >
                                {option.label}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    {currentArray.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex flex-wrap gap-1">
                          {currentArray.map((value: string) => {
                            const option = options.find((opt: any) => opt.value === value);
                            return (
                              <Badge key={value} variant="secondary" className="text-xs">
                                {option?.label || value}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  {field.placeholder && (
                    <p className="text-xs text-muted-foreground mt-1">{field.placeholder}</p>
                  )}
                  {isActuallyRequired && currentArray.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">At least one type must be selected</p>
                  )}
                </div>
              );
            }
            if (field.type === 'code') {
              return (
                <div key={field.key}>
                  <Label>{field.label}{requiredMark && <span className="text-red-500"> *</span>}</Label>
                  <Textarea
                    value={current ?? ''}
                    placeholder={field.placeholder}
                    rows={field.rows || 12}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              );
            }
            if (field.type === 'array' && field.key === 'communication.attachments') {
              // Special handling for Gmail attachments
              const attachments = Array.isArray(current) ? current : [];
              return (
                <div key={field.key}>
                  <Label>{field.label}{requiredMark && <span className="text-red-500"> *</span>}</Label>
                  <div className="space-y-2 mt-2">
                    {attachments.map((attachment: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 p-3 border border-border rounded-md">
                        <div className="col-span-4">
                          <Input
                            placeholder="Filename (e.g., file.pdf)"
                            value={attachment.name || attachment.filename || ''}
                            onChange={(e) => {
                              const updated = [...attachments];
                              updated[idx] = { ...updated[idx], name: e.target.value, filename: e.target.value };
                              handleFieldChange(field, updated);
                            }}
                            className="text-sm"
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            placeholder="Content Type (optional)"
                            value={attachment.type || attachment.contentType || ''}
                            onChange={(e) => {
                              const updated = [...attachments];
                              updated[idx] = { ...updated[idx], type: e.target.value, contentType: e.target.value };
                              handleFieldChange(field, updated);
                            }}
                            className="text-sm"
                          />
                        </div>
                        <div className="col-span-4">
                          <Textarea
                            placeholder="Base64 content or text"
                            value={attachment.content || ''}
                            onChange={(e) => {
                              const updated = [...attachments];
                              updated[idx] = { ...updated[idx], content: e.target.value };
                              handleFieldChange(field, updated);
                            }}
                            rows={2}
                            className="text-sm font-mono"
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const updated = attachments.filter((_: any, i: number) => i !== idx);
                              handleFieldChange(field, updated);
                            }}
                            className="h-full"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const updated = [...attachments, { name: '', content: '', type: '' }];
                        handleFieldChange(field, updated);
                      }}
                    >
                      + Add Attachment
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Attachments should have: name/filename, content (base64 encoded), and optionally type (MIME type like "application/pdf")
                    </p>
                  </div>
                </div>
              );
            }
            if (field.type === 'notice') {
              // Special handling for Gmail OAuth button
              if (field.key === 'config._gmailOAuthButton' && subtype === 'fetch-email-data') {
                return (
                  <div key={field.key} className="border border-border rounded-md p-4 bg-surface-elevated">
                    <h4 className="font-medium text-sm mb-3">🔐 Google OAuth Connection</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Connect your Google account to fetch emails from Gmail. You only need to do this once.
                    </p>
                    <Button
                      type="button"
                      onClick={async () => {
                        const token = localStorage.getItem('auth_token');
                        if (!token || token.trim().length === 0) {
                          alert('You must be logged in to connect Google. Please log in first.');
                          return;
                        }
                        
                        try {
                          const backendUrl = API_CONFIG.baseUrl;
                          const r = await fetch(`${backendUrl.replace(/\/$/, '')}/api/auth/oauth/google`, {
                            method: 'GET',
                            credentials: 'include',
                            headers: {
                              'Authorization': `Bearer ${token.trim()}`,
                              'Content-Type': 'application/json'
                            }
                          });
                          
                          const data = await r.json();
                          if (!r.ok) {
                            throw new Error(data?.error || data?.message || `HTTP ${r.status}`);
                          }
                          
                          if (data?.authUrl) {
                            // Store user email for error messages
                            try {
                              const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
                              if (userInfo.email) {
                                localStorage.setItem('user_email', userInfo.email);
                              }
                            } catch (e) {
                              // Ignore if user info not available
                            }
                            
                            // Store return URL - always go back to studio page where workflow is
                            localStorage.setItem('oauth_return_url', '/studio');
                            
                            // Open OAuth in a new tab/window so user stays on current page
                            const oauthWindow = window.open(data.authUrl, 'google-oauth', 'width=600,height=700,scrollbars=yes,resizable=yes');
                            
                            if (!oauthWindow) {
                              alert('Popup blocked! Please allow popups for this site and try again.');
                              return;
                            }
                            
                            // Listen for OAuth completion message from popup
                            const handleOAuthMessage = (event: MessageEvent) => {
                              // Verify origin for security
                              if (event.origin !== window.location.origin) {
                                return;
                              }
                              
                              if (event.data.type === 'oauth_success') {
                                window.removeEventListener('message', handleOAuthMessage);
                                oauthWindow.close();
                                
                                // Show success message
                                alert('✅ Google account connected successfully! You can now use Gmail API in your workflow.');
                                
                                // Optionally refresh or update UI
                                // window.location.reload();
                              } else if (event.data.type === 'oauth_error') {
                                window.removeEventListener('message', handleOAuthMessage);
                                oauthWindow.close();
                                alert(`❌ OAuth failed: ${event.data.error}`);
                              }
                            };
                            
                            window.addEventListener('message', handleOAuthMessage);
                            
                            // Fallback: Check if window is closed (user might close it manually)
                            const checkOAuthComplete = setInterval(() => {
                              if (oauthWindow?.closed) {
                                clearInterval(checkOAuthComplete);
                                window.removeEventListener('message', handleOAuthMessage);
                                
                                // Check if OAuth was successful by making a quick API call
                                setTimeout(async () => {
                                  try {
                                    const token = localStorage.getItem('auth_token');
                                    if (token) {
                                      const backendUrl = API_CONFIG.baseUrl;
                                      const statusCheck = await fetch(`${backendUrl.replace(/\/$/, '')}/api/auth/oauth/status?provider=google`, {
                                        headers: {
                                          'Authorization': `Bearer ${token.trim()}`,
                                          'Content-Type': 'application/json'
                                        }
                                      });
                                      
                                      if (statusCheck.ok) {
                                        const statusData = await statusCheck.json();
                                        if (statusData?.success && statusData?.status?.connected) {
                                          alert('✅ Google account connected successfully! You can now use Gmail API in your workflow.');
                                        }
                                      }
                                    }
                                  } catch (e) {
                                    // Ignore errors
                                  }
                                }, 500);
                              }
                            }, 500);
                            
                            // Clean up interval after 5 minutes
                            setTimeout(() => {
                              clearInterval(checkOAuthComplete);
                              window.removeEventListener('message', handleOAuthMessage);
                            }, 5 * 60 * 1000);
                          } else {
                            throw new Error('No auth URL received from server');
                          }
                        } catch (error: any) {
                          alert(`Failed to connect Google: ${error.message || 'Unknown error'}`);
                          logger.error('Google OAuth initiation failed', error as Error);
                        }
                      }}
                      className="w-full"
                    >
                      🔗 Connect Google Account
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      After connecting, you'll be redirected back. Your Gmail access will be saved automatically.
                    </p>
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-xs text-blue-800 font-medium mb-1">⚠️ If you see "Access Denied":</p>
                      <p className="text-xs text-blue-700">
                        Your app is in Testing mode. Add your email to test users in{' '}
                        <a 
                          href="https://console.cloud.google.com/apis/credentials/consent" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline font-medium"
                        >
                          Google Cloud Console
                        </a>
                        {' '}→ OAuth consent screen → Test users.
                      </p>
                    </div>
                  </div>
                );
              }
              return (
                <div key={field.key} className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: field.content || field.label }} />
              );
            }
            if (field.type === 'hidden') {
              return null;
            }
            if (field.type === 'nodeOutput') {
              // Get available previous nodes
              const previousNodes = nodes.filter(n => n.id !== selectedNode.id);
              return (
                <div key={field.key}>
                  <Label>{field.label}{requiredMark && <span className="text-red-500"> *</span>}</Label>
                  <Select value={current ?? ''} onValueChange={(value) => handleFieldChange(field, value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select previous node output" />
                    </SelectTrigger>
                    <SelectContent>
                      {previousNodes.map((node) => (
                        <SelectItem key={node.id} value={node.id}>
                          {node.data?.label || node.type} ({node.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }
            if (field.type === 'expression') {
              return (
                <div key={field.key}>
                  <Label>{field.label}{requiredMark && <span className="text-red-500"> *</span>}</Label>
                  <Textarea
                    value={current ?? ''}
                    placeholder={field.placeholder || 'Use {{previousNode.output}} or {{nodeId.field}} to reference data'}
                    rows={3}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available variables: {`{{previousNode.output}}, {{nodeId.field}}`}
                  </p>
                </div>
              );
            }
            if (field.type === 'boolean') {
              return (
                <div key={field.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.key}
                    checked={Boolean(current)}
                    onCheckedChange={(checked) => handleFieldChange(field, checked === true)}
                  />
                  <Label htmlFor={field.key} className="cursor-pointer">{field.label}</Label>
                </div>
              );
            }
            if (field.type === 'select') {
              // Use dynamically loaded options if available, otherwise use static options
              const optionsToUse = field.loadOptionsMethod 
                ? (dynamicOptions[field.key] || [])
                : (field.options || []);
              const isLoading = field.loadOptionsMethod ? loadingOptions[field.key] : false;

              return (
                <div key={field.key}>
                  <Label>{field.label}{requiredMark && <span className="text-red-500"> *</span>}</Label>
                  <Select 
                    value={current ?? ''} 
                    onValueChange={(val) => handleFieldChange(field, val)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoading ? 'Loading options...' : field.placeholder || 'Select...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoading ? (
                        <SelectItem value="" disabled>Loading options...</SelectItem>
                      ) : optionsToUse.length === 0 ? (
                        <SelectItem value="" disabled>No options available</SelectItem>
                      ) : (
                        optionsToUse.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {field.loadOptionsDependsOn && field.loadOptionsDependsOn.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Depends on: {field.loadOptionsDependsOn.join(', ')}
                    </p>
                  )}
                  {/* Microsoft Teams OAuth button - show when authType is 'oauth' */}
                  {field.key === 'config.authType' && subtypeKey === 'microsoft-teams' && current === 'oauth' && (
                    <div className="mt-3 p-3 border border-border rounded-md bg-muted/30">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          const token = localStorage.getItem('auth_token');
                          if (!token || token.trim().length === 0) {
                            alert('You must be logged in to connect Microsoft Teams. Please log in first.');
                            return;
                          }
                          
                          try {
                            const backendUrl = API_CONFIG.baseUrl;
                            const r = await fetch(`${backendUrl.replace(/\/$/, '')}/api/auth/oauth/microsoft`, {
                              method: 'GET',
                              credentials: 'include',
                              headers: {
                                'Authorization': `Bearer ${token.trim()}`,
                                'Content-Type': 'application/json'
                              }
                            });
                            
                            const data = await r.json();
                            if (!r.ok) {
                              throw new Error(data?.error || data?.message || `HTTP ${r.status}`);
                            }
                            
                            if (data?.authUrl) {
                              // Open in popup window
                              const oauthWindow = window.open(data.authUrl, '_blank', 'width=480,height=720');
                              
                              // Listen for OAuth completion message
                              const handleOAuthMessage = (event: MessageEvent) => {
                                if (event.origin !== window.location.origin) return;
                                
                                if (event.data?.type === 'oauth_success' && event.data?.provider === 'microsoft') {
                                  window.removeEventListener('message', handleOAuthMessage);
                                  if (oauthWindow) oauthWindow.close();
                                  alert('✅ Microsoft Teams account connected successfully! You can now use Microsoft Teams in your workflow.');
                                } else if (event.data?.type === 'oauth_error') {
                                  window.removeEventListener('message', handleOAuthMessage);
                                  if (oauthWindow) oauthWindow.close();
                                  alert(`❌ Failed to connect: ${event.data.error || 'Unknown error'}`);
                                }
                              };
                              
                              window.addEventListener('message', handleOAuthMessage);
                              
                              // Fallback: Check if window is closed
                              const checkOAuthComplete = setInterval(() => {
                                if (oauthWindow?.closed) {
                                  clearInterval(checkOAuthComplete);
                                  window.removeEventListener('message', handleOAuthMessage);
                                  
                                  // Check OAuth status
                                  setTimeout(async () => {
                                    try {
                                      const token = localStorage.getItem('auth_token');
                                      if (token) {
                                        const backendUrl = API_CONFIG.baseUrl;
                                        const statusCheck = await fetch(`${backendUrl.replace(/\/$/, '')}/api/auth/oauth/status?provider=microsoft`, {
                                          headers: {
                                            'Authorization': `Bearer ${token.trim()}`,
                                            'Content-Type': 'application/json'
                                          }
                                        });
                                        
                                        if (statusCheck.ok) {
                                          const statusData = await statusCheck.json();
                                          if (statusData?.success && statusData?.status?.connected) {
                                            alert('✅ Microsoft Teams account connected successfully!');
                                          }
                                        }
                                      }
                                    } catch (e) {
                                      // Ignore errors
                                    }
                                  }, 500);
                                }
                              }, 500);
                              
                              setTimeout(() => {
                                clearInterval(checkOAuthComplete);
                                window.removeEventListener('message', handleOAuthMessage);
                              }, 5 * 60 * 1000);
                            } else {
                              throw new Error('No auth URL received from server');
                            }
                          } catch (error: any) {
                            alert(`Failed to connect Microsoft Teams: ${error.message || 'Unknown error'}`);
                            logger.error('Microsoft Teams OAuth initiation failed', error as Error);
                          }
                        }}
                        className="w-full"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Connect to Microsoft Teams
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        After connecting, you'll be redirected back. Your Microsoft Teams access will be saved automatically.
                      </p>
                    </div>
                  )}
                </div>
              );
            }
            if (field.type === 'credentialSelect') {
              return (
                <div key={field.key}>
                  <Label>{field.label}{requiredMark && <span className="text-red-500"> *</span>}</Label>
                  <CredentialSelector
                    value={current}
                    onChange={(credentialId) => handleFieldChange(field, credentialId)}
                    credentialTypes={field.credentialTypes}
                    required={field.required}
                    placeholder={field.placeholder || 'Select credential...'}
                  />
                  {field.required && !current && (
                    <p className="text-xs text-red-500 mt-1">This field is required</p>
                  )}
                </div>
              );
            }
            if (field.type === 'file') {
              // Check if this is an image field
              const isImageField = field.key.toLowerCase().includes('image') || field.key.toLowerCase().includes('imagesource');
              const acceptTypes = isImageField 
                ? 'image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg'
                : '.pdf,.docx,.doc,.txt,.rtf,.odt,.pages,.xlsx,.xls,.pptx,.ppt';
              
              // Parse current value to check if file is selected
              let fileData: any = null;
              let hasFile = false;
              if (current) {
                try {
                  fileData = typeof current === 'string' ? JSON.parse(current) : current;
                  if (fileData && fileData.name && (fileData.base64 || fileData.dataUrl)) {
                    hasFile = true;
                  }
                } catch (e) {
                  // If not JSON, might be a path string
                  if (typeof current === 'string' && current.trim()) {
                    hasFile = true;
                  }
                }
              }
              
              return (
                <div key={field.key}>
                  <Label>{field.label}{requiredMark && <span className="text-red-500"> *</span>}</Label>
                  <div className="flex gap-2 items-start">
                    <input
                      type="file"
                      accept={acceptTypes}
                      key={hasFile ? 'file-input-with-file' : 'file-input-empty'}
                      className="mt-1 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary file:text-primary-foreground
                        hover:file:bg-primary/90
                        cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) {
                          // Clear the field if no file selected
                          handleFieldChange(field, '');
                          return;
                        }
                        
                        // Store file info and convert to base64 for backend processing
                        const reader = new FileReader();
                        reader.onload = () => {
                          const base64 = String(reader.result || '').split(',')[1] || String(reader.result || '');
                          if (!base64) {
                            console.error('Failed to extract base64 from file');
                            handleFieldChange(field, '');
                            return;
                          }
                          const fileData = {
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            base64: base64,
                            // Store full data URL for frontend preview if needed
                            dataUrl: reader.result as string
                          };
                          // Store file info in config - backend can use base64 or path
                          const fileDataString = JSON.stringify(fileData);
                          console.log('File uploaded:', { name: file.name, size: file.size, base64Length: base64.length });
                          handleFieldChange(field, fileDataString);
                        };
                        reader.onerror = () => {
                          console.error('Error reading file');
                          handleFieldChange(field, '');
                        };
                        
                        // Read as base64
                        reader.readAsDataURL(file);
                      }}
                    />
                    {hasFile && (
                      <button
                        type="button"
                        onClick={() => {
                          handleFieldChange(field, '');
                        }}
                        className="mt-1 px-3 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {hasFile && fileData && fileData.name && (() => {
                    const isImage = isImageField && fileData.type && fileData.type.startsWith('image/');
                    return (
                      <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                        {isImage && fileData.dataUrl && (
                          <div className="mb-2">
                            <img 
                              src={fileData.dataUrl} 
                              alt={fileData.name}
                              className="max-w-full h-auto max-h-48 rounded-md border border-border"
                            />
                          </div>
                        )}
                        <div><strong>Selected:</strong> {fileData.name}</div>
                        <div><strong>Size:</strong> {(fileData.size / 1024).toFixed(2)} KB</div>
                        <div><strong>Type:</strong> {fileData.type || 'Unknown'}</div>
                      </div>
                    );
                  })()}
                  {!hasFile && requiredMark && (
                    <p className="text-xs text-red-500 mt-1">This field is required</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {field.placeholder || (isImageField ? 'Select an image file to upload' : 'Select a document file to upload')}
                  </p>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  };

  const getConfigContent = () => {
    const subtypeKey = selectedNode?.data?.subtype as string | undefined;
    // Subtypes with a bespoke, fully-featured UI to avoid duplicate fields with schema
    const customHandled = new Set([
      'http-request','email','email-send','google-sheets','google-forms','slack','telegram',
      // 'discord' removed - now uses schema-based rendering
      'aws-s3','onedrive','google-cloud-storage','azure-blob','google-drive',
      'mysql','postgresql','mongodb','redis',
      'openai','openrouter','anthropic','gemini',
      'google-analytics', // Custom OAuth section
      'file-export',
      // 'file-upload' removed - now uses schema-based rendering with custom file upload UI
      // Keep business logic nodes schema-driven so params render: delay, filter, merge, split, loop, switch
      'stripe',
      // Triggers
      'manual',
      'form-submit',
      'schedule' // Custom rendering in renderNodeSpecificN8nParameters
    ]);
    switch (selectedNode.type) {
      case 'trigger':
        return (
          <>
            {renderTriggerConfig()}
            {!customHandled.has(subtypeKey || '') && renderSchemaParameters()}
          </>
        );
      case 'action':
        return (
          <>
            {renderActionConfig()}
            {!customHandled.has(subtypeKey || '') && renderSchemaParameters()}
          </>
        );
      case 'ai':
        return (
          <>
            {renderAIConfig()}
            {!customHandled.has(subtypeKey || '') && renderSchemaParameters()}
          </>
        );
      case 'utility':
        return (
          <>
            {renderUtilityConfig()}
            {!customHandled.has(subtypeKey || '') && renderSchemaParameters()}
          </>
        );
      default:
        return (
          <>
            <div>No configuration available for this node type.</div>
            {!customHandled.has(subtypeKey || '') && renderSchemaParameters()}
          </>
        );
    }
  };

  const handleTestCredentials = async () => {
    try {
      setTesting(true);
      setTestStatus(null);
      // Validate node configuration via backend node test endpoint
      const data = await ApiService.post<any>(`/api/workflows/nodes/${encodeURIComponent(subtype)}/test`, { config }, { toastTitle: 'Test Configuration' });
      if (!data || (data as any)?.success === false) {
        const msg = (data as any)?.error || 'Test failed';
        setTestStatus({ ok: false, message: msg });
      } else {
        setTestStatus({ ok: true, message: 'Configuration valid' });
      }
    } catch (e: any) {
      setTestStatus({ ok: false, message: e?.message || 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      className="fixed right-0 top-0 h-full w-96 bg-surface border-l border-border z-50 shadow-elevated"
      data-testid="node-config-panel"
    >
      <div className="relative flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="font-semibold">{selectedNode.data.label}</h2>
            <Badge variant="outline" className="text-xs">
              {selectedNode.type}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              onClick={() => {
                onDelete(selectedNode!.id);
                onClose();
              }}
              className="text-destructive hover:text-destructive/80 transition-colors p-1"
              title="Delete Node"
            >
              🗑️
            </button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 text-2xl pointer-events-none">
          {selectedNode.data.icon}
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[calc(100vh-80px)]">
        <TabsList className={`grid w-full m-4 ${(subtype === 'openrouter' || subtype === 'openai' || subtype === 'anthropic' || subtype === 'gemini') ? 'grid-cols-2' : 'grid-cols-3'}`}>
          <TabsTrigger value="config">
            Configuration
            
            {validateRequiredFields() !== true && <span className="ml-1 text-red-500">⚠️</span>}
          </TabsTrigger>
          <TabsTrigger value="test">Test</TabsTrigger>
        </TabsList>
        
        <TabsContent value="config" className="mt-0">
          <ScrollArea className="h-[calc(100vh-160px)] p-4">
            {/* Subtype/Integration Picker - hidden when subtype already set */}
            {false && (!selectedNode?.data?.subtype) && (
              <div className="space-y-2">
                <Label>Integration</Label>
                <Select
                  value={selectedNode?.data?.subtype || ''}
                  onValueChange={(value) => {
                    const updated = { ...selectedNode };
                    updated.data = { ...updated.data, subtype: value };
                    onSave(updated);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an integration (e.g., slack, send-email, google-drive)" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* options rendered elsewhere */}
                  </SelectContent>
                </Select>
              </div>
            )}

            {getConfigContent()}
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="test" className="mt-0">
          <ScrollArea className="h-[calc(100vh-160px)] p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Test Node</h3>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleTestNode}
                    disabled={testing}
                  >
                    <TestTube className="w-4 h-4 mr-1" />
                    {testing ? 'Testing...' : 'Test'}
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleExecuteNode}
                    disabled={executing}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    {executing ? 'Executing...' : 'Execute'}
                  </Button>
                </div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Configure the node and credentials first, then test or execute to verify everything works correctly.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {subtype === 'fetch-email-data' && config.useGmailApi
                    ? 'Note: In a workflow, input (emailId) will automatically come from the previous node output (e.g., from Manual Trigger). For testing, default sample input is used.'
                    : subtype === 'fetch-email-data'
                    ? 'Note: In a workflow, input (emailId) will automatically come from the previous node output (e.g., from Manual Trigger node that outputs { "emailId": "..." }).'
                    : 'Note: In a workflow, input comes from previous node outputs automatically.'}
                </p>
              </div>

              {/* Test Status */}
              {testStatus && (
                <div className={`p-3 rounded-lg border ${
                  testStatus.ok 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {testStatus.ok ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      testStatus.ok ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {testStatus.message}
                    </span>
                  </div>
                </div>
              )}

              {/* Test Result */}
              {testResult && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Test Result</h4>
                  <pre className="text-xs text-black overflow-auto max-h-96 p-2 bg-white rounded border border-blue-200">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}

              {/* Execution Result */}
              {executionResult && (
                <div className={`p-3 rounded-lg border ${
                  executionResult.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <h4 className={`text-sm font-medium mb-2 ${
                    executionResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {executionResult.success ? '✅ Execution Successful' : '❌ Execution Failed'}
                  </h4>
                  {!executionResult.success && executionResult.error && (
                    <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-800">
                      <strong>Error:</strong> {executionResult.error}
                    </div>
                  )}
                  {executionResult.output && (
                    <div className="mb-2">
                      <strong className="text-xs text-black">Output:</strong>
                      <pre className="text-xs text-black overflow-auto max-h-96 mt-1 p-2 bg-gray-50 rounded border">
                        {typeof executionResult.output === 'string' 
                          ? executionResult.output 
                          : JSON.stringify(executionResult.output, null, 2)}
                      </pre>
                    </div>
                  )}
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer text-gray-600 hover:text-gray-800">
                      View Full Result
                    </summary>
                    <pre className="text-xs text-black overflow-auto max-h-96 mt-2 p-2 bg-gray-50 rounded border">
                    {JSON.stringify(executionResult, null, 2)}
                  </pre>
                  </details>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        
      </Tabs>
      
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-surface">
        <div className="flex gap-2">
          <Button 
            onClick={handleSave} 
            className="flex-1"
            disabled={validateRequiredFields() !== true}
            data-testid="save-node-config-button"
          >
            {validateRequiredFields() === true ? 'Save Configuration' : 'Fill Required Fields'}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};