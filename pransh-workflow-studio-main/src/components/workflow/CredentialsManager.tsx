import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Credential {
  id: string;
  name: string;
  type: string;
  description: string;
  fields: Record<string, any>;
}

const credentialTypes = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI API credentials',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true }
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    description: 'Anthropic API credentials',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true }
    ]
  },
  {
    id: 'http',
    name: 'HTTP API',
    description: 'Generic HTTP API credentials',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: false }
    ]
  },
  {
    id: 'smtp',
    name: 'SMTP Email',
    description: 'SMTP server credentials',
    fields: [
      { name: 'host', label: 'SMTP Host', type: 'text', required: true },
      { name: 'port', label: 'Port', type: 'number', required: true },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true }
    ]
  },
  {
    id: 'webhook',
    name: 'Webhook',
    description: 'Webhook credentials',
    fields: [
      { name: 'secret', label: 'Webhook Secret', type: 'password', required: false }
    ]
  },
  {
    id: 'google-oauth',
    name: 'Google OAuth',
    description: 'Google Drive/Sheets OAuth credentials',
    fields: [
      { name: 'clientId', label: 'Client ID', type: 'text', required: true },
      { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { name: 'refreshToken', label: 'Refresh Token', type: 'password', required: true }
    ]
  },
  {
    id: 'dropbox-oauth',
    name: 'Dropbox OAuth',
    description: 'Dropbox API credentials',
    fields: [
      { name: 'accessToken', label: 'Access Token', type: 'password', required: true }
    ]
  },
  {
    id: 'aws',
    name: 'AWS Credentials',
    description: 'AWS S3 credentials',
    fields: [
      { name: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
      { name: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
      { name: 'region', label: 'Region', type: 'text', required: true }
    ]
  },
  {
    id: 'slack',
    name: 'Slack Bot Token',
    description: 'Slack bot credentials',
    fields: [
      { name: 'botToken', label: 'Bot Token', type: 'password', required: true }
    ]
  },
  {
    id: 'discord',
    name: 'Discord Webhook',
    description: 'Discord webhook credentials',
    fields: [
      { name: 'webhookUrl', label: 'Webhook URL', type: 'text', required: true }
    ]
  }
];

interface CredentialsManagerProps {
  onCredentialSelect?: (credential: Credential) => void;
}

export const CredentialsManager: React.FC<CredentialsManagerProps> = ({ onCredentialSelect }) => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isAddingCredential, setIsAddingCredential] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [credentialName, setCredentialName] = useState('');
  const [credentialFields, setCredentialFields] = useState<Record<string, any>>({});
  const { toast } = useToast();

  const handleAddCredential = async () => {
    if (!selectedType || !credentialName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const credType = credentialTypes.find(t => t.id === selectedType);
    if (!credType) return;

    // Validate required fields
    const missingFields = credType.fields
      .filter(field => field.required && !credentialFields[field.name])
      .map(field => field.label);

    if (missingFields.length > 0) {
      toast({
        title: "Error",
        description: `Missing required fields: ${missingFields.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    try {
      // Store credentials securely in backend vault
      const credentialId = `${selectedType}_${Date.now()}`;
      
      // In a real implementation, you would call a backend API
      // to securely store these credentials
      const newCredential: Credential = {
        id: credentialId,
        name: credentialName,
        type: selectedType,
        description: credType.description,
        fields: credentialFields
      };

      setCredentials([...credentials, newCredential]);
      
      toast({
        title: "Success",
        description: "Credential added successfully",
      });

      // Reset form
      setIsAddingCredential(false);
      setSelectedType('');
      setCredentialName('');
      setCredentialFields({});
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add credential",
        variant: "destructive"
      });
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setCredentialFields(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const renderCredentialForm = () => {
    const credType = credentialTypes.find(t => t.id === selectedType);
    if (!credType) return null;

    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="cred-name">Credential Name</Label>
          <Input
            id="cred-name"
            value={credentialName}
            onChange={(e) => setCredentialName(e.target.value)}
            placeholder="My API Credentials"
          />
        </div>
        
        {credType.fields.map((field) => (
          <div key={field.name}>
            <Label htmlFor={`field-${field.name}`}>
              {field.label}
            </Label>
            <Input
              id={`field-${field.name}`}
              type={field.type}
              value={credentialFields[field.name] || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}`}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Credentials Manager</h3>
        <Dialog open={isAddingCredential} onOpenChange={setIsAddingCredential}>
          <DialogTrigger asChild>
            <Button>+ Add Credential</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Credential</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="cred-type">Credential Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select credential type" />
                  </SelectTrigger>
                  <SelectContent>
                    {credentialTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedType && renderCredentialForm()}
              
              <div className="flex gap-2 pt-4">
                <Button onClick={handleAddCredential} className="flex-1">
                  Add Credential
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsAddingCredential(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {credentials.length === 0 ? (
          <Card className="p-6 text-center">
            <div className="text-muted-foreground">
              No credentials configured yet. Add some credentials to get started.
            </div>
          </Card>
        ) : (
          credentials.map((credential) => (
            <Card key={credential.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <h4 className="font-medium">{credential.name}</h4>
                    <p className="text-sm text-muted-foreground">{credential.description}</p>
                  </div>
                  <Badge variant="outline">{credential.type}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCredentialSelect?.(credential)}
                  >
                    Select
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCredentials(credentials.filter(c => c.id !== credential.id));
                      toast({
                        title: "Success",
                        description: "Credential deleted",
                      });
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};