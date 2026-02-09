/**
 * Media Functions
 * Media upload, download, and management utilities
 */

import FormData from 'form-data';
import { WHATSAPP_BASE_URL_V18 } from '../constants';
import { WhatsAppRequestOptions, MediaUploadResponse, MediaDownloadResponse } from '../types';
import { whatsappApiRequest } from './GenericFunctions';

// Inline logger (no external dependency)
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta ? JSON.stringify(meta) : ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta ? JSON.stringify(meta) : ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta ? JSON.stringify(meta) : ''),
  debug: (msg: string, meta?: any) => console.debug(`[DEBUG] ${msg}`, meta ? JSON.stringify(meta) : ''),
};

/**
 * Get upload form data from binary data
 * @param binaryData - Binary data object
 * @param fileName - Optional filename override
 * @returns FormData and filename
 */
export async function getUploadFormData(
  binaryData: {
    data: Buffer | string;
    mimeType?: string;
    fileName?: string;
  },
  fileName?: string
): Promise<{ formData: FormData; fileName: string }> {
  if (!binaryData) {
    throw new Error('Binary data is required for media upload');
  }

  const finalFileName = fileName || binaryData.fileName || 'file';
  
  if (!finalFileName) {
    throw new Error('Filename is required for media upload');
  }

  // Convert data to Buffer if it's a string
  let buffer: Buffer;
  if (typeof binaryData.data === 'string') {
    buffer = Buffer.from(binaryData.data, 'base64');
  } else {
    buffer = binaryData.data;
  }

  // Create FormData using form-data package
  const formData = new FormData();
  formData.append('file', buffer, {
    filename: finalFileName,
    contentType: binaryData.mimeType || 'application/octet-stream',
  });
  formData.append('messaging_product', 'whatsapp');

  return { formData, fileName: finalFileName };
}

/**
 * Upload media to WhatsApp
 * @param credentials - WhatsApp credentials
 * @param phoneNumberId - Phone number ID
 * @param binaryData - Binary data to upload
 * @param fileName - Optional filename
 * @returns Media upload response with media ID
 */
export async function uploadMedia(
  credentials: { accessToken: string; businessAccountId: string },
  phoneNumberId: string,
  binaryData: {
    data: Buffer | string;
    mimeType?: string;
    fileName?: string;
  },
  fileName?: string
): Promise<MediaUploadResponse> {
  try {
    const { formData } = await getUploadFormData(binaryData, fileName);

    // For FormData, we need to send as multipart/form-data
    const url = `${WHATSAPP_BASE_URL_V18.replace(/\/$/, '')}/${phoneNumberId}/media`;
    
    // Use form-data's getHeaders() to get proper headers with boundary
    const headers = {
      'Authorization': `Bearer ${credentials.accessToken}`,
      ...formData.getHeaders(),
    };
    
    // Convert FormData to buffer for fetch
    const formDataBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      formData.on('data', (chunk: Buffer) => chunks.push(chunk));
      formData.on('end', () => resolve(Buffer.concat(chunks)));
      formData.on('error', reject);
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formDataBuffer as any, // Buffer is compatible with fetch body
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }
      throw new Error(`Media upload failed: ${errorData.error?.message || errorText}`);
    }

    const result = await response.json();
    return { id: result.id };
  } catch (error: any) {
    logger.error('Media upload failed', { error: error.message });
    throw new Error(`Failed to upload media: ${error.message}`);
  }
}

/**
 * Download media from WhatsApp
 * @param credentials - WhatsApp credentials
 * @param mediaId - Media ID to download
 * @returns Media download response with URL and metadata
 */
export async function downloadMedia(
  credentials: { accessToken: string; businessAccountId: string },
  mediaId: string
): Promise<MediaDownloadResponse> {
  try {
    const response = await whatsappApiRequest(
      {
        method: 'GET',
        url: `/${mediaId}`,
        baseURL: WHATSAPP_BASE_URL_V18,
      },
      credentials
    );

    return {
      url: response.url,
      mime_type: response.mime_type,
      sha256: response.sha256,
      file_size: response.file_size,
    };
  } catch (error: any) {
    logger.error('Media download failed', { error: error.message, mediaId });
    throw new Error(`Failed to download media: ${error.message}`);
  }
}

/**
 * Delete media from WhatsApp
 * @param credentials - WhatsApp credentials
 * @param mediaId - Media ID to delete
 * @returns Success status
 */
export async function deleteMedia(
  credentials: { accessToken: string; businessAccountId: string },
  mediaId: string
): Promise<boolean> {
  try {
    await whatsappApiRequest(
      {
        method: 'DELETE',
        url: `/${mediaId}`,
        baseURL: WHATSAPP_BASE_URL_V18,
      },
      credentials
    );

    return true;
  } catch (error: any) {
    logger.error('Media delete failed', { error: error.message, mediaId });
    throw new Error(`Failed to delete media: ${error.message}`);
  }
}

/**
 * Upload media from item and get media ID for message
 * This is used when sending media messages with binary data from previous nodes
 * @param credentials - WhatsApp credentials
 * @param phoneNumberId - Phone number ID
 * @param binaryData - Binary data from input
 * @param fileName - Optional filename
 * @returns Media ID
 */
export async function uploadMediaFromItem(
  credentials: { accessToken: string; businessAccountId: string },
  phoneNumberId: string,
  binaryData: {
    data: Buffer | string;
    mimeType?: string;
    fileName?: string;
  },
  fileName?: string
): Promise<string> {
  const uploadResponse = await uploadMedia(credentials, phoneNumberId, binaryData, fileName);
  return uploadResponse.id;
}

/**
 * Setup upload request options
 * This prepares the request for media upload
 * @param requestOptions - Request options to modify
 * @param binaryData - Binary data to upload
 * @param fileName - Optional filename
 * @returns Modified request options
 */
export async function setupUpload(
  requestOptions: WhatsAppRequestOptions,
  binaryData: {
    data: Buffer | string;
    mimeType?: string;
    fileName?: string;
  },
  fileName?: string
): Promise<WhatsAppRequestOptions> {
  const { formData } = await getUploadFormData(binaryData, fileName);
  
  // Note: FormData handling may need adjustment based on your environment
  // In Node.js, you might need to use the 'form-data' package
  return {
    ...requestOptions,
    body: formData as any,
    headers: {
      ...requestOptions.headers,
      // Remove Content-Type to let fetch set it with boundary
    },
  };
}

