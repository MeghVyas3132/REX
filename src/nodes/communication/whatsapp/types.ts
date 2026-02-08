/**
 * WhatsApp Node Type Definitions
 * TypeScript interfaces and types for WhatsApp node
 */

// API Response Types
export interface WhatsAppApiResponse<T = any> {
  messaging_product?: string;
  contacts?: Array<{
    input: string;
    wa_id: string;
  }>;
  messages?: Array<{
    id: string;
    message_status?: string;
  }>;
  data?: T;
  error?: WhatsAppApiError;
}

export interface WhatsAppApiError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
  error_data?: {
    messaging_product?: string;
    details?: string;
  };
}

// Credential Types
export interface WhatsAppCredentials {
  accessToken: string;
  businessAccountId: string;
  phoneNumberId?: string;
}

// Request Types
export interface WhatsAppRequestOptions {
  method: 'GET' | 'POST' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  baseURL?: string;
}

// Message Types
export interface TextMessagePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text';
  text: {
    body: string;
    preview_url?: boolean;
  };
}

export interface TemplateMessagePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: TemplateComponent[];
  };
}

export interface MediaMessagePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  image?: MediaContent;
  video?: MediaContent;
  audio?: MediaContent;
  document?: MediaContent;
  sticker?: MediaContent;
}

export interface LocationMessagePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'location';
  location: {
    longitude: number;
    latitude: number;
    name?: string;
    address?: string;
  };
}

export interface ContactMessagePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'contacts';
  contacts: Contact[];
}

export interface InteractiveMessagePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'button' | 'list';
    body: {
      text: string;
    };
    action: {
      buttons?: InteractiveButton[];
      button?: string;
      sections?: InteractiveSection[];
    };
    header?: {
      type: 'text' | 'image' | 'video' | 'document';
      text?: string;
      image?: MediaContent;
      video?: MediaContent;
      document?: MediaContent;
    };
    footer?: {
      text: string;
    };
  };
}

// Media Types
export interface MediaContent {
  id?: string;
  link?: string;
  caption?: string;
  filename?: string;
}

export interface MediaUploadResponse {
  id: string;
}

export interface MediaDownloadResponse {
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
}

// Template Types
export interface TemplateComponent {
  type: 'body' | 'header' | 'button';
  sub_type?: 'quick_reply' | 'url';
  index?: string;
  parameters?: TemplateParameter[];
}

export interface TemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'payload';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link: string;
  };
  payload?: string;
}

// Contact Types
export interface Contact {
  name: ContactName;
  addresses?: ContactAddress[];
  emails?: ContactEmail[];
  org?: ContactOrganization;
  phones?: ContactPhone[];
  urls?: ContactUrl[];
  birthday?: string;
}

export interface ContactName {
  formatted_name: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  suffix?: string;
  prefix?: string;
}

export interface ContactAddress {
  type?: 'HOME' | 'WORK';
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  country_code?: string;
}

export interface ContactEmail {
  type?: 'HOME' | 'WORK';
  email: string;
}

export interface ContactPhone {
  type?: 'CELL' | 'HOME' | 'WORK' | 'IPHONE' | 'MAIN' | 'wa_id';
  phone: string;
  wa_id?: string;
}

export interface ContactOrganization {
  company?: string;
  department?: string;
  title?: string;
}

export interface ContactUrl {
  type?: 'HOME' | 'WORK';
  url: string;
}

// Interactive Types
export interface InteractiveButton {
  type: 'reply';
  reply: {
    id: string;
    title: string;
  };
}

export interface InteractiveSection {
  title: string;
  rows: InteractiveRow[];
}

export interface InteractiveRow {
  id: string;
  title: string;
  description?: string;
}

// Phone Number Types
export interface PhoneNumberInfo {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating?: string;
  platform_type?: string;
  throughput?: {
    level: string;
  };
}

// Template Info Types
export interface TemplateInfo {
  name: string;
  language: string;
  status: string;
  category: string;
  id?: string;
}

// Field Parameter Types
export interface FieldParameter {
  name: string;
  displayName?: string;
  type: string;
  required?: boolean;
  description?: string;
  default?: any;
  options?: Array<{ name: string; value: any }>;
  displayOptions?: {
    show?: Record<string, any>;
    hide?: Record<string, any>;
  };
  [key: string]: any;
}

// Execution Context Types (for compatibility with existing system)
export interface WhatsAppNodeConfig {
  accessToken?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  resource?: string;
  operation?: string;
  messageType?: string;
  recipientPhoneNumber?: string;
  textBody?: string;
  template?: string;
  components?: any;
  mediaPath?: string;
  mediaLink?: string;
  mediaId?: string;
  mediaPropertyName?: string;
  mediaFilename?: string;
  mediaCaption?: string;
  [key: string]: any;
}

// Utility Types
export type MessageType = 'text' | 'template' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contacts' | 'sticker' | 'interactive';
export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'sticker';
export type Operation = 'send' | 'sendTemplate' | 'sendAndWait' | 'mediaUpload' | 'mediaUrlGet' | 'mediaDelete';
export type Resource = 'message' | 'media';
export type MediaPathOption = 'useMediaLink' | 'useMediaId' | 'useMedian8n';

