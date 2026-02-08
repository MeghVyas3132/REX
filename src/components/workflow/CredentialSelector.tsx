import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { CredentialService, Credential } from '@/lib/credentialService';
import { ApiService } from '@/lib/errorService';

interface CredentialSelectorProps {
  value?: string; // Credential ID
  onChange: (credentialId: string | null) => void;
  credentialTypes?: string[]; // Array of credential type patterns
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export const CredentialSelector: React.FC<CredentialSelectorProps> = ({
  value,
  onChange,
  credentialTypes = [],
  required = false,
  placeholder = 'Select credential...',
  disabled = false,
}) => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCredentials = async () => {
      if (credentialTypes.length === 0) {
        // If no credential types specified, fetch all credentials
        setLoading(true);
        try {
          const allCredentials = await CredentialService.getCredentials();
          setCredentials(allCredentials);
        } catch (err: any) {
          setError(err.message || 'Failed to fetch credentials');
          logger.error('Failed to fetch credentials:', err as Error);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Fetch credentials matching the patterns
      setLoading(true);
      try {
        const matchingCredentials = await CredentialService.getCredentialsByPatterns(credentialTypes);
        setCredentials(matchingCredentials);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch credentials');
        logger.error('Failed to fetch credentials:', err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchCredentials();
  }, [credentialTypes.join(',')]); // Re-fetch when credential types change

  const handleCreateNew = () => {
    // Open credential creation dialog
    // For now, we'll just show an alert - in a full implementation,
    // this would open a modal/dialog
    alert('Credential creation dialog would open here. This feature will be implemented in a future update.');
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading credentials...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Select
        value={value || ''}
        onValueChange={(newValue) => onChange(newValue || null)}
        required={required}
        disabled={disabled}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {!required && (
            <SelectItem value="">None</SelectItem>
          )}
          {credentials.length === 0 ? (
            <SelectItem value="" disabled>
              No credentials available
            </SelectItem>
          ) : (
            credentials.map((cred) => (
              <SelectItem key={cred.id} value={cred.id}>
                {cred.name} ({cred.type})
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleCreateNew}
        disabled={disabled}
        title="Create new credential"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

