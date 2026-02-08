import crypto from 'crypto';
import { logger } from './logger';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly key: Buffer;

  constructor() {
    const secretKey = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!secretKey) {
      throw new Error('ENCRYPTION_KEY or JWT_SECRET must be set');
    }
    
    // Derive a consistent key from the secret
    this.key = crypto.scryptSync(secretKey, 'workflow-studio-salt', this.keyLength);
  }

  encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      cipher.setAAD(Buffer.from('workflow-studio', 'utf8'));
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine iv, tag, and encrypted data as hex strings with colons
      // Format: iv_hex:tag_hex:encrypted_hex
      const combined = iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
      
      // Encode the combined hex string as base64 for storage
      // Since combined is already a hex string, we can safely convert it
      return Buffer.from(combined, 'utf8').toString('base64');
    } catch (error) {
      logger.error('Encryption failed', error as Error);
      throw new Error('Failed to encrypt data');
    }
  }

  decrypt(encryptedData: string): string {
    try {
      // Ensure we have a valid string (handle potential buffer/object issues)
      let encryptedString = encryptedData;
      if (typeof encryptedString !== 'string') {
        logger.error('Encrypted data is not a string', undefined, {
          type: typeof encryptedString,
          value: String(encryptedString).substring(0, 50)
        });
        throw new Error('Encrypted data must be a string');
      }

      // Trim whitespace that might have been added
      encryptedString = encryptedString.trim();
      
      // Decode from base64 to get the hex string with colons
      let combined: string;
      try {
        combined = Buffer.from(encryptedString, 'base64').toString('utf8');
      } catch (decodeError: any) {
        logger.error('Base64 decode failed', undefined, {
          error: decodeError.message,
          encryptedDataLength: encryptedString.length,
          encryptedDataPreview: encryptedString.substring(0, 50),
          encryptedDataEnd: encryptedString.substring(encryptedString.length - 50)
        });
        throw new Error('Invalid base64 format in encrypted data');
      }
      
      // Split by colon to get iv, tag, and encrypted data (all in hex format)
      const parts = combined.split(':');
      
      if (parts.length !== 3) {
        logger.error('Invalid encrypted data format', undefined, {
          partsLength: parts.length,
          combinedLength: combined.length,
          combinedPreview: combined.substring(0, 100),
          combinedEnd: combined.substring(combined.length - 100),
          encryptedDataPreview: encryptedString.substring(0, 50),
          part0: parts[0]?.substring(0, 32),
          part1: parts[1]?.substring(0, 32),
          part2: parts[2]?.substring(0, 50),
          allParts: parts.map((p, i) => ({ index: i, length: p?.length, preview: p?.substring(0, 20) }))
        });
        throw new Error('Invalid encrypted data format - expected iv:tag:encrypted');
      }
      
      const iv = Buffer.from(parts[0]!, 'hex');
      const tag = Buffer.from(parts[1]!, 'hex');
      const encrypted = parts[2]!;
      
      if (iv.length !== this.ivLength || tag.length !== this.tagLength) {
        logger.error('Invalid buffer lengths', undefined, {
          ivLength: iv.length,
          expectedIvLength: this.ivLength,
          tagLength: tag.length,
          expectedTagLength: this.tagLength
        });
        throw new Error('Invalid buffer lengths in encrypted data');
      }
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAAD(Buffer.from('workflow-studio', 'utf8'));
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error: any) {
      logger.error('Decryption failed', undefined, {
        message: error.message,
        errorName: error.name,
        stack: error.stack
      });
      throw new Error(`Failed to decrypt data: ${error.message}`);
    }
  }

  hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  generateApiKey(): string {
    const prefix = 'ws_';
    const randomPart = this.generateRandomString(32);
    return prefix + randomPart;
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Signature verification failed', error as Error);
      return false;
    }
  }

  generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }
}

export const encryptionService = new EncryptionService();
export default encryptionService;
